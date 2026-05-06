import { useCallback, useRef } from 'react';
import {
  useObjectOutput,
  type ScannedFace,
  type ScannedObject,
  type ScannedObjectType
} from 'react-native-vision-camera';
import type { DetectedFace, FaceDetectionOutputResult } from './specs/FaceDetector.nitro';
import type {
  PlatformFaceDetectionOutput,
  UsePlatformFaceDetectionOutputOptions
} from './usePlatformFaceDetectionOutput';

const FACE_OBJECT_TYPES: ScannedObjectType[] = ['face'];

const isScannedFace = (object: ScannedObject): object is ScannedFace => object.type === 'face';

export const isPlatformFaceDetectorAvailable = (): boolean => true;

export const usePlatformFaceDetectionOutput = ({
  cameraRef,
  fps,
  preview,
  onResult
}: UsePlatformFaceDetectionOutputOptions): PlatformFaceDetectionOutput => {
  const lastResultAtRef = useRef(0);

  const onObjectsScanned = useCallback(
    (objects: ScannedObject[]) => {
      const now = Date.now();
      const minIntervalMs = 1000 / fps;
      if (now - lastResultAtRef.current < minIntervalMs) return;
      lastResultAtRef.current = now;

      const camera = cameraRef.current;
      if (!camera) return;

      const faces: DetectedFace[] = [];
      for (const object of objects) {
        if (!isScannedFace(object)) continue;

        try {
          const converted = camera.convertScannedObjectCoordinatesToViewCoordinates(object);
          const { x, y, width, height } = converted.boundingBox;
          if (width <= 0 || height <= 0) continue;

          faces.push({
            bounds: { x, y, width, height },
            trackingId: object.faceID
          });
        } catch {
          return;
        }
      }

      const result: FaceDetectionOutputResult = {
        faces,
        frame: {
          width: preview.width,
          height: preview.height,
          orientation: 'up',
          isMirrored: false,
          timestampMs: now
        }
      };
      onResult(result);
    },
    [cameraRef, fps, onResult, preview.height, preview.width]
  );
  const output = useObjectOutput({
    types: FACE_OBJECT_TYPES,
    onObjectsScanned
  });

  return {
    output,
    available: true
  };
};
