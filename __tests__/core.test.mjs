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
  assert.equal(config.fps, 8);
  assert.equal(config.nativeOptions.performanceMode, 'accurate');
  assert.equal(config.nativeOptions.enableTracking, true);
  assert.equal(config.guide?.shape, 'circle');
});

test('defineFaceDetector supports guide shortcuts', () => {
  const withoutGuide = defineFaceDetector({ guide: 'none' });
  const selfieGuide = defineFaceDetector({ preset: 'fast', guide: 'selfie' });

  assert.equal(withoutGuide.guide, undefined);
  assert.equal(selfieGuide.preset, 'fast');
  assert.equal(selfieGuide.guide?.shape, 'circle');
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
