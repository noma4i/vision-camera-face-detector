# FaceDetectorExample

Bare React Native app demonstrating [`@noma4i/vision-camera-face-detector`](../) with a selfie-framing guide UI.

## What it shows

- Front camera preview (VisionCamera V5, Nitro outputs API).
- Face framing guide overlay: outer dashed border, square dashed outline, circular guide ring.
- Live status: `idle` (no face) -> `misaligned` (face outside guide) -> `ready` (face centered).
- Haptic feedback when entering `ready` state.
- Photo capture via `usePhotoOutput`; captured photo shown on the next screen.

## Prerequisites

- Node.js 22+
- Bundler for iOS (`gem install bundler` once)
- Xcode 15+ (iOS deployment target 15.5)
- Android Studio with SDK 34, JDK 17

## Install

From the repo root:

```bash
yarn install                    # installs the library root
cd example && yarn install      # installs example app deps
```

The example imports the library via `"@noma4i/vision-camera-face-detector": "file:.."`, so local library edits propagate through Metro's `watchFolders`.

## Run iOS

```bash
cd example/ios
bundle install                  # one-time
bundle exec pod install         # pulls GoogleMLKit/FaceDetection (~120 MB first run)
cd ..
yarn ios                        # or: yarn ios --device
```

## Run Android

```bash
cd example
yarn android                    # or: yarn android --active-arch-only
```

MLKit face detection AAR is pulled automatically from mavenCentral.

## Regenerate Nitro bindings

The library ships with pre-generated bindings in `../nitrogen/generated/`. If you edit `src/specs/FaceDetector.nitro.ts`:

```bash
cd ..                           # library root
yarn nitrogen
```

Then rebuild the example (`pod install` on iOS, gradle sync on Android).

## Troubleshooting

**iOS build fails with `GoogleMLKit/FaceDetection` pod not found**
Ensure `platform :ios, '15.5'` in `ios/Podfile` and re-run `bundle exec pod install`.

**Android build fails with duplicate `libreactnative.so`**
The library's `android/build.gradle` excludes shared JNI libs (`libjsi`, `libreactnative`, `libfbjni`, `libc++_shared`, `libNitroModules`). If you run into duplicates, run `cd android && ./gradlew clean` and rebuild.

**Camera permission never prompts**
iOS: verify `NSCameraUsageDescription` is in `ios/FaceDetectorExample/Info.plist`.
Android: verify `<uses-permission android:name="android.permission.CAMERA" />` in `android/app/src/main/AndroidManifest.xml`.

**Metro can't resolve `react` or `react-native`**
The `metro.config.js` blocks the library's `node_modules/<peer>` to force resolution to example's copies. If you see "duplicate React" crashes, delete `../node_modules/react*` (library shouldn't install peers).
