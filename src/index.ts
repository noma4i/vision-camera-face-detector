import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { NitroModules } from 'react-native-nitro-modules';
import type { CameraOutput } from 'react-native-vision-camera';
import {
  applyGuideStability,
  defineFaceDetector,
  evaluateFaceDetection
} from './core';
import type {
  DetectedFace,
  FaceDetector,
  FaceDetectionOutput,
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
    outputs: CameraOutput[];
  };
  output: FaceDetectionOutput | undefined;
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

const resolveDetector = (): FaceDetector | undefined => {
  try {
    return NitroModules.createHybridObject<FaceDetector>('FaceDetector');
  } catch {
    return undefined;
  }
};

const detector: FaceDetector | undefined = resolveDetector();

const createFaceDetectionOutput = (): FaceDetectionOutput | undefined => {
  try {
    return NitroModules.createHybridObject<FaceDetectionOutput>('FaceDetectionOutput');
  } catch {
    return undefined;
  }
};

export const isFaceDetectorAvailable = (): boolean => {
  if (!detector) return false;
  return createFaceDetectionOutput() !== undefined;
};

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
  const externalOutputs = useStableOutputs(outputs);
  const previewWidth = preview === 'screen' ? window.width : preview.width;
  const previewHeight = preview === 'screen' ? window.height : preview.height;
  const configKey = JSON.stringify(config);
  const normalizedConfig = useMemo(() => defineFaceDetector(config), [configKey]);
  const output = useMemo(() => createFaceDetectionOutput(), []);
  const isAvailable = output !== undefined;
  const [result, setResult] = useState<FaceDetectionResult>(
    isAvailable ? IDLE_RESULT : UNAVAILABLE_RESULT
  );
  const stabilityStateRef = useRef<FaceGuideStabilityState>({
    currentStatus: isAvailable ? 'idle' : 'unavailable',
    readySamples: 0,
    resetSamples: 0,
    lastTransitionAt: 0
  });

  useEffect(() => {
    if (!output) return;
    output.configure(normalizedConfig.nativeOptions, normalizedConfig.fps);
  }, [normalizedConfig.fps, normalizedConfig.nativeOptions, output]);

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

  useEffect(() => {
    if (!output || !isAvailable) return;
    output.setOnFacesDetectedCallback(applyDetectionResult);
    return () => {
      output.setOnFacesDetectedCallback(undefined);
    };
  }, [applyDetectionResult, isAvailable, output]);

  const status = isAvailable ? result.status : 'unavailable';
  const cameraOutputs = useMemo<CameraOutput[]>(
    () => (isAvailable && output ? [...externalOutputs, output] : externalOutputs),
    [externalOutputs, isAvailable, output]
  );

  return {
    camera: {
      outputs: cameraOutputs
    },
    output: isAvailable ? output : undefined,
    status,
    result,
    available: isAvailable,
    ready: status === 'ready'
  };
};
