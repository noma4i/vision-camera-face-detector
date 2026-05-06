# @noma4i/vision-camera-face-detector

Face detection DSL for VisionCamera V5.

- iOS: VisionCamera V5 `ObjectOutput`, no package Pods
- Android: Nitro `CameraOutput` + MLKit Face Detection
- JS: one hook returns ready-to-pass `Camera` props and guide status
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
Runtime classes are packaged under `com.noma4i.visioncamerafacedetector`; Nitro-generated bridge classes keep Nitro's required `com.margelo.nitro.*` base.

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

The hook creates the platform face-detection output, appends it to your camera outputs, injects the camera ref required by iOS coordinate conversion, projects detected bounds into preview space, and stabilizes guide status.

```ts
const face = useFaceDetector({
  preset: 'selfie',
  outputs: photoOutput
});
```

Return:

| Field | Type | Notes |
| --- | --- | --- |
| `camera` | `{ ref: RefObject<CameraRef \| null>; outputs: CameraOutput[] }` | Spread into `<Camera {...face.camera} />`. |
| `status` | `'unavailable' \| 'idle' \| 'misaligned' \| 'ready'` | Stable guide status. |
| `ready` | `boolean` | `status === 'ready'`. |
| `available` | `boolean` | Platform output is available. |
| `result` | `FaceDetectionResult` | Faces, primary face, projected rects, guide state. |

Config:

| Field | Type | Default |
| --- | --- | --- |
| `preset` | `'selfie' \| 'fast' \| 'accurate'` | `'selfie'` |
| `outputs` | `CameraOutput \| CameraOutput[]` | `[]` |
| `preview` | `'screen' \| { width; height }` | `'screen'` |
| `guide` | `'selfie' \| 'none' \| circle/rect config` | selfie preset gets `'selfie'` |
| `fps` | `number` | preset-specific, clamped to 1-60 |
| `android` | MLKit options | preset-specific |
| `stability` | `{ readySamples; resetSamples; minTransitionMs }` | `{ 1, 3, 180 }` |

### Presets

`selfie` is the default and is meant for profile-photo capture:

- accurate Android mode
- tracking enabled on Android
- native scanning at 12 FPS
- default circular guide
- strict readiness: the full detected face bounds must fit inside the guide
- circular guides use the actual circle, not the bounding square

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
    tolerancePx: 40
  }
});
```

Disable guide evaluation when you only need faces:

```ts
const face = useFaceDetector({
  guide: 'none'
});
```

With `guide: 'none'`, `face.ready` means at least one face is detected.

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

`trackingId` is Android MLKit tracking id or iOS VisionCamera `faceID`.

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

The package ships Android generated bindings. If you edit `src/specs/FaceDetector.nitro.ts`, regenerate:

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
