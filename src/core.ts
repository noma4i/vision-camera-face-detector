import type {
  DetectedFace,
  DetectedFaceBounds,
  FaceDetectionFrame as NativeFaceDetectionFrame,
  FaceDetectorClassificationMode,
  FaceDetectorContourMode,
  FaceDetectorLandmarkMode,
  FaceDetectorOptions,
  FaceDetectorPerformanceMode
} from './specs/FaceDetector.nitro';

export type FaceBounds = DetectedFaceBounds;

export type FaceDetectorPreset = 'selfie' | 'fast' | 'accurate';

export type FaceGuideStatus = 'unavailable' | 'idle' | 'misaligned' | 'ready';

export type FaceGuideUnits = 'ratio' | 'px';

export interface FacePoint {
  x: number;
  y: number;
}

export interface FaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceGuideRectConfig {
  shape: 'rect';
  units?: FaceGuideUnits;
  x: number;
  y: number;
  width: number;
  height: number;
  tolerancePx?: number;
}

export interface FaceGuideCircleConfig {
  shape: 'circle';
  units?: FaceGuideUnits;
  centerX: number;
  centerY: number;
  size: number;
  tolerancePx?: number;
}

export type FaceGuideConfig = FaceGuideRectConfig | FaceGuideCircleConfig;

export interface AndroidFaceDetectorConfig {
  performanceMode?: FaceDetectorPerformanceMode;
  landmarkMode?: FaceDetectorLandmarkMode;
  classificationMode?: FaceDetectorClassificationMode;
  contourMode?: FaceDetectorContourMode;
  minFaceSize?: number;
  enableTracking?: boolean;
}

export interface FaceDetectorConfig {
  preset?: FaceDetectorPreset;
  fps?: number;
  guide?: FaceGuideConfig;
  android?: AndroidFaceDetectorConfig;
  stability?: {
    readySamples?: number;
    resetSamples?: number;
    minTransitionMs?: number;
  };
}

export interface NormalizedFaceDetectorConfig {
  preset: FaceDetectorPreset;
  fps: number;
  frameIntervalMs: number;
  guide?: FaceGuideConfig;
  nativeOptions: FaceDetectorOptions;
  stability: {
    readySamples: number;
    resetSamples: number;
    minTransitionMs: number;
  };
}

export interface FaceDetectionFrame {
  width: number;
  height: number;
  orientation?: NativeFaceDetectionFrame['orientation'];
  isMirrored?: boolean;
  timestampMs?: number;
}

export interface FaceDetectionInput {
  faces: DetectedFace[];
  frame: FaceDetectionFrame;
  preview: FaceDetectionFrame;
}

export interface FaceDetectionResult {
  faces: DetectedFace[];
  primaryFace?: DetectedFace;
  primaryFaceRect?: FaceRect;
  primaryFaceCenter?: FacePoint;
  guideRect?: FaceRect;
  isInsideGuide: boolean;
  status: FaceGuideStatus;
}

export interface FaceGuideStabilityState {
  currentStatus: FaceGuideStatus;
  readySamples: number;
  resetSamples: number;
  lastTransitionAt: number;
}

export const DEFAULT_FACE_GUIDE: FaceGuideConfig = {
  shape: 'circle',
  units: 'ratio',
  centerX: 0.5,
  centerY: 0.42,
  size: 0.72,
  tolerancePx: 24
};

const DEFAULT_NATIVE_OPTIONS: FaceDetectorOptions = {
  performanceMode: 'fast',
  landmarkMode: 'none',
  classificationMode: 'none',
  contourMode: 'none',
  minFaceSize: 0.15,
  enableTracking: false
};

const PRESET_NATIVE_OPTIONS: Record<FaceDetectorPreset, FaceDetectorOptions> = {
  fast: DEFAULT_NATIVE_OPTIONS,
  accurate: {
    ...DEFAULT_NATIVE_OPTIONS,
    performanceMode: 'accurate'
  },
  selfie: {
    ...DEFAULT_NATIVE_OPTIONS,
    performanceMode: 'accurate',
    minFaceSize: 0.25,
    enableTracking: true
  }
};

const PRESET_FPS: Record<FaceDetectorPreset, number> = {
  fast: 12,
  accurate: 8,
  selfie: 8
};

const PRESET_STABILITY: NormalizedFaceDetectorConfig['stability'] = {
  readySamples: 2,
  resetSamples: 4,
  minTransitionMs: 400
};

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};

const normalizePositiveNumber = (value: number | undefined, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
};

export const defineFaceDetector = (
  config: FaceDetectorConfig = {}
): NormalizedFaceDetectorConfig => {
  const preset = config.preset ?? 'fast';
  const fps = clamp(normalizePositiveNumber(config.fps, PRESET_FPS[preset]), 1, 60);
  const presetOptions = PRESET_NATIVE_OPTIONS[preset];
  const android = config.android ?? {};

  return {
    preset,
    fps,
    frameIntervalMs: 1000 / fps,
    guide: config.guide ?? (preset === 'selfie' ? DEFAULT_FACE_GUIDE : undefined),
    nativeOptions: {
      performanceMode: android.performanceMode ?? presetOptions.performanceMode,
      landmarkMode: android.landmarkMode ?? presetOptions.landmarkMode,
      classificationMode: android.classificationMode ?? presetOptions.classificationMode,
      contourMode: android.contourMode ?? presetOptions.contourMode,
      minFaceSize: clamp(android.minFaceSize ?? presetOptions.minFaceSize, 0, 1),
      enableTracking: android.enableTracking ?? presetOptions.enableTracking
    },
    stability: {
      readySamples: Math.round(
        normalizePositiveNumber(config.stability?.readySamples, PRESET_STABILITY.readySamples)
      ),
      resetSamples: Math.round(
        normalizePositiveNumber(config.stability?.resetSamples, PRESET_STABILITY.resetSamples)
      ),
      minTransitionMs: normalizePositiveNumber(
        config.stability?.minTransitionMs,
        PRESET_STABILITY.minTransitionMs
      )
    }
  };
};

export const pickPrimaryFace = (faces: readonly DetectedFace[]): DetectedFace | undefined => {
  let primary: DetectedFace | undefined;
  let primaryArea = 0;

  for (const face of faces) {
    const area = face.bounds.width * face.bounds.height;
    if (area > primaryArea) {
      primaryArea = area;
      primary = face;
    }
  }

  return primary;
};

export const mapFrameRectToPreview = (
  bounds: FaceBounds,
  frame: FaceDetectionFrame,
  preview: FaceDetectionFrame
): FaceRect | undefined => {
  if (!frame.width || !frame.height || !preview.width || !preview.height) return undefined;

  const frameBounds = frame.isMirrored
    ? {
        x: frame.width - bounds.x - bounds.width,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      }
    : bounds;
  const scale = Math.max(preview.width / frame.width, preview.height / frame.height);
  const scaledWidth = frame.width * scale;
  const scaledHeight = frame.height * scale;
  const offsetX = (preview.width - scaledWidth) / 2;
  const offsetY = (preview.height - scaledHeight) / 2;
  const rect = {
    x: frameBounds.x * scale + offsetX,
    y: frameBounds.y * scale + offsetY,
    width: frameBounds.width * scale,
    height: frameBounds.height * scale
  };

  if (
    !Number.isFinite(rect.x) ||
    !Number.isFinite(rect.y) ||
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height) ||
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return undefined;
  }

  return rect;
};

export const resolveGuideRect = (
  guide: FaceGuideConfig | undefined,
  preview: FaceDetectionFrame
): FaceRect | undefined => {
  if (!guide || !preview.width || !preview.height) return undefined;

  const units = guide.units ?? 'ratio';
  if (guide.shape === 'rect') {
    return units === 'ratio'
      ? {
          x: guide.x * preview.width,
          y: guide.y * preview.height,
          width: guide.width * preview.width,
          height: guide.height * preview.height
        }
      : {
          x: guide.x,
          y: guide.y,
          width: guide.width,
          height: guide.height
        };
  }

  const size = units === 'ratio' ? guide.size * preview.width : guide.size;
  const centerX = units === 'ratio' ? guide.centerX * preview.width : guide.centerX;
  const centerY = units === 'ratio' ? guide.centerY * preview.height : guide.centerY;

  return {
    x: centerX - size * 0.5,
    y: centerY - size * 0.5,
    width: size,
    height: size
  };
};

const centerOf = (rect: FaceRect): FacePoint => ({
  x: rect.x + rect.width * 0.5,
  y: rect.y + rect.height * 0.5
});

const containsPoint = (rect: FaceRect, point: FacePoint, tolerancePx: number): boolean => (
  point.x >= rect.x - tolerancePx &&
  point.x <= rect.x + rect.width + tolerancePx &&
  point.y >= rect.y - tolerancePx &&
  point.y <= rect.y + rect.height + tolerancePx
);

const containsRect = (outer: FaceRect, inner: FaceRect, tolerancePx: number): boolean => (
  inner.x >= outer.x - tolerancePx &&
  inner.y >= outer.y - tolerancePx &&
  inner.x + inner.width <= outer.x + outer.width + tolerancePx &&
  inner.y + inner.height <= outer.y + outer.height + tolerancePx
);

export const evaluateFaceDetection = (
  input: FaceDetectionInput,
  config: NormalizedFaceDetectorConfig
): FaceDetectionResult => {
  const primaryFace = pickPrimaryFace(input.faces);
  const guideRect = resolveGuideRect(config.guide, input.preview);

  if (!primaryFace) {
    return {
      faces: input.faces,
      guideRect,
      isInsideGuide: false,
      status: 'idle'
    };
  }

  const primaryFaceRect = mapFrameRectToPreview(primaryFace.bounds, input.frame, input.preview);
  const primaryFaceCenter = primaryFaceRect ? centerOf(primaryFaceRect) : undefined;
  const tolerancePx = config.guide?.tolerancePx ?? 0;
  const isInsideGuide = Boolean(
    primaryFaceRect &&
      guideRect &&
      primaryFaceCenter &&
      containsPoint(guideRect, primaryFaceCenter, tolerancePx) &&
      containsRect(guideRect, primaryFaceRect, tolerancePx)
  );

  return {
    faces: input.faces,
    primaryFace,
    primaryFaceRect,
    primaryFaceCenter,
    guideRect,
    isInsideGuide,
    status: guideRect ? (isInsideGuide ? 'ready' : 'misaligned') : 'ready'
  };
};

export const applyGuideStability = (
  nextStatus: FaceGuideStatus,
  state: FaceGuideStabilityState,
  stability: NormalizedFaceDetectorConfig['stability'],
  now: number
): FaceGuideStatus => {
  if (nextStatus === 'unavailable') {
    state.currentStatus = 'unavailable';
    state.readySamples = 0;
    state.resetSamples = 0;
    return state.currentStatus;
  }

  if (nextStatus === 'ready') {
    state.readySamples += 1;
    state.resetSamples = 0;
    if (state.currentStatus !== 'ready' && state.readySamples < stability.readySamples) {
      return state.currentStatus;
    }
  } else {
    state.readySamples = 0;
    state.resetSamples += 1;
    if (state.currentStatus === 'ready' && state.resetSamples < stability.resetSamples) {
      return state.currentStatus;
    }
  }

  if (
    nextStatus !== state.currentStatus &&
    now - state.lastTransitionAt >= stability.minTransitionMs
  ) {
    state.currentStatus = nextStatus;
    state.lastTransitionAt = now;
  }

  return state.currentStatus;
};
