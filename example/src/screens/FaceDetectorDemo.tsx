import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  BackHandler,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AppStateStatus,
  useWindowDimensions
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, usePhotoOutput } from 'react-native-vision-camera';
import { useFaceDetector } from '@noma4i/vision-camera-face-detector';
import OverlayButton from '../components/OverlayButton';
import { COLORS, THEME } from '../theme';
import { logger } from '../utils/logger';
import { getPhotoGuideLayout } from '../utils/photoGuide';
import { isAndroid } from '../utils/platform';
import type { FaceDetectorDemoProps } from '../types';

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

const getPortraitSize = (width: number, height: number) => ({
  width: Math.min(width, height),
  height: Math.max(width, height)
});

const FaceDetectorDemo: React.FC<FaceDetectorDemoProps> = ({ onCapture, onClose }) => {
  const device = useCameraDevice('front');
  const window = useWindowDimensions();
  const photoOutput = usePhotoOutput(SELFIE_PHOTO_OUTPUT_OPTIONS);
  const insets = useSafeAreaInsets();
  const [layoutSize, setLayoutSize] = useState(() => getPortraitSize(window.width, window.height));
  const guideLayout = useMemo(
    () => getPhotoGuideLayout(layoutSize.width, layoutSize.height),
    [layoutSize.height, layoutSize.width]
  );
  const closeButtonStyle = useMemo(() => [styles.closeButton, { top: 16 + insets.top }], [insets.top]);
  const bottomSectionStyle = useMemo(
    () => [styles.bottomSection, { paddingBottom: 40 + insets.bottom }],
    [insets.bottom]
  );
  const guide = useMemo(
    () => ({
      shape: 'circle' as const,
      units: 'px' as const,
      centerX: guideLayout.frameLeft + guideLayout.frameSize * 0.5,
      centerY: guideLayout.frameTop + guideLayout.frameSize * 0.5,
      size: guideLayout.frameSize,
      tolerancePx: 40
    }),
    [guideLayout.frameLeft, guideLayout.frameSize, guideLayout.frameTop]
  );
  const face = useFaceDetector({
    preset: 'selfie',
    preview: { width: layoutSize.width, height: layoutSize.height },
    outputs: photoOutput,
    guide
  });
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCaptureHandoffInFlight, setIsCaptureHandoffInFlight] = useState(false);
  const [isCameraStarted, setIsCameraStarted] = useState(false);
  const isActive = appState === 'active' && !isCaptureHandoffInFlight;
  const isGuideReady = face.ready;
  const isCaptureDisabled =
    !isCameraStarted || !isGuideReady || isCapturing || isCaptureHandoffInFlight;

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

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const nextSize = getPortraitSize(width, height);
    setLayoutSize((currentSize) => (
      currentSize.width === nextSize.width && currentSize.height === nextSize.height
        ? currentSize
        : nextSize
    ));
  }, []);

  const handleCameraStarted = useCallback(() => {
    logger.info(COMPONENT_NAME, 'Camera started');
    setIsCameraStarted(true);
  }, []);

  const handleCameraError = useCallback((error: unknown) => {
    logger.error(COMPONENT_NAME, 'Camera error', error);
  }, []);

  const handleTakePhoto = useCallback(async () => {
    if (!isCameraStarted || !isGuideReady || isCapturing || isCaptureHandoffInFlight) {
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
  }, [
    isCameraStarted,
    isCaptureHandoffInFlight,
    isCapturing,
    isGuideReady,
    onCapture,
    photoOutput
  ]);

  const captureButtonStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.captureButton,
      pressed && styles.captureButtonPressed,
      isCaptureDisabled && styles.captureButtonDisabled
    ],
    [isCaptureDisabled]
  );

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      {device ? (
        <Camera
          {...face.camera}
          style={StyleSheet.absoluteFill}
          device={device}
          constraints={SELFIE_CAMERA_CONSTRAINTS}
          isActive={isActive}
          mirrorMode="on"
          onStarted={handleCameraStarted}
          onError={handleCameraError}
        />
      ) : (
        <View style={styles.deviceFallback}>
          <Text style={styles.fallbackText}>Front camera not available</Text>
        </View>
      )}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View
          style={[
            styles.outerFrameOverlay,
            {
              borderColor: isGuideReady
                ? `${GUIDE_READY_BORDER_COLOR}7A`
                : `${GUIDE_IDLE_BORDER_COLOR}7A`
            }
          ]}
        />

        <View
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

      <OverlayButton buttonStyle={closeButtonStyle} onPress={onClose} accessibilityLabel="Close">
        <Text style={styles.closeIcon}>×</Text>
      </OverlayButton>

      <View style={bottomSectionStyle}>
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
            style={[styles.captureButtonInner, isGuideReady && styles.captureButtonInnerReady]}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
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
  closeButton: {
    left: 16
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
