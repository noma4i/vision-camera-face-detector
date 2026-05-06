# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-05-06

### Added
- **BREAKING:** iOS now uses VisionCamera V5's built-in `useObjectOutput({ types: ['face'] })` path from JS instead of a custom package Pod.
- **BREAKING:** `face.camera` now includes the internal `ref` required for iOS view-space coordinate conversion.
- **BREAKING:** `useFaceDetector(config)` now returns ready-to-pass `camera.outputs`, so apps can spread `<Camera {...face.camera} />` instead of manually appending the detector output.
- **BREAKING:** `useFaceDetector(config)` now defaults to `preset: 'selfie'`, `preview: 'screen'`, and a default selfie guide for the shortest capture-screen DSL.
- `useFaceDetector(config)` now accepts `outputs`, `preview`, and guide shortcuts (`'selfie'` / `'none'`) for simpler app code.
- **BREAKING:** New declarative `useFaceDetector(config)` API for VisionCamera native outputs, native frame throttling, primary-face selection, guide evaluation, and stable status.
- **BREAKING:** New Nitro `FaceDetectionOutput` extends VisionCamera V5 `CameraOutput`, so face detection runs in native code without JS frame processors.
- `defineFaceDetector(config)` and pure helpers for config normalization, guide projection, primary-face selection, and status stability.
- Unit tests for the new pure DSL/DX layer.
- Example capture now requires `face.ready`, so users cannot take a selfie while the guide is idle or misaligned.
- Android Gradle metadata now uses assignment-style DSL and the package-aligned runtime namespace.
- Package metadata now keeps React Native tooling CommonJS-compatible while declaring `lib` output as ESM.

### Changed
- **BREAKING:** `useFaceDetector()` no longer returns the low-level `output` escape hatch; spread `face.camera` into `<Camera />`.
- **BREAKING:** `previewWidth` / `previewHeight` were replaced by optional `preview: 'screen' | { width; height }`.
- **BREAKING:** `isReady` / `isAvailable` were renamed to `ready` / `available`.
- **BREAKING:** Removed the old public `scanFaces`, `configureFaceDetector`, `faceDetector`, and `DEFAULT_FACE_DETECTOR_OPTIONS` API surface.
- **BREAKING:** Removed the legacy no-op `FaceDetector` HybridObject; runtime detection is handled only by `FaceDetectionOutput`.
- **BREAKING:** `trackingId` is now optional. Android returns MLKit tracking ids when available; iOS returns VisionCamera face ids.
- README now documents the v3 DSL first, with a minimal copy-paste `useFaceDetector({ preset: 'selfie', outputs: photo })` example.
- Android detector configuration now avoids no-op rebuilds, closes replaced MLKit clients, and uses a bounded detection wait.
- Android now includes an autolink package bootstrap so `VisionCameraFaceDetectorOnLoad` is loaded into the APK.
- Android runtime code now lives under `com.noma4i.visioncamerafacedetector`; only the thin generated Nitro bridge remains under Nitro's required base namespace.
- Nitro generation script now points at `src` specs.
- Example app now consumes the package-level `useFaceDetector()` native output instead of carrying local frame-processor guide logic.

### Removed
- Worklets runtime dependency. `react-native-vision-camera-worklets` and `react-native-worklets` are no longer required.

### Fixed
- Example `test` script no longer points to an uninstalled Jest binary.
- Example no longer passes `enableLowLightBoost={false}`, which caused CameraX to throw on devices where low-light boost is unsupported.
- Face guide readiness now requires the full detected face bounds to fit inside the guide, preventing partial detections such as a chin at the edge from flickering into `ready`.
- Circle guides now evaluate the actual circular area instead of the circle's bounding square.
- Android no longer delivers stale in-flight MLKit results after the JS callback is replaced or cleared.
- Example selfie guide tolerance is tighter, so the UI no longer marks heavily misaligned partial faces as ready.
- Selfie guide readiness is now more forgiving near the frame edge: default tolerance is 40px, scanning is 12 FPS, and ready transitions no longer wait for two samples.
- Android example guide sizing now uses the actual root layout dimensions, so portrait screens no longer render oversized off-screen guides when startup dimensions are swapped.

## [2.0.0] - 2026-05-04

### Changed
- **BREAKING (iOS):** Replaced `GoogleMLKit/FaceDetection` with the system Apple `Vision` framework (`VNDetectFaceRectanglesRequest`). Removes ~120 MB of MLKit Pods from iOS builds.
- iOS podspec no longer declares the `GoogleMLKit/FaceDetection` dependency.
- Package description and README updated to reflect the new iOS backend.

### Removed
- iOS dependency on `GoogleMLKit/FaceDetection` and `MLKitVision`.

### Notes
- JS API is unchanged: `scanFaces`, `configureFaceDetector`, `isFaceDetectorAvailable`, `faceDetector`, `DEFAULT_FACE_DETECTOR_OPTIONS`.
- On iOS, `FaceDetectorOptions` fields (`performanceMode`, `landmarkMode`, `classificationMode`, `contourMode`, `minFaceSize`, `enableTracking`) are now no-ops. `trackingId` is always `0`.
- Android still uses `com.google.mlkit:face-detection` and supports the full options surface.

## [1.0.0] - 2026-04-23

### Added
- Initial public release.
- Nitro `HybridObject` spec for MLKit face detection (`FaceDetector.nitro.ts`).
- iOS Swift implementation backed by `GoogleMLKit/FaceDetection`.
- Android Kotlin implementation backed by `com.google.mlkit:face-detection`.
- Worklet-safe `scanFaces(frame)` API for VisionCamera V5 frame processors.
- `configureFaceDetector(options)` for performance/landmark/classification/contour modes.
- `isFaceDetectorAvailable()` guard for safe fallback before native codegen runs.
- Example app under `example/` demonstrating selfie camera with face-framing guides.
