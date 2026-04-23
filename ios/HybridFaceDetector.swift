import AVFoundation
import CoreMedia
import Foundation
import ImageIO
@_exported import MLKitFaceDetection
import MLKitVision
import NitroModules
import UIKit
import VisionCamera

final class HybridFaceDetector: HybridFaceDetectorSpec_base, HybridFaceDetectorSpec_protocol {
  private var currentOptions: FaceDetectorOptions = FaceDetectorOptions(
    performanceMode: .fast,
    landmarkMode: .none,
    classificationMode: .none,
    contourMode: .none,
    minFaceSize: 0.15,
    enableTracking: false
  )

  private lazy var detectorRef: MLKitFaceDetection.FaceDetector = makeDetector(from: currentOptions)

  func configure(options: FaceDetectorOptions) throws {
    currentOptions = options
    detectorRef = makeDetector(from: options)
  }

  func detectFaces(frame: any HybridFrameSpec) throws -> [DetectedFace] {
    guard let nativeFrame = frame as? NativeFrame,
          let sampleBuffer = nativeFrame.sampleBuffer else {
      return []
    }

    let visionImage = VisionImage(buffer: sampleBuffer)
    visionImage.orientation = imageOrientation(from: sampleBuffer)

    let faces: [MLKitFaceDetection.Face]
    do {
      faces = try detectorRef.results(in: visionImage)
    } catch {
      return []
    }

    return faces.map { face in
      let rect = face.frame
      let trackingId = face.hasTrackingID ? Double(face.trackingID) : 0.0
      return DetectedFace(
        bounds: DetectedFaceBounds(
          x: Double(rect.origin.x),
          y: Double(rect.origin.y),
          width: Double(rect.size.width),
          height: Double(rect.size.height)
        ),
        trackingId: trackingId
      )
    }
  }

  private func makeDetector(from options: FaceDetectorOptions) -> MLKitFaceDetection.FaceDetector {
    let mlOptions = MLKitFaceDetection.FaceDetectorOptions()
    mlOptions.performanceMode = options.performanceMode == .accurate ? .accurate : .fast
    mlOptions.landmarkMode = options.landmarkMode == .all ? .all : .none
    mlOptions.classificationMode = options.classificationMode == .all ? .all : .none
    mlOptions.contourMode = options.contourMode == .all ? .all : .none
    mlOptions.minFaceSize = CGFloat(options.minFaceSize)
    mlOptions.isTrackingEnabled = options.enableTracking
    return MLKitFaceDetection.FaceDetector.faceDetector(options: mlOptions)
  }

  private func imageOrientation(from sampleBuffer: CMSampleBuffer) -> UIImage.Orientation {
    let attachments = CMGetAttachment(sampleBuffer, key: kCGImagePropertyOrientation, attachmentModeOut: nil) as? UInt32
    guard let raw = attachments, let cgOrientation = CGImagePropertyOrientation(rawValue: raw) else {
      return .up
    }
    switch cgOrientation {
    case .up: return .up
    case .upMirrored: return .upMirrored
    case .down: return .down
    case .downMirrored: return .downMirrored
    case .left: return .left
    case .leftMirrored: return .leftMirrored
    case .right: return .right
    case .rightMirrored: return .rightMirrored
    }
  }
}
