require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "VisionCameraFaceDetector"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/noma4i/vision-camera-face-detector"
  s.license      = package["license"]
  s.authors      = "noma4i"

  s.platforms    = { :ios => '15.5' }
  s.source       = { :git => "https://github.com/noma4i/vision-camera-face-detector.git", :tag => "#{s.version}" }

  s.source_files = [
    "ios/**/*.{swift,h,m,mm}"
  ]

  s.pod_target_xcconfig = {
    "SWIFT_VERSION" => "5.0",
    "SWIFT_COMPILATION_MODE" => "wholemodule",
    "DEFINES_MODULE" => "YES",
    "PRODUCT_MODULE_NAME" => "VisionCameraFaceDetector"
  }

  s.dependency "React-Core"
  s.dependency "VisionCamera"
  s.dependency "GoogleMLKit/FaceDetection", "~> 7.0"

  load File.join(__dir__, 'nitrogen/generated/ios/VisionCameraFaceDetector+autolinking.rb')
  add_nitrogen_files(s)

  install_modules_dependencies(s)
end
