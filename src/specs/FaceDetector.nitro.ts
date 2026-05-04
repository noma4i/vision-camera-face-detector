import type { HybridObject } from 'react-native-nitro-modules';
import type { CameraOutput } from 'react-native-vision-camera';

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
  trackingId?: number;
}

export type FaceDetectionOrientation = 'up' | 'right' | 'down' | 'left';

export interface FaceDetectionFrame {
  width: number;
  height: number;
  orientation: FaceDetectionOrientation;
  isMirrored: boolean;
  timestampMs: number;
}

export interface FaceDetectionOutputResult {
  faces: DetectedFace[];
  frame: FaceDetectionFrame;
}

export interface FaceDetector extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  configure(options: FaceDetectorOptions): void;
}

export interface FaceDetectionOutput extends CameraOutput {
  configure(options: FaceDetectorOptions, fps: number): void;
  setOnFacesDetectedCallback(
    onFacesDetected: ((result: FaceDetectionOutputResult) => void) | undefined,
  ): void;
}
