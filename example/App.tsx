import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useCameraPermission } from 'react-native-vision-camera';
import FaceDetectorDemo from './src/screens/FaceDetectorDemo';
import { COLORS, THEME } from './src/theme';

type Screen = 'home' | 'camera' | 'preview';

function App() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [requested, setRequested] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (hasPermission || requested) return;
    setRequested(true);
    requestPermission();
  }, [hasPermission, requested, requestPermission]);

  const openCamera = useCallback(() => setScreen('camera'), []);
  const goHome = useCallback(() => {
    setScreen('home');
    setPhotoUri(null);
  }, []);

  const handleCapture = useCallback((uri: string) => {
    setPhotoUri(uri.startsWith('file://') ? uri : `file://${uri}`);
    setScreen('preview');
  }, []);

  const retryPermission = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
      Alert.alert(
        'Camera permission required',
        'Please enable camera access in Settings to try the face detector.'
      );
    }
  }, [requestPermission]);

  let content: React.ReactNode;
  if (!hasPermission && !requested) {
    content = (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.white} />
      </View>
    );
  } else if (!hasPermission) {
    content = (
      <View style={styles.center}>
        <Text style={styles.title}>Camera access denied</Text>
        <Text style={styles.subtitle}>Grant camera permission to try the demo.</Text>
        <Pressable onPress={retryPermission} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  } else if (screen === 'camera') {
    content = <FaceDetectorDemo onCapture={handleCapture} onClose={goHome} />;
  } else if (screen === 'preview' && photoUri) {
    content = (
      <View style={styles.center}>
        <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        <Pressable onPress={goHome} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Take another</Text>
        </Pressable>
      </View>
    );
  } else {
    content = (
      <View style={styles.center}>
        <Text style={styles.title}>@noma4i/vision-camera-face-detector</Text>
        <Text style={styles.subtitle}>MLKit face detection + framing guide demo.</Text>
        <Pressable onPress={openCamera} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Open camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />
      <View style={styles.root}>{content}</View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.black
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16
  },
  title: {
    ...THEME.body,
    ...THEME.semibold,
    color: COLORS.white,
    textAlign: 'center'
  },
  subtitle: {
    ...THEME.fontSize13,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.7
  },
  primaryButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: COLORS.success
  },
  primaryButtonText: {
    ...THEME.body,
    ...THEME.semibold,
    color: COLORS.black
  },
  preview: {
    width: 240,
    height: 320,
    borderRadius: 16,
    backgroundColor: '#222'
  }
});

export default App;
