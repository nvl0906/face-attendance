import { useState, useRef, useEffect, use } from 'react';
import { View, Text, TextInput, ActivityIndicator, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { CameraView } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/core';
import Toast from 'react-native-toast-message';
import api from "../api";
import useUserStore from "../stores/useUserStore";

export default function PresenceScreen() {
  const isadmin = useUserStore((s)=>s.isadmin);
  const lat = useUserStore((s) => s.lat);
  const long = useUserStore((s) => s.long);
  const [facing, setFacing] = useState('front');
  const [emplacement, setEmplacement] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [flash, setFlash] = useState('off');
  const [zoom, setZoom] = useState(0);
  const [sliderZoom, setSliderZoom] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [timer, setTimer] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const zoomTimeout = useRef();
  const cameraRef = useRef(null);
  const navigation = useNavigation();
  const [showTimerOptions, setShowTimerOptions] = useState(false);
  const timerAnim = useRef(new Animated.Value(0)).current;
  
  const isFocused = useIsFocused();
  const formattedEmplacement = emplacement
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const get_sup_emplacement = async () => {
       try {
        const response = await api.get('/v2/emplacement');
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
        return response.data.sup_emplacement;
      } catch (err) {
        if (err.status === 530 || err.status === 502) {
          Toast.show({
            type: 'error',
            text1: '❌ SERVEUR INDISPONIBLE!',
            text2: '❌ Veuillez réessayer ultérieurement!',
            position: 'top',
          });
        }
      }
  }

  const fetchSupEmplacement = async () => {
    const sup_emplacement = await get_sup_emplacement();
    if (sup_emplacement) {
      setEmplacement(sup_emplacement);
    }
  };

  const postgps = async () => {
    try {
      const formData = new FormData();
      formData.append('latitude', parseFloat(lat));
      formData.append('longitude', parseFloat(long)); 
      const response = await api.post('/v2/gps', formData);
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
      const {message} = response.data
      Toast.show({
        type: 'success',
        text1: '✅ ' + message,
        visibilityTime: 3000,
        position: 'top',
        autoHide: true,
        topOffset: 60,
      });
    } catch (err) {
      if (err.status === 530 || err.status === 502) {
        Toast.show({
          type: 'error',
          text1: '❌ SERVEUR INDISPONIBLE!',
          text2: '❌ Veuillez réessayer ultérieurement!',
          position: 'top',
        });
      }
    }
  };

  useEffect(() => {
    if (isadmin == true && lat != 0 && long != 0) {
      postgps();
      fetchSupEmplacement();
    }
    else if (lat == 0 && long == 0) {
      navigation.navigate("Localisation");
    }
  }, []);

  useEffect(() => {
    if (isadmin == false && lat != 0 && long != 0) {
      fetchSupEmplacement();
    }
    else if (lat == 0 && long == 0) {
      navigation.navigate("Localisation");
    }
  }, []);

  useEffect(() => {
    let timeout;
    if (isFocused == true) {
      timeout = setTimeout(() => setShowCamera(true), 20);
    } else if (isFocused == false) {
      setShowCamera(false);
    }
    return () => clearTimeout(timeout);
  }, [isFocused]);

  useEffect(() => {
    if (zoomTimeout.current) clearTimeout(zoomTimeout.current);
    zoomTimeout.current = setTimeout(() => {
      setZoom(sliderZoom);
    }, 100);
    return () => clearTimeout(zoomTimeout.current);
  }, [sliderZoom]);

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

  useEffect(() => {
    let timeout;
    if (showTimerOptions) {
      timeout = setTimeout(() => setShowTimerOptions(false), 2000);
    }
    return () => clearTimeout(timeout);
  }, [showTimerOptions]);

  useEffect(() => {
    if (formattedEmplacement.length > 2) {
      setShowLive(true);
    } else {
      setShowLive(false);
    }
  }, [formattedEmplacement]);

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

  const handleCaptureAndSend = async () => {
    setIsLoading(true);
    try {
      if (!cameraRef.current) throw new Error("Camera is not ready.");
      if (!formattedEmplacement || formattedEmplacement.length < 2) {
        setIsLoading(false)
        Toast.show({
          type: 'error',
          text1: '❌ Veuillez entrer votre emplacement actuel svp!',
          position: 'top',
        });
        return;
      }
      if (emplacement === "aucun") {
        setIsLoading(false)
        Toast.show({
          type: 'error',
          text1: "❌ Aucune présence pour aujourd'hui!",
          position: 'top',
        });
        return;
      }
      const photo = await cameraRef.current.takePictureAsync({ shutterSound: false, quality: 0.1, skipProcessing: false });
      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'student.jpg',
      });
      formData.append('emplacement', formattedEmplacement);
      formData.append('latitude', lat);
      formData.append('longitude', long);
      const response = await api.post("/v2/recognize", formData);
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
      const { status, message, user_profile } = response.data;
      if (status === 'success') {
        navigation.navigate('Result', {
          user_profile: user_profile || {},
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
          text1: '❌ SERVEUR INDISPONIBLE!',
          text2: '❌ Veuillez réessayer ultérieurement!',
          position: 'top',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <SafeAreaView style={styles.container}>
      {emplacement.length > 0 && (
        <View style={styles.centeredTextOverlay}>
          <Text style={styles.centeredText}>{emplacement}</Text>
        </View>
      )}
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
        { isadmin && (<TextInput
          style={styles.topInput}
          placeholder="Emplacement..."
          placeholderTextColor="#ccc"
          value={emplacement}
          onChangeText={setEmplacement}
          editable={countdown === 0 && !isLoading}
        />)}
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
        <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing} disabled={isLoading || countdown > 0}>
          <MaterialCommunityIcons name="camera-flip" size={20} color="#fff" />
        </TouchableOpacity>
        {/* Timer button */}
        <TouchableOpacity
          style={ styles.timerButton}
          onPress={() => setShowTimerOptions((v) => !v)}
          disabled={isLoading || countdown > 0}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', width: 25, textAlign: 'center'}}>{`${timer}s`}</Text>
        </TouchableOpacity>
      </View>
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
      { lat != 0 && (<TouchableOpacity
        style={styles.shutterButton}
        onPress={handleShutterPress}
        disabled={isLoading || countdown > 0}
      >
        <MaterialCommunityIcons name="camera" size={40} color="#fff" />
      </TouchableOpacity>)}
      { showLive && isadmin && emplacement && 
      (
        <TouchableOpacity 
          style={styles.liveButton} 
          disabled={isLoading || countdown > 0} 
          onPress={() => navigation.navigate("Live", { formattedEmplacement })}
        >
          <MaterialCommunityIcons name="record-rec" size={20} color="#fff" />
        </TouchableOpacity>
    )}
      {isadmin && (
        <TouchableOpacity style={styles.distButton} disabled={isLoading || countdown > 0} onPress={() => navigation.navigate('Dist')}>
          <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
        </TouchableOpacity>
      )}
      {isadmin && (
        <TouchableOpacity style={styles.navButton} disabled={isLoading || countdown > 0} onPress={() => navigation.navigate('Ajout')}>
          <MaterialCommunityIcons name="account-plus" size={20} color="#fff" />
        </TouchableOpacity>
      )}
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
    top: 50, left: 0, right: 0, bottom: 0,
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
    aspectRatio: 3 / 4,
    overflow: 'hidden',
    borderRadius: 12,
  },
  camera: {
    flex: 1,
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
  flipButton: {
    backgroundColor: '#00000088',
    padding: 10,
    borderRadius: 30,
  },
  timerButton: {
    backgroundColor: '#00000088',
    padding: 10,
    borderRadius: 30,
    marginLeft: 5,
  },
  captureButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  captureText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
  distButton: {
    position: 'absolute',
    bottom: 160,
    right: 10,
    alignSelf: 'center',
    backgroundColor: '#00000088',
    padding: 18,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  liveButton: {
    position: 'absolute',
    bottom: 60,
    left: 10,
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
  }
});