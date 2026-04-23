# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
