import type { HybridObject } from 'react-native-nitro-modules';
import type { Frame } from 'react-native-vision-camera';

export type FaceDetectorPerformanceMode = 'fast' | 'accurate';
export type FaceDetectorLandmarkMode = 'none' | 'all';
export type FaceDetectorClassificationMode = 'none' | 'all';
export type FaceDetectorContourMode = 'none' | 'all';

export interface FaceDetectorOptions {
  performanceMode: FaceDetectorPerformanceMode;
  landmarkMode: FaceDetectorLandmarkMode;
  classificationMode: FaceDetectorClassificationMode;
  contourMode: FaceDetectorContourMode;
  minFaceSize: number;
  enableTracking: boolean;
}

export interface DetectedFaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedFace {
  bounds: DetectedFaceBounds;
  trackingId: number;
}

export interface FaceDetector extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  configure(options: FaceDetectorOptions): void;
  detectFaces(frame: Frame): DetectedFace[];
}
