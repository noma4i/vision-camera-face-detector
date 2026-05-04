# @noma4i/vision-camera-face-detector

Nitro-powered face detection for VisionCamera V5 with a small declarative API.

- iOS: Apple `Vision` framework, no extra MLKit Pods
- Android: `com.google.mlkit:face-detection`
- JS: `useFaceDetector()` creates a native CameraOutput, applies primary-face selection, and returns guide status
- Advanced: pure helpers are exported for tests/custom UI

## Installation

```bash
yarn add @noma4i/vision-camera-face-detector react-native-vision-camera react-native-nitro-modules
```

Vision Camera V5 requires a bare React Native project. Expo prebuild works; Expo Go does not.

### iOS

Minimum deployment target: **iOS 15.5**.

```ruby
platform :ios, '15.5'
```

```bash
cd ios && pod install
```

Add camera permission text:

```xml
<key>NSCameraUsageDescription</key>
<string>$(PRODUCT_NAME) needs camera access for face detection.</string>
```

### Android

Minimum SDK: **21**.

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" />
```

## Usage

```tsx
import { Camera, useCameraDevice, usePhotoOutput } from 'react-native-vision-camera';
import { useFaceDetector } from '@noma4i/vision-camera-face-detector';

export function SelfieCamera() {
  const device = useCameraDevice('front');
  const photoOutput = usePhotoOutput({ quality: 0.9 });
  const detector = useFaceDetector({
    preset: 'selfie',
    previewWidth: 390,
    previewHeight: 844,
    guide: {
      shape: 'circle',
      units: 'ratio',
      centerX: 0.5,
      centerY: 0.42,
      size: 0.72,
      tolerancePx: 120
    }
  });

  if (!device) return null;

  return (
    <Camera
      style={{ flex: 1 }}
      device={device}
      isActive
      mirrorMode="on"
      outputs={detector.output ? [photoOutput, detector.output] : [photoOutput]}
    />
  );
}
```

`detector.status` is `'unavailable' | 'idle' | 'misaligned' | 'ready'`.
`detector.result` includes all faces, the selected primary face, projected preview rects, and guide state.

## API

### `useFaceDetector(config)`

Main API for apps. It creates a VisionCamera native `CameraOutput`, throttles scanning in native code, applies native options, and returns guide status.

Required fields:

| Field | Type | Notes |
| --- | --- | --- |
| `previewWidth` | `number` | Preview/UI width in pixels. |
| `previewHeight` | `number` | Preview/UI height in pixels. |

Optional fields:

| Field | Type | Default |
| --- | --- | --- |
| `preset` | `'selfie' \| 'fast' \| 'accurate'` | `'fast'` |
| `fps` | `number` | preset-specific, clamped to 1-60 |
| `guide` | circle or rect config | selfie preset gets a default circular guide |
| `android` | Android MLKit options | preset-specific |
| `stability` | `{ readySamples; resetSamples; minTransitionMs }` | `{ 2, 4, 400 }` |

Return:

| Field | Type |
| --- | --- |
| `output` | VisionCamera frame output or `undefined` |
| `status` | `'unavailable' \| 'idle' \| 'misaligned' \| 'ready'` |
| `result` | `FaceDetectionResult` |
| `isAvailable` | `boolean` |
| `isReady` | `boolean` |

### `defineFaceDetector(config)`

Pure helper that normalizes the declarative config into runtime values. Useful for tests or custom integrations.

### Pure helpers

`evaluateFaceDetection`, `pickPrimaryFace`, `mapFrameRectToPreview`, `resolveGuideRect`, and `applyGuideStability` are exported for custom UI and unit tests.

### `DetectedFace`

```ts
interface DetectedFace {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  trackingId?: number;
}
```

`trackingId` is Android-only. iOS returns face rectangles from Apple Vision and does not synthesize fake tracking ids.

## Nitro codegen

The package ships generated bindings. If you edit `src/specs/FaceDetector.nitro.ts`, regenerate:

```bash
npm run nitrogen
```

## Example

A complete working example is in [`example/`](./example).

```bash
cd example
yarn install
cd ios && bundle exec pod install && cd ..
yarn ios
```

## Troubleshooting

**`output` is `undefined` or `status` is `unavailable`**
Native module is not linked. Run `npm run nitrogen`, then `pod install` on iOS or Gradle sync on Android, and rebuild.

**Bounds do not line up with the preview**
Pass the actual preview dimensions to `previewWidth` and `previewHeight`; the hook projects frame-space bounds into preview-space using center-crop scaling.

**Android logs `Low-light boost is not supported`**
Do not pass `enableLowLightBoost={false}`. VisionCamera V5 calls CameraX whenever the prop is set; only pass it when `device.supportsLowLightBoost` is true.

## License

MIT - see [LICENSE](./LICENSE).
