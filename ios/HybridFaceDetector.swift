import Foundation
import NitroModules

final class HybridFaceDetector: HybridFaceDetectorSpec_base, HybridFaceDetectorSpec_protocol {
  func configure(options: FaceDetectorOptions) throws {
    _ = options
  }
}
