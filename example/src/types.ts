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

export interface FaceDetectorDemoProps {
  onCapture: (photoUri: string) => void | Promise<void>;
  onClose: () => void;
}
