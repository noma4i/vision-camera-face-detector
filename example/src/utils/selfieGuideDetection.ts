import { getPhotoGuideDetectionBounds, SCREEN_DIMENSIONS } from './photoGuide';
import type {
  Face,
  FaceRectSource,
  NormalizedFaceRect,
  NormalizedPoint,
  PhotoGuidePlatform,
  SelfieGuideDetectionPayload,
  SelfieGuideEvaluation
} from '../types';

const getProjectionFrameSize = (
  frameWidth: number,
  frameHeight: number,
  screenWidth: number,
  screenHeight: number,
  platform: PhotoGuidePlatform
): { height: number; width: number } => {
  if (platform !== 'android') {
    return { height: frameHeight, width: frameWidth };
  }

  const isFrameLandscape = frameWidth > frameHeight;
  const isScreenLandscape = screenWidth > screenHeight;
  const shouldSwapAxes = isFrameLandscape !== isScreenLandscape;

  return shouldSwapAxes
    ? { height: frameWidth, width: frameHeight }
    : { height: frameHeight, width: frameWidth };
};

const mapFrameRectToScreenRect = (
  frameRect: NormalizedFaceRect,
  frameWidth: number,
  frameHeight: number,
  screenWidth: number,
  screenHeight: number
): NormalizedFaceRect => {
  const scale = Math.max(screenWidth / frameWidth, screenHeight / frameHeight);
  const scaledWidth = frameWidth * scale;
  const scaledHeight = frameHeight * scale;
  const offsetX = (screenWidth - scaledWidth) / 2;
  const offsetY = (screenHeight - scaledHeight) / 2;

  return {
    x: (frameRect.x * frameWidth * scale + offsetX) / screenWidth,
    y: (frameRect.y * frameHeight * scale + offsetY) / screenHeight,
    width: (frameRect.width * frameWidth * scale) / screenWidth,
    height: (frameRect.height * frameHeight * scale) / screenHeight
  };
};

const isValidFaceRect = (rect: NormalizedFaceRect | null): rect is NormalizedFaceRect => {
  if (!rect) return false;
  return (
    Number.isFinite(rect.x) &&
    Number.isFinite(rect.y) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width > 0 &&
    rect.height > 0
  );
};

const getFaceRectCenter = (rect: NormalizedFaceRect): NormalizedPoint => ({
  x: rect.x + rect.width * 0.5,
  y: rect.y + rect.height * 0.5
});

const isPointInsideRect = (point: NormalizedPoint, rect: NormalizedFaceRect): boolean => {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
};

const doRectsOverlap = (
  a: NormalizedFaceRect,
  b: NormalizedFaceRect,
  tolerance: number = 0
): boolean => {
  return (
    a.x < b.x + b.width + tolerance &&
    a.x + a.width + tolerance > b.x &&
    a.y < b.y + b.height + tolerance &&
    a.y + a.height + tolerance > b.y
  );
};

const getNormalizedBoundsRect = (
  face: Face,
  frameWidth: number,
  frameHeight: number,
  screenWidth: number,
  screenHeight: number,
  platform: PhotoGuidePlatform
): { rect: NormalizedFaceRect | null; rectSource: FaceRectSource } => {
  const bounds = face.bounds;
  if (
    typeof bounds?.x !== 'number' ||
    typeof bounds?.y !== 'number' ||
    typeof bounds?.width !== 'number' ||
    typeof bounds?.height !== 'number'
  ) {
    return { rect: null, rectSource: 'none' };
  }

  const projectionFrame = getProjectionFrameSize(
    frameWidth,
    frameHeight,
    screenWidth,
    screenHeight,
    platform
  );
  const frameRect = {
    x: bounds.x / projectionFrame.width,
    y: bounds.y / projectionFrame.height,
    width: bounds.width / projectionFrame.width,
    height: bounds.height / projectionFrame.height
  };
  const rect = mapFrameRectToScreenRect(
    frameRect,
    projectionFrame.width,
    projectionFrame.height,
    screenWidth,
    screenHeight
  );

  return {
    rect: isValidFaceRect(rect) ? rect : null,
    rectSource: isValidFaceRect(rect)
      ? platform === 'ios'
        ? 'ios_bounds'
        : 'android_bounds'
      : 'none'
  };
};

const getNormalizedContourRect = (
  face: Face,
  frameWidth: number,
  frameHeight: number,
  screenWidth: number,
  screenHeight: number,
  platform: PhotoGuidePlatform
): NormalizedFaceRect | null => {
  if (!frameWidth || !frameHeight) return null;

  const faceContour = face.contours?.FACE;
  if (!faceContour?.length) return null;

  const projectionFrame = getProjectionFrameSize(
    frameWidth,
    frameHeight,
    screenWidth,
    screenHeight,
    platform
  );
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of faceContour) {
    if (typeof point?.x !== 'number' || typeof point?.y !== 'number') continue;
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return null;
  }

  const frameRect = {
    x: minX / projectionFrame.width,
    y: minY / projectionFrame.height,
    width: Math.max(0, maxX - minX) / projectionFrame.width,
    height: Math.max(0, maxY - minY) / projectionFrame.height
  };

  return mapFrameRectToScreenRect(
    frameRect,
    projectionFrame.width,
    projectionFrame.height,
    screenWidth,
    screenHeight
  );
};

const resolveNormalizedFaceRect = (
  face: Face,
  frameWidth: number,
  frameHeight: number,
  screenWidth: number,
  screenHeight: number,
  platform: PhotoGuidePlatform
): { rect: NormalizedFaceRect | null; rectSource: FaceRectSource } => {
  if (!frameWidth || !frameHeight || !screenWidth || !screenHeight) {
    return { rect: null, rectSource: 'none' };
  }

  const boundsResult = getNormalizedBoundsRect(
    face,
    frameWidth,
    frameHeight,
    screenWidth,
    screenHeight,
    platform
  );
  if (boundsResult.rect) {
    return boundsResult;
  }

  const contourRect = getNormalizedContourRect(
    face,
    frameWidth,
    frameHeight,
    screenWidth,
    screenHeight,
    platform
  );
  if (isValidFaceRect(contourRect)) {
    return { rect: contourRect, rectSource: 'fallback_contours' };
  }

  return { rect: null, rectSource: 'none' };
};

const createIdleEvaluation = (): SelfieGuideEvaluation => ({
  faceCount: 0,
  isInsideGuide: false,
  primaryFaceCenter: null,
  primaryFaceRect: null,
  rectSource: 'none',
  status: 'idle'
});

export const evaluateSelfieGuide = (
  payload: SelfieGuideDetectionPayload,
  screenWidth: number = SCREEN_DIMENSIONS.width,
  screenHeight: number = SCREEN_DIMENSIONS.height,
  platform: PhotoGuidePlatform
): SelfieGuideEvaluation => {
  if (!payload.faceCount || !payload.primaryFace) {
    return createIdleEvaluation();
  }

  const { rect: primaryFaceRect, rectSource } = resolveNormalizedFaceRect(
    payload.primaryFace,
    payload.frameWidth,
    payload.frameHeight,
    screenWidth,
    screenHeight,
    platform
  );
  const guideBounds = getPhotoGuideDetectionBounds(screenWidth, screenHeight);
  const primaryFaceCenter = isValidFaceRect(primaryFaceRect)
    ? getFaceRectCenter(primaryFaceRect)
    : null;
  const overlaps = isValidFaceRect(primaryFaceRect)
    ? doRectsOverlap(primaryFaceRect, guideBounds, 15 / screenWidth)
    : false;
  const centerInside = primaryFaceCenter
    ? isPointInsideRect(primaryFaceCenter, guideBounds)
    : false;
  const isInsideGuide = centerInside || overlaps;

  return {
    faceCount: 1,
    isInsideGuide,
    primaryFaceCenter,
    primaryFaceRect,
    rectSource,
    status: isInsideGuide ? 'ready' : 'misaligned'
  };
};
