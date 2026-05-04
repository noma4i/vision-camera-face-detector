# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
