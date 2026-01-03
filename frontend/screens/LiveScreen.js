import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { CameraView } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/core';
import Toast from 'react-native-toast-message';
import * as SecureStore from 'expo-secure-store';

export default function LiveScreen({ route }) {
  const { formattedEmplacement } = route.params || {};
  const [facing, setFacing] = useState('front');
  const [isstarting, setIsstarting] = useState(false);
  const [newlymarked, setNewlymarked] = useState([]);
  const [users, setUsers] = useState([]);
  const [alreadymarked, setAlreadymarked] = useState([]);
  const ws = useRef(null);
  const zoomTimeout = useRef();
  const [sliderZoom, setSliderZoom] = useState(0);
  const cameraRef = useRef(null);
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const [showCamera, setShowCamera] = useState(false);
  const [flash, setFlash] = useState('off');
  const [zoom, setZoom] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const processingFrame = useRef(false);

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

  useEffect(() => {
    if (isstarting) {
      const connectWebSocket = async () => {
        const token = await SecureStore.getItemAsync("accessToken");
        if (!token) return;
        
        ws.current = new WebSocket(`wss://api.tmiattendance.dpdns.org/ws/v2/recognize?token=${token}`);

        ws.current.onopen = () => {
          setWsConnected(true);
          console.log("WebSocket connected");
        };

        ws.current.onmessage = (event) => {
          const response = JSON.parse(event.data);
          const { status, message, newly_marked, already_marked, users } = response;
          
          if (status === 'success') {
            setNewlymarked(newly_marked || []);
            setAlreadymarked(already_marked || []);
            setUsers(users || []);
          } else if (status === 'error') {
            Toast.show({
              type: 'error',
              text1: '❌ ' + message,
              position: 'top',
              visibilityTime: 5000,
            });
            navigation.navigate('Présence');
          }
          
          // Mark frame as processed
          processingFrame.current = false;
        };

        ws.current.onerror = (error) => {
          console.error("WebSocket error:", error);
          processingFrame.current = false;
        };

        ws.current.onclose = () => {
          setIsstarting(false);
          setWsConnected(false);
          console.log("WebSocket closed");
        };
      };

      connectWebSocket();

      return () => {
        if (ws.current) ws.current.close();
      };
    }
  }, [isstarting]);

  // Continuous frame capture and send (higher FPS)
  useEffect(() => {
    let interval;
    if (isstarting && isFocused && wsConnected) {
      interval = setInterval(async () => {
        // Skip if still processing previous frame
        if (processingFrame.current || !cameraRef.current || ws.current?.readyState !== WebSocket.OPEN) {
          return;
        }

        try {
          processingFrame.current = true;
          
          const photo = await cameraRef.current.takePictureAsync({
            skipProcessing: false,
            shutterSound: false,
            quality: 0.1,
            base64: true
          });

          ws.current.send(JSON.stringify({ 
            image: photo.base64, 
            emplacement: formattedEmplacement,
            timestamp: Date.now()
          }));
        } catch (err) {
          console.error("Capture error:", err);
          processingFrame.current = false;
        }
      }, 500); // 2 FPS - increase to 200ms for 5 FPS if needed
    }
    return () => clearInterval(interval);
  }, [isstarting, isFocused, wsConnected, formattedEmplacement]);

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

  return (
    <SafeAreaView style={styles.container}>
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

      <View style={styles.overlay}>
        {users.map((name, idx) => (
          <Text key={idx} style={{ color: "#fff", fontSize: 50 }}>
            {name}
          </Text>
        ))}
      </View>

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

      {/* Top Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
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
        <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
          <MaterialCommunityIcons name="camera-flip" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {formattedEmplacement !== "Aucun" && (
        <TouchableOpacity
          style={isstarting ? styles.videoonButton : styles.videooffButton}
          onPress={() => setIsstarting(!isstarting)}
        >
          {isstarting ? (
            <MaterialCommunityIcons name="crop-square" size={40} color="#fff" />
          ) : (
            <MaterialCommunityIcons name="camera" size={40} color="#fff" />
          )}
        </TouchableOpacity>
      )}
      
      <TouchableOpacity 
        style={styles.liveButton} 
        disabled={isstarting} 
        onPress={() => navigation.navigate("Présence")}
      >
        <MaterialCommunityIcons name="robot" size={20} color="#fff" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navButton} 
        disabled={isstarting} 
        onPress={() => navigation.navigate('Ajout')}
      >
        <MaterialCommunityIcons name="account-plus" size={20} color="#fff" />
      </TouchableOpacity>
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
    aspectRatio: 3 / 4,
    overflow: 'hidden',
    borderRadius: 12,
  },
  camera: {
    flex: 1,
  },
  topControls: {
    position: 'absolute',
    left: 5,
    flexDirection: 'row',
    gap: 10,
    zIndex: 10,
  },
  flashButton: {
    backgroundColor: '#00000088',
    padding: 10,
    borderRadius: 30,
  },
  flipButton: {
    backgroundColor: '#00000088',
    padding: 10,
    borderRadius: 30,
  },
  videooffButton: {
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
  videoonButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: '#ff0000ff',
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  }
});