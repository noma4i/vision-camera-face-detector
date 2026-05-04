# @noma4i/vision-camera-face-detector

Nitro CameraOutput face detection for VisionCamera V5.

- iOS: Apple `Vision`, no MLKit Pods
- Android: MLKit Face Detection
- JS: one hook returns ready-to-pass `Camera` outputs and guide status
- No worklets, no frame processors, no manual native wiring

## Installation

```bash
yarn add @noma4i/vision-camera-face-detector react-native-vision-camera react-native-nitro-modules
```

VisionCamera V5 requires a bare React Native app. Expo prebuild works; Expo Go does not.

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

## Quick Start

```tsx
import { Camera, useCameraDevice, usePhotoOutput } from 'react-native-vision-camera';
import { useFaceDetector } from '@noma4i/vision-camera-face-detector';

export function SelfieCamera() {
  const device = useCameraDevice('front');
  const photo = usePhotoOutput({ quality: 0.9 });
  const face = useFaceDetector({
    preset: 'selfie',
    outputs: photo
  });

  if (!device) return null;

  return (
    <Camera
      {...face.camera}
      style={{ flex: 1 }}
      device={device}
      isActive
      mirrorMode="on"
    />
  );
}
```

`face.status` is `'unavailable' | 'idle' | 'misaligned' | 'ready'`.

Use `face.ready` for capture gating:

```tsx
const canTakePhoto = face.ready;
```

## DSL

### `useFaceDetector(config?)`

The hook creates the native face-detection output, appends it to your camera outputs, projects detected bounds into preview space, and stabilizes guide status.

```ts
const face = useFaceDetector({
  preset: 'selfie',
  outputs: photoOutput
});
```

Return:

| Field | Type | Notes |
| --- | --- | --- |
| `camera` | `{ outputs: CameraOutput[] }` | Spread into `<Camera {...face.camera} />`. |
| `status` | `'unavailable' \| 'idle' \| 'misaligned' \| 'ready'` | Stable guide status. |
| `ready` | `boolean` | `status === 'ready'`. |
| `available` | `boolean` | Native module and output are linked. |
| `result` | `FaceDetectionResult` | Faces, primary face, projected rects, guide state. |
| `output` | `FaceDetectionOutput \| undefined` | Advanced escape hatch. Most apps should use `camera`. |

Config:

| Field | Type | Default |
| --- | --- | --- |
| `preset` | `'selfie' \| 'fast' \| 'accurate'` | `'selfie'` |
| `outputs` | `CameraOutput \| CameraOutput[]` | `[]` |
| `preview` | `'screen' \| { width; height }` | `'screen'` |
| `guide` | `'selfie' \| 'none' \| circle/rect config` | selfie preset gets `'selfie'` |
| `fps` | `number` | preset-specific, clamped to 1-60 |
| `android` | MLKit options | preset-specific |
| `stability` | `{ readySamples; resetSamples; minTransitionMs }` | `{ 2, 4, 400 }` |

### Presets

`selfie` is the default and is meant for profile-photo capture:

- accurate Android mode
- tracking enabled on Android
- native scanning at 8 FPS
- default circular guide
- strict readiness: the full detected face bounds must fit inside the guide

`fast` and `accurate` are lower-level presets for custom UIs. They do not add a guide unless you pass one.

### Custom Guide

Use the default guide for most selfie screens:

```ts
useFaceDetector({ preset: 'selfie', outputs: photo });
```

Pass a custom guide only when your overlay geometry is custom:

```ts
const face = useFaceDetector({
  outputs: photo,
  preview: { width: screenWidth, height: screenHeight },
  guide: {
    shape: 'circle',
    units: 'px',
    centerX: screenWidth / 2,
    centerY: 360,
    size: 320,
    tolerancePx: 24
  }
});
```

Disable guide evaluation when you only need faces:

```ts
const face = useFaceDetector({
  guide: 'none'
});
```

### Android Tuning

```ts
const face = useFaceDetector({
  preset: 'accurate',
  android: {
    performanceMode: 'accurate',
    landmarkMode: 'none',
    classificationMode: 'none',
    contourMode: 'none',
    minFaceSize: 0.2,
    enableTracking: true
  }
});
```

## Types

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

`trackingId` is Android-only. iOS returns Apple Vision rectangles and does not synthesize fake ids.

Pure helpers are exported for custom UI and tests:

```ts
defineFaceDetector
evaluateFaceDetection
pickPrimaryFace
mapFrameRectToPreview
resolveGuideRect
applyGuideStability
```

## Nitro Codegen

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

## License

MIT - see [LICENSE](./LICENSE).
