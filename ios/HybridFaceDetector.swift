import AVFoundation
import CoreMedia
import Foundation
import ImageIO
import NitroModules
import Vision
import VisionCamera

final class HybridFaceDetector: HybridFaceDetectorSpec_base, HybridFaceDetectorSpec_protocol {
  func configure(options: FaceDetectorOptions) throws {
    _ = options
  }

  func detectFaces(frame: any HybridFrameSpec) throws -> [DetectedFace] {
    guard let nativeFrame = frame as? NativeFrame,
          let sampleBuffer = nativeFrame.sampleBuffer,
          let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
      return []
    }

    let request = VNDetectFaceRectanglesRequest()
    let handler = VNImageRequestHandler(
      cvPixelBuffer: pixelBuffer,
      orientation: imageOrientation(from: sampleBuffer),
      options: [:]
    )

    do {
      try handler.perform([request])
    } catch {
      return []
    }

    let imageSize = orientedImageSize(for: pixelBuffer, orientation: imageOrientation(from: sampleBuffer))
    return (request.results ?? []).map { observation in
      let rect = pixelRect(from: observation.boundingBox, imageSize: imageSize)
      return DetectedFace(
        bounds: DetectedFaceBounds(
          x: Double(rect.origin.x),
          y: Double(rect.origin.y),
          width: Double(rect.size.width),
          height: Double(rect.size.height)
        ),
        trackingId: 0.0
      )
    }
  }

  private func orientedImageSize(for pixelBuffer: CVPixelBuffer, orientation: CGImagePropertyOrientation) -> CGSize {
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
    let attachments = CMGetAttachment(sampleBuffer, key: kCGImagePropertyOrientation, attachmentModeOut: nil) as? UInt32
    guard let raw = attachments, let cgOrientation = CGImagePropertyOrientation(rawValue: raw) else {
      return .up
    }
    return cgOrientation
  }
}
