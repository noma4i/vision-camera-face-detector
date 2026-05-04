import AVFoundation
import CoreMedia
import Foundation
import ImageIO
import Vision
import VisionCamera

final class HybridFaceDetectionOutput: HybridFaceDetectionOutputSpec_base,
  HybridFaceDetectionOutputSpec_protocol,
  NativeCameraOutput
{
  private let queue = DispatchQueue(label: "com.noma4i.camera.face-detector")
  private let delegate = FaceDetectionOutputDelegate()
  private var mirrorMode: MirrorMode = .auto

  let mediaType: MediaType = .video
  let requiresAudioInput: Bool = false
  let requiresDepthFormat: Bool = false
  let output: AVCaptureVideoDataOutput
  var streamType: StreamType = .video
  var targetResolution: ResolutionRule = .any
  var outputOrientation: VisionCamera.CameraOrientation = .up {
    didSet {
      guard let connection = output.connection(with: .video) else { return }
      try? connection.setOrientation(outputOrientation)
    }
  }

  override init() {
    self.output = AVCaptureVideoDataOutput()
    super.init()

    output.setSampleBufferDelegate(delegate, queue: queue)
    output.alwaysDiscardsLateVideoFrames = true
    output.videoSettings = [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange
    ]
  }

  func configure(options: FaceDetectorOptions, fps: Double) throws {
    delegate.frameIntervalMs = 1000.0 / max(fps, 1.0)
    _ = options
  }

  func configure(config: CameraOutputConfiguration) {
    mirrorMode = config.mirrorMode
    delegate.mirrorMode = config.mirrorMode

    guard let connection = output.connection(with: .video) else {
      return
    }
    try? connection.setOrientation(outputOrientation)
    try? connection.setMirrorMode(config.mirrorMode)
  }

  func setOnFacesDetectedCallback(
    onFacesDetected: ((FaceDetectionOutputResult) -> Void)?
  ) throws {
    delegate.onFacesDetected = onFacesDetected
  }
}

private final class FaceDetectionOutputDelegate: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  var frameIntervalMs: Double = 125
  var mirrorMode: MirrorMode = .auto
  var onFacesDetected: ((FaceDetectionOutputResult) -> Void)?
  private var lastFrameAtMs: Double = 0

  func captureOutput(
    _ output: AVCaptureOutput,
    didOutput sampleBuffer: CMSampleBuffer,
    from connection: AVCaptureConnection
  ) {
    guard let onFacesDetected,
          let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
      return
    }

    let nowMs = timestampMs(from: sampleBuffer)
    if nowMs - lastFrameAtMs < frameIntervalMs {
      return
    }
    lastFrameAtMs = nowMs

    let orientation = imageOrientation(from: sampleBuffer)
    let request = VNDetectFaceRectanglesRequest()
    let handler = VNImageRequestHandler(
      cvPixelBuffer: pixelBuffer,
      orientation: orientation,
      options: [:]
    )

    do {
      try handler.perform([request])
    } catch {
      onFacesDetected(result(sampleBuffer: sampleBuffer, faces: [], orientation: orientation, timestampMs: nowMs))
      return
    }

    let imageSize = orientedImageSize(for: pixelBuffer, orientation: orientation)
    let faces = (request.results ?? []).map { observation in
      mapFace(observation, imageSize: imageSize)
    }
    onFacesDetected(result(sampleBuffer: sampleBuffer, faces: faces, orientation: orientation, timestampMs: nowMs))
  }

  private func result(
    sampleBuffer: CMSampleBuffer,
    faces: [DetectedFace],
    orientation: CGImagePropertyOrientation,
    timestampMs: Double
  ) -> FaceDetectionOutputResult {
    let frame = FaceDetectionFrame(
      width: Double(orientedImageSize(for: CMSampleBufferGetImageBuffer(sampleBuffer), orientation: orientation).width),
      height: Double(orientedImageSize(for: CMSampleBufferGetImageBuffer(sampleBuffer), orientation: orientation).height),
      orientation: faceDetectionOrientation(from: orientation),
      isMirrored: mirrorMode == .on,
      timestampMs: timestampMs
    )
    return FaceDetectionOutputResult(faces: faces, frame: frame)
  }

  private func mapFace(_ observation: VNFaceObservation, imageSize: CGSize) -> DetectedFace {
    let rect = pixelRect(from: observation.boundingBox, imageSize: imageSize)
    return DetectedFace(
      bounds: DetectedFaceBounds(
        x: Double(rect.origin.x),
        y: Double(rect.origin.y),
        width: Double(rect.size.width),
        height: Double(rect.size.height)
      ),
      trackingId: nil
    )
  }

  private func orientedImageSize(
    for pixelBuffer: CVPixelBuffer?,
    orientation: CGImagePropertyOrientation
  ) -> CGSize {
    guard let pixelBuffer else {
      return .zero
    }

    let width = CGFloat(CVPixelBufferGetWidth(pixelBuffer))
    let height = CGFloat(CVPixelBufferGetHeight(pixelBuffer))

    switch orientation {
    case .left, .leftMirrored, .right, .rightMirrored:
      return CGSize(width: height, height: width)
    default:
      return CGSize(width: width, height: height)
    }
  }

  private func pixelRect(from normalizedRect: CGRect, imageSize: CGSize) -> CGRect {
    CGRect(
      x: normalizedRect.origin.x * imageSize.width,
      y: (1.0 - normalizedRect.origin.y - normalizedRect.height) * imageSize.height,
      width: normalizedRect.width * imageSize.width,
      height: normalizedRect.height * imageSize.height
    )
  }

  private func imageOrientation(from sampleBuffer: CMSampleBuffer) -> CGImagePropertyOrientation {
    let attachment = CMGetAttachment(
      sampleBuffer,
      key: kCGImagePropertyOrientation,
      attachmentModeOut: nil
    ) as? UInt32
    guard let raw = attachment, let orientation = CGImagePropertyOrientation(rawValue: raw) else {
      return .up
    }
    return orientation
  }

  private func faceDetectionOrientation(
    from orientation: CGImagePropertyOrientation
  ) -> FaceDetectionOrientation {
    switch orientation {
    case .right, .rightMirrored:
      return .right
    case .down, .downMirrored:
      return .down
    case .left, .leftMirrored:
      return .left
    default:
      return .up
    }
  }

  private func timestampMs(from sampleBuffer: CMSampleBuffer) -> Double {
    let timestamp = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
    if timestamp.isValid {
      return CMTimeGetSeconds(timestamp) * 1000
    }
    return Date().timeIntervalSince1970 * 1000
  }
}
