# @noma4i/vision-camera-face-detector

Fast, Nitro-powered face detection frame processor plugin for [VisionCamera V5](https://github.com/mrousavy/react-native-vision-camera).

- iOS: Apple `Vision` framework (system, no extra dependency)
- Android: `com.google.mlkit:face-detection`
- JS: synchronous worklet contract (`scanFaces(frame) => DetectedFace[]`)
- Zero-bridge: powered by [`react-native-nitro-modules`](https://github.com/mrousavy/nitro)

## Installation

```bash
yarn add @noma4i/vision-camera-face-detector react-native-vision-camera react-native-nitro-modules
```

Vision Camera V5 requires a bare React Native project (not Expo Go). Expo prebuild works.

### iOS

Minimum deployment target: **iOS 15.5** (matches the bundled VisionCamera/Nitro requirement).

In `ios/Podfile`:

```ruby
platform :ios, '15.5'
```

Then:

```bash
cd ios && pod install
```

iOS uses the system `Vision` framework (`VNDetectFaceRectanglesRequest`); no extra Pod dependency is downloaded.

Add to `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>$(PRODUCT_NAME) needs camera access for face detection.</string>
```

### Android

Minimum SDK: **21**.

MLKit face detection AAR is resolved from `mavenCentral()` via the module's `build.gradle`. No manual wiring required.

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" />
```

### Nitro codegen (one-time)

After installing the package, regenerate Nitro bindings in the consumer project:

```bash
npx nitrogen generate
```

This is usually part of your CI or a local `yarn nitrogen` script.

## Usage

```ts
import { useFrameOutput, useCameraDevice, Camera } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-worklets';
import {
  configureFaceDetector,
  isFaceDetectorAvailable,
  scanFaces,
  type DetectedFace
} from '@noma4i/vision-camera-face-detector';
import { useEffect, useState } from 'react';

export function FaceDetectorExample() {
  const device = useCameraDevice('front');
  const [faces, setFaces] = useState<DetectedFace[]>([]);

  useEffect(() => {
    if (!isFaceDetectorAvailable()) return;
    configureFaceDetector({
      performanceMode: 'accurate',
      minFaceSize: 0.25,
      enableTracking: true
    });
  }, []);

  const frameOutput = useFrameOutput({
    pixelFormat: 'yuv',
    onFrame: (frame) => {
      'worklet';
      try {
        const detected = scanFaces(frame);
        runOnJS(setFaces)(detected);
      } finally {
        frame.dispose();
      }
    }
  });

  if (!device) return null;

  return (
    <Camera
      style={{ flex: 1 }}
      device={device}
      isActive
      outputs={[frameOutput]}
    />
  );
}
```

## API

| Export                           | Type                                              | Description                                                                                                    |
| -------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `scanFaces(frame)`               | `(frame: Frame) => DetectedFace[]`                | Worklet-safe synchronous face scan. Returns empty array if native plugin unavailable.                          |
| `configureFaceDetector(options)` | `(options: Partial<FaceDetectorOptions>) => void` | Apply detector options. Merges with defaults.                                                                  |
| `isFaceDetectorAvailable()`      | `() => boolean`                                   | Guard before wiring frame output; false until native codegen + pod install complete.                           |
| `faceDetector`                   | `FaceDetector \| undefined`                       | Raw Nitro HybridObject, resolved once at module load.                                                          |
| `DEFAULT_FACE_DETECTOR_OPTIONS`  | `FaceDetectorOptions`                             | Sensible defaults: `fast` perf mode, no landmarks/classifications/contours, `minFaceSize: 0.15`, tracking off. |

### `FaceDetectorOptions`

| Field                | Type                   | Default  | Notes                                                                         |
| -------------------- | ---------------------- | -------- | ----------------------------------------------------------------------------- |
| `performanceMode`    | `'fast' \| 'accurate'` | `'fast'` | Android: MLKit `FaceDetectorMode`. iOS: ignored (Vision uses fixed pipeline). |
| `landmarkMode`       | `'none' \| 'all'`      | `'none'` | Android: MLKit `FaceLandmarkMode`. iOS: not exposed.                          |
| `classificationMode` | `'none' \| 'all'`      | `'none'` | Android: MLKit `FaceClassificationMode`. iOS: not exposed.                    |
| `contourMode`        | `'none' \| 'all'`      | `'none'` | Android: MLKit `FaceContourMode`. iOS: not exposed.                           |
| `minFaceSize`        | `number` (0-1)         | `0.15`   | Android: fraction of frame width. iOS: ignored.                               |
| `enableTracking`     | `boolean`              | `false`  | Android: MLKit face tracking. iOS: always returns `trackingId: 0`.            |

### `DetectedFace`

```ts
interface DetectedFace {
  bounds: DetectedFaceBounds;
  trackingId?: number;
}

interface DetectedFaceBounds {
  x: number; // pixels, frame-space
  y: number;
  width: number;
  height: number;
}
```

Bounds are in **frame pixel coordinates**, not screen coordinates. Project to screen space using Vision Camera's preview transform (see `example/src/utils/selfieGuideDetection.ts` for a reference implementation covering both iOS and Android axis-swap cases).

## Example

A complete working example is in [`example/`](./example). It demonstrates:

- Selfie camera with front-facing device
- Face-framing guide overlay (outer dashed border + square + circle)
- Live `idle` -> `misaligned` -> `ready` guide status
- Haptic feedback on `ready`
- Photo capture through `usePhotoOutput`

Run it:

```bash
cd example
yarn install
cd ios && pod install && cd ..
yarn ios   # or: yarn android
```

## Troubleshooting

**`isFaceDetectorAvailable()` returns `false`**
Native module not linked. Run `npx nitrogen generate`, then `pod install` on iOS / gradle sync on Android, and rebuild.

**Crash on frame processor**
Call `frame.dispose()` **after** `scanFaces(frame)`, in a `finally` block. Nitro does not auto-dispose frames.

**Bounds look rotated on Android**
Android preview orientation differs from frame orientation in portrait mode. Use the axis-swap logic from `example/src/utils/selfieGuideDetection.ts:getProjectionFrameSize`.

**iOS detection lacks landmarks/tracking**
iOS uses Apple's `Vision` framework (`VNDetectFaceRectanglesRequest`), which only returns face rectangles. `landmarkMode`, `classificationMode`, `contourMode`, `enableTracking`, and `minFaceSize` are no-ops on iOS; on Android they map to the corresponding MLKit options.

## License

MIT - see [LICENSE](./LICENSE).
