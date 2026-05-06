import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyGuideStability,
  defineFaceDetector,
  evaluateFaceDetection,
  pickPrimaryFace
} from '../lib/core.js';

test('defineFaceDetector applies selfie defaults and clamps unsafe numbers', () => {
  const config = defineFaceDetector({
    preset: 'selfie',
    fps: 120,
    android: {
      minFaceSize: 2
    }
  });

  assert.equal(config.preset, 'selfie');
  assert.equal(config.fps, 60);
  assert.equal(config.nativeOptions.performanceMode, 'accurate');
  assert.equal(config.nativeOptions.minFaceSize, 1);
  assert.equal(config.nativeOptions.enableTracking, true);
  assert.equal(config.guide?.shape, 'circle');
});

test('defineFaceDetector defaults to the selfie DSL', () => {
  const config = defineFaceDetector();

  assert.equal(config.preset, 'selfie');
  assert.equal(config.fps, 12);
  assert.equal(config.nativeOptions.performanceMode, 'accurate');
  assert.equal(config.nativeOptions.enableTracking, true);
  assert.equal(config.guide?.shape, 'circle');
  assert.equal(config.guide?.tolerancePx, 40);
  assert.deepEqual(config.stability, {
    readySamples: 1,
    resetSamples: 3,
    minTransitionMs: 180
  });
});

test('defineFaceDetector supports guide shortcuts', () => {
  const withoutGuide = defineFaceDetector({ guide: 'none' });
  const selfieGuide = defineFaceDetector({ preset: 'fast', guide: 'selfie' });

  assert.equal(withoutGuide.guide, undefined);
  assert.equal(selfieGuide.preset, 'fast');
  assert.equal(selfieGuide.guide?.shape, 'circle');
});

test('evaluateFaceDetection treats guide none as face presence readiness', () => {
  const config = defineFaceDetector({ guide: 'none' });
  const noFace = evaluateFaceDetection(
    {
      faces: [],
      frame: { width: 100, height: 100 },
      preview: { width: 100, height: 100 }
    },
    config
  );
  const withFace = evaluateFaceDetection(
    {
      faces: [{ bounds: { x: 10, y: 10, width: 20, height: 20 } }],
      frame: { width: 100, height: 100 },
      preview: { width: 100, height: 100 }
    },
    config
  );

  assert.equal(noFace.status, 'idle');
  assert.equal(withFace.status, 'ready');
  assert.equal(withFace.isInsideGuide, false);
});

test('pickPrimaryFace returns the largest face by bounds area', () => {
  const small = { bounds: { x: 0, y: 0, width: 20, height: 20 } };
  const large = { bounds: { x: 0, y: 0, width: 50, height: 40 } };

  assert.equal(pickPrimaryFace([small, large]), large);
});

test('evaluateFaceDetection maps frame bounds into preview guide state', () => {
  const config = defineFaceDetector({
    guide: {
      shape: 'rect',
      units: 'px',
      x: 200,
      y: 200,
      width: 200,
      height: 200
    }
  });
  const result = evaluateFaceDetection(
    {
      faces: [{ bounds: { x: 100, y: 100, width: 100, height: 100 } }],
      frame: { width: 500, height: 500 },
      preview: { width: 1000, height: 1000 }
    },
    config
  );

  assert.equal(result.status, 'ready');
  assert.equal(result.isInsideGuide, true);
  assert.deepEqual(result.primaryFaceCenter, { x: 300, y: 300 });
});

test('evaluateFaceDetection accepts iOS view-space bounds without extra scaling', () => {
  const config = defineFaceDetector({
    guide: {
      shape: 'circle',
      units: 'px',
      centerX: 500,
      centerY: 500,
      size: 400,
      tolerancePx: 0
    }
  });
  const result = evaluateFaceDetection(
    {
      faces: [{ bounds: { x: 380, y: 380, width: 240, height: 240 }, trackingId: 7 }],
      frame: { width: 1000, height: 1000 },
      preview: { width: 1000, height: 1000 }
    },
    config
  );

  assert.equal(result.status, 'ready');
  assert.equal(result.isInsideGuide, true);
  assert.deepEqual(result.primaryFaceRect, { x: 380, y: 380, width: 240, height: 240 });
  assert.equal(result.primaryFace?.trackingId, 7);
});

test('evaluateFaceDetection rejects partial face overlap with guide', () => {
  const config = defineFaceDetector({
    guide: {
      shape: 'rect',
      units: 'px',
      x: 200,
      y: 200,
      width: 200,
      height: 200,
      tolerancePx: 0
    }
  });
  const result = evaluateFaceDetection(
    {
      faces: [{ bounds: { x: 150, y: 150, width: 100, height: 100 } }],
      frame: { width: 500, height: 500 },
      preview: { width: 1000, height: 1000 }
    },
    config
  );

  assert.equal(result.status, 'misaligned');
  assert.equal(result.isInsideGuide, false);
  assert.deepEqual(result.primaryFaceCenter, { x: 400, y: 400 });
});

test('evaluateFaceDetection checks circle guides as circles, not bounding squares', () => {
  const config = defineFaceDetector({
    guide: {
      shape: 'circle',
      units: 'px',
      centerX: 100,
      centerY: 100,
      size: 100,
      tolerancePx: 0
    }
  });
  const cornerOfBoundingSquare = evaluateFaceDetection(
    {
      faces: [{ bounds: { x: 50, y: 50, width: 20, height: 20 } }],
      frame: { width: 200, height: 200 },
      preview: { width: 200, height: 200 }
    },
    config
  );
  const insideCircle = evaluateFaceDetection(
    {
      faces: [{ bounds: { x: 90, y: 90, width: 20, height: 20 } }],
      frame: { width: 200, height: 200 },
      preview: { width: 200, height: 200 }
    },
    config
  );

  assert.equal(cornerOfBoundingSquare.status, 'misaligned');
  assert.equal(cornerOfBoundingSquare.isInsideGuide, false);
  assert.equal(insideCircle.status, 'ready');
  assert.equal(insideCircle.isInsideGuide, true);
});

test('applyGuideStability requires ready samples and reset samples', () => {
  const stability = { readySamples: 2, resetSamples: 3, minTransitionMs: 0 };
  const state = {
    currentStatus: 'idle',
    readySamples: 0,
    resetSamples: 0,
    lastTransitionAt: 0
  };

  assert.equal(applyGuideStability('ready', state, stability, 1), 'idle');
  assert.equal(applyGuideStability('ready', state, stability, 2), 'ready');
  assert.equal(applyGuideStability('idle', state, stability, 3), 'ready');
  assert.equal(applyGuideStability('idle', state, stability, 4), 'ready');
  assert.equal(applyGuideStability('idle', state, stability, 5), 'idle');
});
