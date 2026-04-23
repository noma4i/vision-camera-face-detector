export type PhotoGuidePlatform = 'ios' | 'android';

export type SelfieGuideStatus = 'idle' | 'misaligned' | 'ready';

export type FaceRectSource = 'none' | 'ios_bounds' | 'android_bounds' | 'fallback_contours';

export interface NormalizedFaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface Face {
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  contours?: {
    FACE?: NormalizedPoint[];
  };
  trackingId?: number;
}

export interface SelfieGuideDetectionPayload {
  faceCount: number;
  frameHeight: number;
  frameWidth: number;
  primaryFace: Face | null;
}

export interface SelfieGuideEvaluation {
  faceCount: number;
  isInsideGuide: boolean;
  primaryFaceCenter: NormalizedPoint | null;
  primaryFaceRect: NormalizedFaceRect | null;
  rectSource: FaceRectSource;
  status: SelfieGuideStatus;
}

export interface PhotoGuideLayout {
  frameSize: number;
  frameRadius: number;
  frameLeft: number;
  frameTop: number;
  outerFrameTop: number;
  outerFrameHeight: number;
  centerSquareFrameSize: number;
  centerSquareFrameLeft: number;
  centerSquareFrameTop: number;
}

export interface UseSelfieFaceGuideOptions {
  screenWidth: number;
  screenHeight: number;
}

export interface UseSelfieFaceGuideResult {
  guideStatus: SelfieGuideStatus;
  frameOutput: ReturnType<
    typeof import('react-native-vision-camera').useFrameOutput
  > | undefined;
  isFrameProcessorAvailable: boolean;
}

export interface FaceDetectorDemoProps {
  onCapture: (photoUri: string) => void | Promise<void>;
  onClose: () => void;
}
