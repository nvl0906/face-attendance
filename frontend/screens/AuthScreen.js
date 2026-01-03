import { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, ImageBackground } from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import useUserStore from "../stores/useUserStore";
import { useCameraPermissions } from 'expo-camera';
import {
  registerForPushNotificationsAsync,
  sendTokenToBackend,
} from '../utils/notificationService';

const AuthScreen = ({ navigation }) => {
  const setUsername = useUserStore((s) => s.setUsername);
  const setIsadmin = useUserStore((s) => s.setIsadmin);
  const setVoice = useUserStore((s) => s.setVoice);
  const setUserid = useUserStore((s) => s.setUserid);
  const setProfile = useUserStore((s) => s.setProfile);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      return status === 'granted';
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  const getPayloadFromToken = async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (!token) return null;

      const decoded = jwtDecode(token);
      return decoded;
    } catch (error) {
      console.error('Token decode error:', error);
      return null;
    }
  };

  const setupNotifications = async () => {
    const pushtoken = await registerForPushNotificationsAsync();  
    if (pushtoken) {
      await sendTokenToBackend(pushtoken);
    }
  };

  useEffect(() => {
    const checkToken = async () => {
      setLoading(true);
      try {
        const payload = await getPayloadFromToken();

        if (payload) {
          setUserid(payload.userid);
          setIsadmin(payload.is_admin);
          setUsername(payload.username);
          setVoice(payload.voice);
          setProfile(payload.profile);
          await setupNotifications();
          navigation.reset({ 
            index: 0, 
            routes: [{ name: "MainTabs" }] 
          });
        } else {
          setProfile(null);
          navigation.reset({ 
            index: 0, 
            routes: [{ name: "Login" }] 
          });
        }
      } catch (error) {
        console.error("Erreur", error);
      } finally {
        setLoading(false);
      }
    };

    const init = async () => {
      const hasPermission = await requestLocationPermission();
      if (hasPermission) {
        if (!permission || !permission.granted) {
          await requestPermission();
        }
        checkToken();
      }
    };

    init();
  }, []);

  return (
    <ImageBackground
      source={require("../assets/icon.png")} // 👈 path to your image
      style={styles.background}
      resizeMode="cover"
    >
      {/* Dark overlay */}
      <View style={styles.overlay}>
        <View style={styles.container}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#60a5fa" />
              <Text style={styles.loadingText}>Chargement en cours...</Text>
            </View>
          )}
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
 background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)", // 👈 dark transparent overlay
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#e5e7eb", // light gray text for dark theme
    fontWeight: "500",
  },
});

export default AuthScreen;