// https://github.com/react-native-community/cli/blob/main/docs/dependencies.md

module.exports = {
  dependency: {
    platforms: {
      ios: {},
      android: {
        sourceDir: './android',
        packageImportPath:
          'import com.margelo.nitro.facedetector.VisionCameraFaceDetectorPackage;',
        packageInstance: 'new VisionCameraFaceDetectorPackage()',
      },
    },
  },
};
