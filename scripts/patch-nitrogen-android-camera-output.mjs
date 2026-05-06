import { rmSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const androidCpp = join(root, 'nitrogen/generated/android/c++');
const headerPath = join(androidCpp, 'JHybridFaceDetectionOutputSpec.hpp');
const sourcePath = join(androidCpp, 'JHybridFaceDetectionOutputSpec.cpp');

let header = readFileSync(headerPath, 'utf8');
header = header.replace(
  '#include <VisionCamera/JHybridCameraOutputSpec.hpp>\n',
  '#include <VisionCamera/CameraOrientation.hpp>\n#include <VisionCamera/JHybridCameraOutputSpec.hpp>\n#include <VisionCamera/MediaType.hpp>\n'
);
header = header
  .replace('    MediaType getMediaType() override;', '    margelo::nitro::camera::MediaType getMediaType() override;')
  .replace('    CameraOrientation getOutputOrientation() override;', '    margelo::nitro::camera::CameraOrientation getOutputOrientation() override;')
  .replace(
    '    void setOutputOrientation(CameraOrientation outputOrientation) override;',
    '    void setOutputOrientation(margelo::nitro::camera::CameraOrientation outputOrientation) override;'
  );
writeFileSync(headerPath, header);

let source = readFileSync(sourcePath, 'utf8');
source = source
  .replace('#include "MediaType.hpp"\n#include "JMediaType.hpp"\n#include "CameraOrientation.hpp"\n#include "JCameraOrientation.hpp"', '#include <VisionCamera/MediaType.hpp>\n#include <VisionCamera/JMediaType.hpp>\n#include <VisionCamera/CameraOrientation.hpp>\n#include <VisionCamera/JCameraOrientation.hpp>')
  .replace('  MediaType JHybridFaceDetectionOutputSpec::getMediaType() {', '  margelo::nitro::camera::MediaType JHybridFaceDetectionOutputSpec::getMediaType() {')
  .replace('getMethod<jni::local_ref<JMediaType>()>("getMediaType")', 'getMethod<jni::local_ref<margelo::nitro::camera::JMediaType>()>("getMediaType")')
  .replace('  CameraOrientation JHybridFaceDetectionOutputSpec::getOutputOrientation() {', '  margelo::nitro::camera::CameraOrientation JHybridFaceDetectionOutputSpec::getOutputOrientation() {')
  .replace('getMethod<jni::local_ref<JCameraOrientation>()>("getOutputOrientation")', 'getMethod<jni::local_ref<margelo::nitro::camera::JCameraOrientation>()>("getOutputOrientation")')
  .replace('  void JHybridFaceDetectionOutputSpec::setOutputOrientation(CameraOrientation outputOrientation) {', '  void JHybridFaceDetectionOutputSpec::setOutputOrientation(margelo::nitro::camera::CameraOrientation outputOrientation) {')
  .replace('getMethod<void(jni::alias_ref<JCameraOrientation> /* outputOrientation */)>("setOutputOrientation")', 'getMethod<void(jni::alias_ref<margelo::nitro::camera::JCameraOrientation> /* outputOrientation */)>("setOutputOrientation")')
  .replace('method(_javaPart, JCameraOrientation::fromCpp(outputOrientation));', 'method(_javaPart, margelo::nitro::camera::JCameraOrientation::fromCpp(outputOrientation));');
writeFileSync(sourcePath, source);

rmSync(join(root, 'nitrogen/generated/ios'), { force: true, recursive: true });
