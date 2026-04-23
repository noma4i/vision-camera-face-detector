import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  BackHandler,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AppStateStatus
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, usePhotoOutput } from 'react-native-vision-camera';
import OverlayButton from '../components/OverlayButton';
import { useSelfieFaceGuide } from '../hooks/useSelfieFaceGuide';
import { COLORS, THEME } from '../theme';
import { logger } from '../utils/logger';
import { getPhotoGuideLayout } from '../utils/photoGuide';
import { isAndroid } from '../utils/platform';
import type { FaceDetectorDemoProps } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const GUIDE_READY_BORDER_COLOR = COLORS.success;
const GUIDE_IDLE_BORDER_COLOR = COLORS.white;
const COMPONENT_NAME = 'FaceDetectorDemo';

const HAPTIC_OPTIONS = { enableVibrateFallback: true, ignoreAndroidSystemSettings: false };

const SELFIE_PHOTO_OUTPUT_OPTIONS = {
  targetResolution: { width: 1080, height: 1920 },
  quality: 0.9,
  qualityPrioritization: 'balanced' as const
};

const SELFIE_CAMERA_CONSTRAINTS = [{ fps: 30 }];

const FaceDetectorDemo: React.FC<FaceDetectorDemoProps> = ({ onCapture, onClose }) => {
  const device = useCameraDevice('front');
  const photoOutput = usePhotoOutput(SELFIE_PHOTO_OUTPUT_OPTIONS);
  const insets = useSafeAreaInsets();
  const guideLayout = useMemo(() => getPhotoGuideLayout(SCREEN_WIDTH, SCREEN_HEIGHT), []);
  const { guideStatus, frameOutput } = useSelfieFaceGuide({
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT
  });
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCaptureHandoffInFlight, setIsCaptureHandoffInFlight] = useState(false);
  const [isCameraStarted, setIsCameraStarted] = useState(false);
  const isActive = appState === 'active' && !isCaptureHandoffInFlight;
  const isGuideReady = guideStatus === 'ready';
  const isCaptureDisabled = !isCameraStarted || isCapturing || isCaptureHandoffInFlight;

  const outputs = useMemo(
    () => (frameOutput ? [photoOutput, frameOutput] : [photoOutput]),
    [photoOutput, frameOutput]
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', setAppState);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isGuideReady) {
      ReactNativeHapticFeedback.trigger('impactLight', HAPTIC_OPTIONS);
    }
  }, [isGuideReady]);

  useEffect(() => {
    if (!isAndroid) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  const handleCameraStarted = useCallback(() => {
    logger.info(COMPONENT_NAME, 'Camera started');
    setIsCameraStarted(true);
  }, []);

  const handleCameraError = useCallback((error: unknown) => {
    logger.error(COMPONENT_NAME, 'Camera error', error);
  }, []);

  const handleTakePhoto = useCallback(async () => {
    if (!isCameraStarted || isCapturing || isCaptureHandoffInFlight) {
      return;
    }
    setIsCapturing(true);

    try {
      const photo = await photoOutput.capturePhoto(
        { flashMode: 'off', enableShutterSound: false, enableRedEyeReduction: true },
        {}
      );
      const path = await photo.saveToTemporaryFileAsync();
      photo.dispose();
      setIsCaptureHandoffInFlight(true);
      setIsCapturing(false);
      await onCapture(path);
    } catch (error) {
      setIsCapturing(false);
      setIsCaptureHandoffInFlight(false);
      logger.error(COMPONENT_NAME, 'Failed to capture selfie photo', error);
    }
  }, [isCameraStarted, isCaptureHandoffInFlight, isCapturing, onCapture, photoOutput]);

  const captureButtonStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.captureButton,
      pressed && styles.captureButtonPressed,
      isCaptureDisabled && styles.captureButtonDisabled
    ],
    [isCaptureDisabled]
  );

  return (
    <View style={styles.container}>
      {device ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          constraints={SELFIE_CAMERA_CONSTRAINTS}
          outputs={outputs}
          isActive={isActive}
          enableLowLightBoost={false}
          onStarted={handleCameraStarted}
          onError={handleCameraError}
        />
      ) : (
        <View style={styles.deviceFallback}>
          <Text style={styles.fallbackText}>Front camera not available</Text>
        </View>
      )}
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View
          pointerEvents="none"
          style={[
            styles.outerFrameOverlay,
            {
              borderColor: isGuideReady
                ? `${GUIDE_READY_BORDER_COLOR}7A`
                : `${GUIDE_IDLE_BORDER_COLOR}7A`
            }
          ]}
        />

        <OverlayButton
          buttonStyle={{ left: 16, top: 16 + insets.top }}
          onPress={onClose}
          accessibilityLabel="Close"
        >
          <Text style={styles.closeIcon}>×</Text>
        </OverlayButton>

        <View style={styles.centerSection}>
          <View
            pointerEvents="none"
            style={[
              styles.centerSquareFrame,
              {
                borderColor: isGuideReady
                  ? `${GUIDE_READY_BORDER_COLOR}7A`
                  : `${GUIDE_IDLE_BORDER_COLOR}7A`,
                width: guideLayout.centerSquareFrameSize,
                height: guideLayout.centerSquareFrameSize,
                top: guideLayout.centerSquareFrameTop,
                left: guideLayout.centerSquareFrameLeft
              }
            ]}
          />

          <View
            pointerEvents="none"
            style={[
              styles.circularFrame,
              {
                borderColor: isGuideReady ? GUIDE_READY_BORDER_COLOR : GUIDE_IDLE_BORDER_COLOR,
                width: guideLayout.frameSize,
                height: guideLayout.frameSize,
                borderRadius: guideLayout.frameRadius,
                top: guideLayout.frameTop,
                left: guideLayout.frameLeft
              }
            ]}
          >
            <Text style={styles.innerProfileText}>Profile Picture</Text>
          </View>
        </View>

        <View style={styles.bottomSection}>
          <Text style={[styles.guideMessage, isGuideReady && styles.guideMessageReady]}>
            {isGuideReady ? 'Perfect. Take the photo.' : 'Center one face inside the guide.'}
          </Text>

          <Pressable
            onPress={handleTakePhoto}
            style={captureButtonStyle}
            disabled={isCaptureDisabled}
            accessibilityLabel="Take photo"
          >
            <View
              style={[
                styles.captureButtonInner,
                isGuideReady && styles.captureButtonInnerReady
              ]}
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black
  },
  safeArea: {
    flex: 1
  },
  deviceFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fallbackText: {
    color: COLORS.white
  },
  centerSection: {
    flex: 1
  },
  outerFrameOverlay: {
    position: 'absolute',
    margin: 5,
    top: 5,
    bottom: 5,
    left: 5,
    right: 5,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16
  },
  centerSquareFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16
  },
  circularFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 30
  },
  innerProfileText: {
    ...THEME.fontSize13,
    ...THEME.semibold,
    color: COLORS.white,
    textAlign: 'center'
  },
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 24
  },
  guideMessage: {
    ...THEME.body,
    color: COLORS.white,
    textAlign: 'center'
  },
  guideMessageReady: {
    color: GUIDE_READY_BORDER_COLOR
  },
  closeIcon: {
    color: COLORS.white,
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '300'
  },
  captureButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center'
  },
  captureButtonPressed: {
    opacity: 0.8
  },
  captureButtonDisabled: {
    opacity: 0.5
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.white
  },
  captureButtonInnerReady: {
    backgroundColor: GUIDE_READY_BORDER_COLOR
  }
});

export default memo(FaceDetectorDemo);
