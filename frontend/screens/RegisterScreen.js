import { useState, useRef, useEffect } from 'react';
import { View, Text, Button, TextInput, ActivityIndicator, StyleSheet, TouchableOpacity, Modal, Pressable, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { CameraView } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/core';
import Toast from 'react-native-toast-message';
import api from "../api";

export default function RegisterScreen() {
  const [facing, setFacing] = useState('front');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const cameraRef = useRef(null);
  const [flash, setFlash] = useState('off');
  const [voice, setVoice] = useState(1); // default value 1
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [zoom, setZoom] = useState(0); // actual camera zoom
  const [sliderZoom, setSliderZoom] = useState(0); // UI slider value
  const [showCamera, setShowCamera] = useState(false); // for delayed camera mount
  const zoomTimeout = useRef();
  const [timer, setTimer] = useState(0); // retardataire seconds (0 = no timer)
  const [countdown, setCountdown] = useState(0); // current countdown
  const [showTimerOptions, setShowTimerOptions] = useState(false);
  const timerAnim = useRef(new Animated.Value(0)).current;
  const formattedName = username
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  const navigation = useNavigation();
  const isFocused = useIsFocused();

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
            handleCaptureAndSend();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } else {
      handleCaptureAndSend();
    }
  };

  const handleCaptureAndSend = async () => {
    setIsLoading(true);
    try {
      if (!cameraRef.current) {
        throw new Error("La caméra n'est pas prête.");
      }

      if (!formattedName || formattedName.length < 2) {
        setIsLoading(false);
        Toast.show({
          type: 'error',
          text1: '❌ Prénom non spécifier!',
          text2: '❌ Choisir un voix!',
          position: 'top',
        });
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({ shutterSound: false, skipProcessing: true, quality: 1 });

      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'student.jpg',
      });
      formData.append('name', formattedName);
      formData.append('voice', voice);

      const response = await api.post("/v2/register", formData);

      if (response.data.status === 'errorAdmin') {
        Toast.show({
          type: 'error',
          text1: '❌ ' + response.data.message,
          position: 'top',
        });

        await SecureStore.deleteItemAsync("accessToken");

        navigation.reset({
          index: 0,
          routes: [
            { 
              name: "Auth",
            },
          ],
        });
      }

      const { status, message } = response.data;

      if (status === 'success') {
        Toast.show({
          type: 'success',
          text1: '✅ ' + message,
          position: 'top',
          visibilityTime: 4000,
          topOffset: 60,
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
      setIsLoading(false); // ✅ always reset
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Show typed username in the screen */}
      {username.length > 0 && (
        <View style={styles.centeredTextOverlay}>
          <Text style={styles.centeredText}>{username}</Text>
        </View>
      )}
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
            style={styles.camera}
            ref={cameraRef}
            facing={facing}
            enableTorch={flash === 'torch'}
            flash={flash}
            zoom={zoom}
            ratio="4:3" 
          />
        </View>
      )}

      {/* Top Controls Row */}
      <View style={styles.topControls}>
        {/* Arrow-down button for dropdown and voice value */}
        <TouchableOpacity style={styles.iconButton} onPress={() => setDropdownVisible(true)} disabled={isLoading || countdown > 0}>
          <MaterialCommunityIcons name="chevron-down" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.voiceValue}>{voice !== 5 ? voice : "P.E"}</Text>
        {/* Dropdown modal */}
        <Modal
          transparent
          visible={dropdownVisible}
          animationType="fade"
          onRequestClose={() => setDropdownVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setDropdownVisible(false)} disabled={isLoading || countdown > 0}>
            <View style={styles.dropdownMenu}>
              {[1,2,3,4,5].map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.dropdownItem, v === voice && styles.dropdownItemSelected]}
                  onPress={() => { setVoice(v); setDropdownVisible(false); }}
                >
                  <Text style={{ color: v === voice ? '#1e90ff' : '#fff', fontWeight: v === voice ? 'bold' : 'normal' }}>{v !== 5 ? v : 'P.E'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Modal>
        <TextInput
          style={styles.topInput}
          placeholder="Prénom..."
          placeholderTextColor="#ccc"
          value={username}
          onChangeText={setUsername}
        />
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
        <TouchableOpacity style={styles.iconButton} onPress={toggleCameraFacing} disabled={isLoading || countdown > 0}>
          <MaterialCommunityIcons name="camera-flip" size={20} color="#fff" />
        </TouchableOpacity>
        {/* Timer button */}
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
      {/* Shutter Button */}
      <TouchableOpacity
        style={styles.shutterButton}
        onPress={handleShutterPress}
        disabled={isLoading || countdown > 0}
      >
        <MaterialCommunityIcons name="camera" size={40} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navButton} disabled={isLoading || countdown > 0} onPress={() => navigation.navigate('Présence')}>
        <MaterialCommunityIcons name="robot" size={20} color="#fff" />
      </TouchableOpacity>
      {/* Fullscreen Loading Spinner */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centeredTextOverlay: {
    position: 'absolute',
    top: 100, left: 0, right: 0, bottom: 0,
    zIndex: 50,
    pointerEvents: 'none',
  },
  centeredText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
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
  voiceValue: {
    color: '#fff',
    fontSize: 16,
    marginHorizontal: 2,
    minWidth: 18,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  topControls: {
    position: 'absolute',
    top: 1,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  topInput: {
    flex: 1,
    marginHorizontal: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#00000088',
    color: '#fff',
    borderRadius: 10,
    borderColor: '#fff',
    borderWidth: 1,
    fontSize: 14,
  },
  flashButton: {
    backgroundColor: '#00000088',
    padding: 10,
    marginRight:5,
    borderRadius: 30,
  },
  iconButton: {
    backgroundColor: '#00000088',
    padding: 10,
    borderRadius: 30,
    marginRight: 5,
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
  navButton: {
    position: 'absolute',
    bottom: 60,
    right: 10,
    alignSelf: 'center',
    backgroundColor: '#00000088',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
  },
  dropdownMenu: {
    backgroundColor: '#222',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    minWidth: 80,
    elevation: 10,
    marginTop: 60,
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  dropdownItemSelected: {
    backgroundColor: '#fff2',
    borderRadius: 8,
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
  crudButton: {
    position: 'absolute',
    bottom: 250,
    right: 10,
    alignSelf: 'center',
    backgroundColor: '#00000088',
    padding: 18,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
});
