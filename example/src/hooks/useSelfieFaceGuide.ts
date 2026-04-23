import {
  configureFaceDetector,
  isFaceDetectorAvailable,
  scanFaces
} from '@noma4i/vision-camera-face-detector';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrameOutput } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-worklets';
import { isIOS } from '../utils/platform';
import { logger } from '../utils/logger';
import { evaluateSelfieGuide } from '../utils/selfieGuideDetection';
import type {
  Face,
  PhotoGuidePlatform,
  SelfieGuideDetectionPayload,
  SelfieGuideEvaluation,
  SelfieGuideStatus,
  UseSelfieFaceGuideOptions,
  UseSelfieFaceGuideResult
} from '../types';

const SELFIE_DETECTOR_OPTIONS = {
  performanceMode: 'accurate',
  minFaceSize: 0.25,
  enableTracking: true
} as const;

const COMPONENT_NAME = 'useSelfieFaceGuide';
const TARGET_FPS = 8;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;
const REQUIRED_READY_SAMPLES = 2;
const REQUIRED_RESET_SAMPLES = 4;
const MIN_STATUS_TRANSITION_MS = 400;
const INVALID_RECT_LOG_INTERVAL_MS = 3000;
const PHOTO_GUIDE_PLATFORM: PhotoGuidePlatform = isIOS ? 'ios' : 'android';

const IDLE_GUIDE_STATUS: SelfieGuideStatus = 'idle';

const getStableGuideStatus = (
  nextStatus: SelfieGuideStatus,
  currentStatus: SelfieGuideStatus,
  readySamplesRef: { current: number },
  resetSamplesRef: { current: number }
): SelfieGuideStatus | null => {
  if (nextStatus === 'ready') {
    readySamplesRef.current += 1;
    resetSamplesRef.current = 0;

    if (readySamplesRef.current < REQUIRED_READY_SAMPLES && currentStatus !== 'ready') {
      return null;
    }

    return 'ready';
  }

  readySamplesRef.current = 0;
  resetSamplesRef.current += 1;

  if (resetSamplesRef.current < REQUIRED_RESET_SAMPLES && currentStatus === 'ready') {
    return null;
  }

  return nextStatus;
};

const shouldLogInvalidRect = (
  evaluation: SelfieGuideEvaluation,
  lastInvalidRectLogAtRef: { current: number }
): boolean => {
  if (evaluation.faceCount !== 1 || evaluation.primaryFaceRect) {
    return false;
  }

  const now = Date.now();
  if (now - lastInvalidRectLogAtRef.current < INVALID_RECT_LOG_INTERVAL_MS) {
    return false;
  }

  lastInvalidRectLogAtRef.current = now;
  return true;
};

export const useSelfieFaceGuide = ({
  screenWidth,
  screenHeight
}: UseSelfieFaceGuideOptions): UseSelfieFaceGuideResult => {
  const detectorAvailable = isFaceDetectorAvailable();

  useEffect(() => {
    if (!detectorAvailable) return;
    configureFaceDetector(SELFIE_DETECTOR_OPTIONS);
  }, [detectorAvailable]);

  const [guideStatus, setGuideStatus] = useState<SelfieGuideStatus>(IDLE_GUIDE_STATUS);
  const readySamplesRef = useRef(0);
  const resetSamplesRef = useRef(0);
  const guideStatusRef = useRef<SelfieGuideStatus>(IDLE_GUIDE_STATUS);
  const lastStatusTransitionAtRef = useRef(0);
  const lastInvalidRectLogAtRef = useRef(0);
  const lastLoggedStatusRef = useRef<SelfieGuideStatus>(IDLE_GUIDE_STATUS);
  const lastFrameAtRef = useRef(0);

  const applyGuideSnapshot = useCallback(
    (payload: SelfieGuideDetectionPayload) => {
      const evaluation = evaluateSelfieGuide(
        payload,
        screenWidth,
        screenHeight,
        PHOTO_GUIDE_PLATFORM
      );
      const currentGuideStatus = guideStatusRef.current;
      const stableGuideStatus = getStableGuideStatus(
        evaluation.status,
        currentGuideStatus,
        readySamplesRef,
        resetSamplesRef
      );

      if (stableGuideStatus && stableGuideStatus !== currentGuideStatus) {
        const now = Date.now();
        if (now - lastStatusTransitionAtRef.current >= MIN_STATUS_TRANSITION_MS) {
          lastStatusTransitionAtRef.current = now;
          guideStatusRef.current = stableGuideStatus;
          setGuideStatus(stableGuideStatus);
        }
      }

      if (lastLoggedStatusRef.current !== evaluation.status) {
        lastLoggedStatusRef.current = evaluation.status;
        logger.info(COMPONENT_NAME, 'Face guide status changed', {
          faceCount: evaluation.faceCount,
          isInsideGuide: evaluation.isInsideGuide,
          rectSource: evaluation.rectSource,
          status: evaluation.status
        });
      }

      if (shouldLogInvalidRect(evaluation, lastInvalidRectLogAtRef)) {
        logger.warn(COMPONENT_NAME, 'Detected one face but failed to resolve a valid face rect', {
          rectSource: evaluation.rectSource
        });
      }
    },
    [screenHeight, screenWidth]
  );

  const frameOutput = useFrameOutput({
    pixelFormat: 'yuv',
    onFrame: (frame) => {
      'worklet';

      const now = Date.now();
      if (now - lastFrameAtRef.current < FRAME_INTERVAL_MS) {
        frame.dispose();
        return;
      }
      lastFrameAtRef.current = now;

      try {
        const faces = scanFaces(frame);
        let primary: Face | null = null;
        let primaryArea = 0;
        for (const candidate of faces) {
          const area = (candidate.bounds?.width ?? 0) * (candidate.bounds?.height ?? 0);
          if (area > primaryArea) {
            primaryArea = area;
            primary = candidate as Face;
          }
        }
        const payload: SelfieGuideDetectionPayload = {
          faceCount: primary ? 1 : 0,
          frameHeight: frame.height,
          frameWidth: frame.width,
          primaryFace: primary
        };
        runOnJS(applyGuideSnapshot)(payload);
      } finally {
        frame.dispose();
      }
    }
  });

  return {
    guideStatus,
    frameOutput: detectorAvailable ? frameOutput : undefined,
    isFrameProcessorAvailable: detectorAvailable
  };
};
