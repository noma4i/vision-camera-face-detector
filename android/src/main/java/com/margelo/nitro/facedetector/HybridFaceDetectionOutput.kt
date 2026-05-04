package com.margelo.nitro.facedetector

import android.os.SystemClock
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector as MLKitFaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions as MLKitFaceDetectorOptions
import com.margelo.nitro.camera.MediaType
import com.margelo.nitro.camera.MirrorMode
import com.margelo.nitro.camera.extensions.orientation
import com.margelo.nitro.camera.extensions.surfaceRotation
import com.margelo.nitro.camera.public.NativeCameraOutput
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.max
import com.margelo.nitro.camera.CameraOrientation as VisionCameraOrientation

class HybridFaceDetectionOutput :
  HybridFaceDetectionOutputSpec(),
  NativeCameraOutput {
  private val executor = Executors.newSingleThreadExecutor()
  private val isProcessing = AtomicBoolean(false)

  override val mediaType: MediaType = MediaType.VIDEO
  override var outputOrientation: VisionCameraOrientation = VisionCameraOrientation.UP
    set(value) {
      field = value
      imageAnalysis?.targetRotation = value.surfaceRotation
    }
  override var mirrorMode: MirrorMode = MirrorMode.AUTO

  private var currentOptions: FaceDetectorOptions = defaultOptions()
  private var detector: MLKitFaceDetector = buildDetector(currentOptions)
  private var frameIntervalMs: Long = 125L
  private var lastFrameAtMs: Long = 0L
  private var onFacesDetected: ((FaceDetectionOutputResult) -> Unit)? = null
  private var imageAnalysis: ImageAnalysis? = null
    set(value) {
      field = value
      updateAnalyzer()
    }

  @Synchronized
  override fun configure(options: FaceDetectorOptions, fps: Double) {
    frameIntervalMs = (1000.0 / max(fps, 1.0)).toLong()
    if (options == currentOptions) return

    val previousDetector = detector
    currentOptions = options
    detector = buildDetector(options)
    previousDetector.close()
  }

  override fun setOnFacesDetectedCallback(onFacesDetected: ((result: FaceDetectionOutputResult) -> Unit)?) {
    this.onFacesDetected = onFacesDetected
    updateAnalyzer()
  }

  override fun createUseCase(
    mirrorMode: MirrorMode,
    config: NativeCameraOutput.Config,
  ): NativeCameraOutput.PreparedUseCase {
    val imageAnalysis = ImageAnalysis
      .Builder()
      .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
      .setBackgroundExecutor(executor)
      .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
      .setTargetRotation(outputOrientation.surfaceRotation)
      .build()

    return NativeCameraOutput.PreparedUseCase(imageAnalysis) {
      this.imageAnalysis = imageAnalysis
      this.mirrorMode = mirrorMode
    }
  }

  private fun updateAnalyzer() {
    val imageAnalysis = imageAnalysis ?: return
    val callback = onFacesDetected

    if (callback == null) {
      imageAnalysis.clearAnalyzer()
      return
    }

    imageAnalysis.setAnalyzer(executor) { image ->
      analyzeImage(image, callback)
    }
  }

  private fun analyzeImage(
    image: ImageProxy,
    callback: (FaceDetectionOutputResult) -> Unit,
  ) {
    val now = SystemClock.elapsedRealtime()
    if (now - lastFrameAtMs < frameIntervalMs) {
      image.close()
      return
    }

    if (!isProcessing.compareAndSet(false, true)) {
      image.close()
      return
    }

    lastFrameAtMs = now
    val mediaImage = image.image
    if (mediaImage == null) {
      isProcessing.set(false)
      image.close()
      return
    }

    val rotationDegrees = image.imageInfo.rotationDegrees
    val input = InputImage.fromMediaImage(mediaImage, rotationDegrees)
    val orientation = image.orientation.toFaceDetectionOrientation()
    val rotated = rotationDegrees == 90 || rotationDegrees == 270
    val frame = FaceDetectionFrame(
      width = (if (rotated) image.height else image.width).toDouble(),
      height = (if (rotated) image.width else image.height).toDouble(),
      orientation = orientation,
      isMirrored = mirrorMode == MirrorMode.ON,
      timestampMs = now.toDouble(),
    )

    detector.process(input)
      .addOnSuccessListener { faces ->
        callback(FaceDetectionOutputResult(faces.map { mapFace(it) }.toTypedArray(), frame))
      }
      .addOnFailureListener {
        callback(FaceDetectionOutputResult(emptyArray(), frame))
      }
      .addOnCompleteListener {
        isProcessing.set(false)
        image.close()
      }
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
    return DetectedFace(
      bounds = DetectedFaceBounds(
        x = box.left.toDouble(),
        y = box.top.toDouble(),
        width = box.width().toDouble(),
        height = box.height().toDouble(),
      ),
      trackingId = face.trackingId?.toDouble(),
    )
  }

  private fun VisionCameraOrientation.toFaceDetectionOrientation(): FaceDetectionOrientation {
    return when (this) {
      VisionCameraOrientation.UP -> FaceDetectionOrientation.UP
      VisionCameraOrientation.RIGHT -> FaceDetectionOrientation.RIGHT
      VisionCameraOrientation.DOWN -> FaceDetectionOrientation.DOWN
      VisionCameraOrientation.LEFT -> FaceDetectionOrientation.LEFT
    }
  }

  private fun defaultOptions(): FaceDetectorOptions = FaceDetectorOptions(
    performanceMode = FaceDetectorPerformanceMode.FAST,
    landmarkMode = FaceDetectorLandmarkMode.NONE,
    classificationMode = FaceDetectorClassificationMode.NONE,
    contourMode = FaceDetectorContourMode.NONE,
    minFaceSize = 0.15,
    enableTracking = false,
  )
}
