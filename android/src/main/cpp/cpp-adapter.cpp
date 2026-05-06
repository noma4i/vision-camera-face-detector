#include <jni.h>
#include <fbjni/fbjni.h>
#include "VisionCameraFaceDetectorOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, [=] {
    margelo::nitro::noma4i::visioncamerafacedetector::registerAllNatives();
  });
}
