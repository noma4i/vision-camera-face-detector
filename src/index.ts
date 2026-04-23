import { NitroModules } from 'react-native-nitro-modules';
import type { Frame } from 'react-native-vision-camera';
import type {
  DetectedFace,
  DetectedFaceBounds,
  FaceDetector,
  FaceDetectorClassificationMode,
  FaceDetectorContourMode,
  FaceDetectorLandmarkMode,
  FaceDetectorOptions,
  FaceDetectorPerformanceMode
} from './specs/FaceDetector.nitro';

export type {
  DetectedFace,
  DetectedFaceBounds,
  FaceDetector,
  FaceDetectorClassificationMode,
  FaceDetectorContourMode,
  FaceDetectorLandmarkMode,
  FaceDetectorOptions,
  FaceDetectorPerformanceMode
};

export const DEFAULT_FACE_DETECTOR_OPTIONS: FaceDetectorOptions = {
  performanceMode: 'fast',
  landmarkMode: 'none',
  classificationMode: 'none',
  contourMode: 'none',
  minFaceSize: 0.15,
  enableTracking: false
};

const resolveDetector = (): FaceDetector | undefined => {
  try {
    return NitroModules.createHybridObject<FaceDetector>('FaceDetector');
  } catch {
    return undefined;
  }
};

export const faceDetector: FaceDetector | undefined = resolveDetector();

export const isFaceDetectorAvailable = (): boolean => faceDetector !== undefined;

export const configureFaceDetector = (options: Partial<FaceDetectorOptions>): void => {
  if (!faceDetector) return;
  faceDetector.configure({ ...DEFAULT_FACE_DETECTOR_OPTIONS, ...options });
};

export const scanFaces = (frame: Frame): DetectedFace[] => {
  'worklet';
  if (!faceDetector) return [];
  return faceDetector.detectFaces(frame);
};
