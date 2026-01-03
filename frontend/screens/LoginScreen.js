import { useState, useRef, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { CameraView } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/core';
import Toast from 'react-native-toast-message';
import api from "../api";
import * as SecureStore from 'expo-secure-store';
import useUserStore from "../stores/useUserStore";

export default function LoginScreen() {
  const setIsadmin = useUserStore((s)=>s.setIsadmin);
  const [facing, setFacing] = useState('front');
  const [isLoading, setIsLoading] = useState(false);
  const [flash, setFlash] = useState('off');
  const [zoom, setZoom] = useState(0);
  const [sliderZoom, setSliderZoom] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const zoomTimeout = useRef();
  const cameraRef = useRef(null);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [timer, setTimer] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [showTimerOptions, setShowTimerOptions] = useState(false);
  const timerAnim = useRef(new Animated.Value(0)).current;

  // Delay camera mount after focus to avoid black screen
  useEffect(() => {
    let timeout;

    if (isFocused == true) {
      timeout = setTimeout(() => setShowCamera(true), 20);
    } else if (isFocused == false) {
      setShowCamera(false);
    }
    return () => clearTimeout(timeout);
  }, [isFocused]);

  // Debounce slider -> zoom
  useEffect(() => {
    if (zoomTimeout.current) clearTimeout(zoomTimeout.current);
    zoomTimeout.current = setTimeout(() => {
      setZoom(sliderZoom);
    }, 100);
    return () => clearTimeout(zoomTimeout.current);
  }, [sliderZoom]);

  // Animate timer options in/out
  useEffect(() => {
    if (showTimerOptions) {
      Animated.timing(timerAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp),
      }).start();
    } else {
      Animated.timing(timerAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.exp),
      }).start();
    }
  }, [showTimerOptions, timerAnim]);

  // Auto-hide timer options after 2 seconds
  useEffect(() => {
    let timeout;
    if (showTimerOptions) {
      timeout = setTimeout(() => setShowTimerOptions(false), 2000);
    }
    return () => clearTimeout(timeout);
  }, [showTimerOptions]);


  const toggleFlash = () => {
    setFlash((prev) => {
      if (prev === 'off') return 'on';
      if (prev === 'on') return 'auto';
      if (prev === 'auto') return 'torch';
      return 'off';
    });
  };

  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  // Timer/retardataire shutter logic
  const handleShutterPress = () => {
    if (timer > 0) {
      setCountdown(timer);
      const interval = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(interval);
            handleLogin();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      handleLogin();
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      if (!cameraRef.current) throw new Error("Camera is not ready.");

      const photo = await cameraRef.current.takePictureAsync({ shutterSound: false, skipProcessing: true, quality: 1 });

      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'student.jpg',
      });

      const response = await api.post("/v2/login", formData);

      const { status, message, access_token } = response.data;

      if (status === 'successadmin') {
        Toast.show({
          type: 'success',
          text1: '✅ ' + message,
          visibilityTime: 3000,
          position: 'top',
          autoHide: true,
          topOffset: 60,
        });
        await SecureStore.setItemAsync("accessToken", access_token);
        setIsadmin(true);
        navigation.reset({
          index: 0,
          routes: [{ name: "Auth" }]
        });

      } else if (status === 'successmember') {
        Toast.show({
          type: 'success',
          text1: '✅ ' + message,
          visibilityTime: 3000,
          position: 'top',
          autoHide: true,
          topOffset: 60,
        });
        await SecureStore.setItemAsync("accessToken", access_token);
        setIsadmin(false);
        navigation.reset({
          index: 0,
          routes: [{ name: "Auth" }]
        });

      } else if (status === 'error') {
        Toast.show({
          type: 'error',
          text1: '❌ ' + message,
          position: 'top',
        });
      } 
    } catch (err) {
      if (err.status === 530 || err.status === 502) {
        Toast.show({
          type: 'error',
          text1: '❌ Désolé! Le serveur est actuellement indisponible!',
          text2: '❌ Veuillez réessayer plus tard!',
          position: 'top',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
          {/* Countdown overlay */}
          {countdown > 0 && (
            <View style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              justifyContent: 'center', alignItems: 'center', zIndex: 100,
            }}>
              <Text style={{ fontSize: 80, color: '#fff', fontWeight: 'bold' }}>{countdown}</Text>
            </View>
          )}

          {showCamera && (
            <View style={styles.cameraContainer}>
              <CameraView
                style={StyleSheet.absoluteFill}
                ref={cameraRef}
                facing={facing}
                enableTorch={flash === 'torch'}
                flash={flash}
                zoom={zoom}
                ratio="4:3" 
              />
            </View>
          )}

          {/* Zoom Slider */}
          <View style={styles.zoomContainer}>
            <MaterialCommunityIcons name="magnify-minus-outline" size={18} color="#fff" />
            <Slider
              style={styles.zoomSlider}
              minimumValue={0}
              maximumValue={1}
              value={sliderZoom}
              onValueChange={setSliderZoom}
              minimumTrackTintColor="#1e90ff"
              maximumTrackTintColor="#fff"
              thumbTintColor="#1e90ff"
            />
            <MaterialCommunityIcons name="magnify-plus-outline" size={18} color="#fff" />
          </View>
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.flashButton} onPress={toggleFlash} disabled={isLoading || countdown > 0}>
              <MaterialCommunityIcons
                name={
                  flash === 'off'
                    ? 'flash-off'
                    : flash === 'on'
                    ? 'flash'
                    : flash === 'auto'
                    ? 'flash-auto'
                    : 'flashlight'
                }
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
            
            {/*}
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing} disabled={isLoading || countdown > 0}>
              <MaterialCommunityIcons name="camera-flip" size={20} color="#fff" />
            </TouchableOpacity>
            */}

            <TouchableOpacity
              style={styles.timerButton}
              onPress={() => setShowTimerOptions((v) => !v)}
              disabled={isLoading || countdown > 0}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', width: 25, textAlign: 'center'}}>{`${timer}s`}</Text>
            </TouchableOpacity>
          </View>

          {/* Animated Timer/retardataire buttons */}
          <Animated.View
            pointerEvents={showTimerOptions ? 'auto' : 'none'}
            style={[
              styles.animatedTimerOptions,
              {
                opacity: timerAnim,
                transform: [
                  {
                    translateY: timerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-30, 0],
                    }),
                  },
                  {
                    scale: timerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {[0, 3, 5, 10].map((t) => (
              <TouchableOpacity
                key={t}
                style={{
                  backgroundColor: timer === t ? '#1e90ff' : '#00000088',
                  padding: 10,
                  borderRadius: 20,
                  marginHorizontal: 5,
                  minWidth: 40,
                  alignItems: 'center',
                }}
                onPress={() => setTimer(t)}
                disabled={isLoading || countdown > 0}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t === 0 ? '⏱️' : `${t}s`}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>

          <TouchableOpacity
            style={styles.shutterButton}
            onPress={handleShutterPress}
            disabled={isLoading || countdown > 0}
          >
            <MaterialCommunityIcons name="camera" size={40} color="#fff" />
          </TouchableOpacity>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  zoomContainer: {
    position: 'absolute',
    bottom: 120,
    left: 30,
    right: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  zoomSlider: {
    flex: 1,
    marginHorizontal: 10,
    height: 40,
  },
  container: {
    flex: 1,
    paddingTop: 10,
    backgroundColor: '#000',
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 3 / 4,     // ✅ 4:3 ratio (width:height)
    overflow: 'hidden',
    borderRadius: 12,       // optional
  },
  camera: {
    flex: 1,
  },
  topControls: {
    position: 'absolute',
    top: 50,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  topInput: {
    flex: 1,
    marginHorizontal: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#00000088',
    color: '#fff',
    borderRadius: 10,
    fontSize: 14,
  },
  flashButton: {
    backgroundColor: '#00000088',
    padding: 10,
    marginRight:5,
    borderRadius: 30,
  },
  flipButton: {
    backgroundColor: '#00000088',
    padding: 10,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerButton: {
    backgroundColor: '#00000088',
    padding: 10,
    borderRadius: 30,
    marginLeft: 5,
  },
  shutterButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: '#1e90ff',
    padding: 18,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 20,
  },
  animatedTimerOptions: {
    position: 'absolute',
    top: 100,
    right: 10,
    left: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.0)',
  },
});