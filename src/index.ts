import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useWindowDimensions } from 'react-native';
import type { CameraOutput, CameraRef } from 'react-native-vision-camera';
import {
  applyGuideStability,
  defineFaceDetector,
  evaluateFaceDetection
} from './core';
import {
  isPlatformFaceDetectorAvailable,
  usePlatformFaceDetectionOutput
} from './usePlatformFaceDetectionOutput';
import type {
  DetectedFace,
  FaceDetectionOutputResult,
  FaceDetectorClassificationMode,
  FaceDetectorContourMode,
  FaceDetectorLandmarkMode,
  FaceDetectorOptions,
  FaceDetectorPerformanceMode
} from './specs/FaceDetector.nitro';
import type {
  AndroidFaceDetectorConfig,
  FaceBounds,
  FaceDetectionResult,
  FaceDetectorConfig,
  FaceDetectorPreset,
  FaceGuideConfig,
  FaceGuideInput,
  FaceGuideStabilityState,
  FaceGuideStatus,
  FaceGuideUnits,
  FacePoint,
  FaceRect,
  NormalizedFaceDetectorConfig
} from './core';

export {
  DEFAULT_FACE_GUIDE,
  applyGuideStability,
  defineFaceDetector,
  evaluateFaceDetection,
  mapFrameRectToPreview,
  pickPrimaryFace,
  resolveGuideRect
} from './core';

export type {
  AndroidFaceDetectorConfig,
  DetectedFace,
  FaceBounds,
  FaceDetectionResult,
  FaceDetectorClassificationMode,
  FaceDetectorConfig,
  FaceDetectorContourMode,
  FaceDetectorLandmarkMode,
  FaceDetectorOptions,
  FaceDetectorPerformanceMode,
  FaceDetectorPreset,
  FaceGuideConfig,
  FaceGuideInput,
  FaceGuideStabilityState,
  FaceGuideStatus,
  FaceGuideUnits,
  FacePoint,
  FaceRect,
  NormalizedFaceDetectorConfig
};

export type FaceDetectorPreview = 'screen' | {
  width: number;
  height: number;
};

export interface UseFaceDetectorOptions extends FaceDetectorConfig {
  preview?: FaceDetectorPreview;
  outputs?: CameraOutput | CameraOutput[];
}

export interface UseFaceDetectorResult {
  camera: {
    ref: RefObject<CameraRef | null>;
    outputs: CameraOutput[];
  };
  status: FaceGuideStatus;
  result: FaceDetectionResult;
  available: boolean;
  ready: boolean;
}

const UNAVAILABLE_RESULT: FaceDetectionResult = {
  faces: [],
  isInsideGuide: false,
  status: 'unavailable'
};

const IDLE_RESULT: FaceDetectionResult = {
  faces: [],
  isInsideGuide: false,
  status: 'idle'
};

export const isFaceDetectorAvailable = isPlatformFaceDetectorAvailable;

const normalizeOutputs = (outputs: CameraOutput | CameraOutput[] | undefined): CameraOutput[] => {
  if (!outputs) return [];
  return Array.isArray(outputs) ? outputs : [outputs];
};

const areOutputsEqual = (a: readonly CameraOutput[], b: readonly CameraOutput[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((output, index) => output === b[index]);
};

const useStableOutputs = (
  outputs: CameraOutput | CameraOutput[] | undefined
): CameraOutput[] => {
  const nextOutputs = normalizeOutputs(outputs);
  const stableOutputsRef = useRef<CameraOutput[]>(nextOutputs);

  if (!areOutputsEqual(stableOutputsRef.current, nextOutputs)) {
    stableOutputsRef.current = nextOutputs;
  }

  return stableOutputsRef.current;
};

export const useFaceDetector = (options: UseFaceDetectorOptions = {}): UseFaceDetectorResult => {
  const { preview = 'screen', outputs, ...config } = options;
  const window = useWindowDimensions();
  const cameraRef = useRef<CameraRef | null>(null);
  const externalOutputs = useStableOutputs(outputs);
  const previewWidth = preview === 'screen' ? window.width : preview.width;
  const previewHeight = preview === 'screen' ? window.height : preview.height;
  const configKey = JSON.stringify(config);
  const normalizedConfig = useMemo(() => defineFaceDetector(config), [configKey]);
  const [result, setResult] = useState<FaceDetectionResult>(IDLE_RESULT);
  const stabilityStateRef = useRef<FaceGuideStabilityState>({
    currentStatus: 'idle',
    readySamples: 0,
    resetSamples: 0,
    lastTransitionAt: 0
  });

  const applyDetectionResult = useCallback(
    (nativeResult: FaceDetectionOutputResult) => {
      const nextResult = evaluateFaceDetection(
        {
          faces: nativeResult.faces,
          frame: nativeResult.frame,
          preview: { width: previewWidth, height: previewHeight }
        },
        normalizedConfig
      );
      const stableStatus = applyGuideStability(
        nextResult.status,
        stabilityStateRef.current,
        normalizedConfig.stability,
        Date.now()
      );

      setResult({
        ...nextResult,
        status: stableStatus
      });
    },
    [normalizedConfig, previewHeight, previewWidth]
  );

  const platformOutput = usePlatformFaceDetectionOutput({
    cameraRef,
    fps: normalizedConfig.fps,
    nativeOptions: normalizedConfig.nativeOptions,
    preview: { width: previewWidth, height: previewHeight },
    onResult: applyDetectionResult
  });
  const isAvailable = platformOutput.available;

  useEffect(() => {
    if (isAvailable) {
      if (stabilityStateRef.current.currentStatus === 'unavailable') {
        stabilityStateRef.current = {
          currentStatus: 'idle',
          readySamples: 0,
          resetSamples: 0,
          lastTransitionAt: 0
        };
        setResult(IDLE_RESULT);
      }
      return;
    }

    stabilityStateRef.current = {
      currentStatus: 'unavailable',
      readySamples: 0,
      resetSamples: 0,
      lastTransitionAt: 0
    };
    setResult(UNAVAILABLE_RESULT);
  }, [isAvailable]);

  const status = isAvailable ? result.status : 'unavailable';
  const visibleResult = isAvailable ? result : UNAVAILABLE_RESULT;
  const cameraOutputs = useMemo<CameraOutput[]>(
    () => (
      isAvailable && platformOutput.output
        ? [...externalOutputs, platformOutput.output]
        : externalOutputs
    ),
    [externalOutputs, isAvailable, platformOutput.output]
  );

  return {
    camera: {
      ref: cameraRef,
      outputs: cameraOutputs
    },
    status,
    result: visibleResult,
    available: isAvailable,
    ready: status === 'ready'
  };
};
