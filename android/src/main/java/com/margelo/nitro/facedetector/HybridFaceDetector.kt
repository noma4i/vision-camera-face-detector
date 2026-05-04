package com.margelo.nitro.facedetector

class HybridFaceDetector : HybridFaceDetectorSpec() {
  @Synchronized
  override fun configure(options: FaceDetectorOptions) {
    // Kept as a lightweight legacy HybridObject. Runtime detection is handled by FaceDetectionOutput.
  }
}
