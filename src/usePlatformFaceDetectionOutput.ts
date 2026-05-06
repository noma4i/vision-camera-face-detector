import type { RefObject } from 'react';
import type { CameraOutput, CameraRef } from 'react-native-vision-camera';
import type {
  FaceDetectionOutputResult,
  FaceDetectorOptions
} from './specs/FaceDetector.nitro';

export interface FaceDetectorPreviewSize {
  width: number;
  height: number;
}

export interface UsePlatformFaceDetectionOutputOptions {
  cameraRef: RefObject<CameraRef | null>;
  fps: number;
  nativeOptions: FaceDetectorOptions;
  preview: FaceDetectorPreviewSize;
  onResult: (result: FaceDetectionOutputResult) => void;
}

export interface PlatformFaceDetectionOutput {
  output: CameraOutput | undefined;
  available: boolean;
}

export const isPlatformFaceDetectorAvailable = (): boolean => false;

export const usePlatformFaceDetectionOutput = (
  _options: UsePlatformFaceDetectionOutputOptions
): PlatformFaceDetectionOutput => ({
  output: undefined,
  available: false
});
