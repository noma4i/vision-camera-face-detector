// https://github.com/react-native-community/cli/blob/main/docs/dependencies.md

module.exports = {
  dependency: {
    platforms: {
      ios: null,
      android: {
        sourceDir: './android',
        packageImportPath:
          'import com.noma4i.visioncamerafacedetector.VisionCameraFaceDetectorPackage;',
        packageInstance: 'new VisionCameraFaceDetectorPackage()',
      },
    },
  },
};
