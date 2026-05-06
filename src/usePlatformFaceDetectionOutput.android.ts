import { useEffect, useMemo } from 'react';
import { NitroModules } from 'react-native-nitro-modules';
import type { FaceDetectionOutput } from './specs/FaceDetector.nitro';
import type {
  PlatformFaceDetectionOutput,
  UsePlatformFaceDetectionOutputOptions
} from './usePlatformFaceDetectionOutput';

const createFaceDetectionOutput = (): FaceDetectionOutput | undefined => {
  try {
    return NitroModules.createHybridObject<FaceDetectionOutput>('FaceDetectionOutput');
  } catch {
    return undefined;
  }
};

let isFaceDetectionOutputAvailable: boolean | undefined;

export const isPlatformFaceDetectorAvailable = (): boolean => {
  isFaceDetectionOutputAvailable ??= createFaceDetectionOutput() !== undefined;
  return isFaceDetectionOutputAvailable;
};

export const usePlatformFaceDetectionOutput = ({
  fps,
  nativeOptions,
  onResult
}: UsePlatformFaceDetectionOutputOptions): PlatformFaceDetectionOutput => {
  const output = useMemo(() => createFaceDetectionOutput(), []);

  useEffect(() => {
    if (!output) return;
    output.configure(nativeOptions, fps);
  }, [fps, nativeOptions, output]);

  useEffect(() => {
    if (!output) return;
    output.setOnFacesDetectedCallback(onResult);
    return () => {
      output.setOnFacesDetectedCallback(undefined);
    };
  }, [onResult, output]);

  return {
    output,
    available: output !== undefined
  };
};
