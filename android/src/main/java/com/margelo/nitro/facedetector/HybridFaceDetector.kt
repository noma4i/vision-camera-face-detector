package com.margelo.nitro.facedetector

import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector as MLKitFaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions as MLKitFaceDetectorOptions
import com.margelo.nitro.camera.HybridFrameSpec
import com.margelo.nitro.camera.public.NativeFrame
import java.util.concurrent.CountDownLatch
import java.util.concurrent.atomic.AtomicReference

class HybridFaceDetector : HybridFaceDetectorSpec() {
  private var currentOptions: FaceDetectorOptions = FaceDetectorOptions(
    performanceMode = FaceDetectorPerformanceMode.FAST,
    landmarkMode = FaceDetectorLandmarkMode.NONE,
    classificationMode = FaceDetectorClassificationMode.NONE,
    contourMode = FaceDetectorContourMode.NONE,
    minFaceSize = 0.15,
    enableTracking = false
  )

  private var detectorRef: MLKitFaceDetector = buildDetector(currentOptions)

  override fun configure(options: FaceDetectorOptions) {
    currentOptions = options
    detectorRef = buildDetector(options)
  }

  @Suppress("TooGenericExceptionCaught")
  override fun detectFaces(frame: HybridFrameSpec): Array<DetectedFace> {
    val nativeFrame = frame as? NativeFrame ?: return emptyArray()
    val imageProxy = nativeFrame.image
    val mediaImage = imageProxy.image ?: return emptyArray()
    val rotation = imageProxy.imageInfo.rotationDegrees
    val input = InputImage.fromMediaImage(mediaImage, rotation)

    val latch = CountDownLatch(1)
    val ref = AtomicReference<Array<DetectedFace>>(emptyArray())

    detectorRef.process(input)
      .addOnSuccessListener { faces ->
        ref.set(faces.map { mapFace(it) }.toTypedArray())
      }
      .addOnFailureListener {
        ref.set(emptyArray())
      }
      .addOnCompleteListener {
        latch.countDown()
      }

    try {
      latch.await()
    } catch (_: InterruptedException) {
      Thread.currentThread().interrupt()
    }

    return ref.get()
  }

  private fun buildDetector(options: FaceDetectorOptions): MLKitFaceDetector {
    val builder = MLKitFaceDetectorOptions.Builder()
      .setPerformanceMode(
        if (options.performanceMode == FaceDetectorPerformanceMode.ACCURATE)
          MLKitFaceDetectorOptions.PERFORMANCE_MODE_ACCURATE
        else MLKitFaceDetectorOptions.PERFORMANCE_MODE_FAST
      )
      .setLandmarkMode(
        if (options.landmarkMode == FaceDetectorLandmarkMode.ALL)
          MLKitFaceDetectorOptions.LANDMARK_MODE_ALL
        else MLKitFaceDetectorOptions.LANDMARK_MODE_NONE
      )
      .setClassificationMode(
        if (options.classificationMode == FaceDetectorClassificationMode.ALL)
          MLKitFaceDetectorOptions.CLASSIFICATION_MODE_ALL
        else MLKitFaceDetectorOptions.CLASSIFICATION_MODE_NONE
      )
      .setContourMode(
        if (options.contourMode == FaceDetectorContourMode.ALL)
          MLKitFaceDetectorOptions.CONTOUR_MODE_ALL
        else MLKitFaceDetectorOptions.CONTOUR_MODE_NONE
      )
      .setMinFaceSize(options.minFaceSize.toFloat())

    if (options.enableTracking) {
      builder.enableTracking()
    }

    return FaceDetection.getClient(builder.build())
  }

  private fun mapFace(face: Face): DetectedFace {
    val box = face.boundingBox
    val trackingId = face.trackingId?.toDouble() ?: 0.0
    return DetectedFace(
      bounds = DetectedFaceBounds(
        x = box.left.toDouble(),
        y = box.top.toDouble(),
        width = box.width().toDouble(),
        height = box.height().toDouble()
      ),
      trackingId = trackingId
    )
  }
}
