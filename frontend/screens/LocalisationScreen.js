import { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import useUserStore from "../stores/useUserStore";

const LocalisationScreen = ({ navigation }) => {

  const setLat = useUserStore((s) => s.setLat);
  const lat = useUserStore((s) => s.lat);
  const setLong = useUserStore((s) => s.setLong);
  const long = useUserStore((s) => s.long);
  const [accuracy, setAccuracy] = useState(null);
  const [loading, setLoading] = useState(true);

  const updateGeolocation = async () => {
    try {
      let bestLocation = null;
      let subscription = null;
      let timeoutId = null;

      const getLocation = new Promise(async (resolve, reject) => {
        try {
          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 1000,
              distanceInterval: 1
            },
            (loc) => {
              if (!bestLocation || loc.coords.accuracy < bestLocation.coords.accuracy) {
                bestLocation = loc;
                setLat(loc.coords.latitude);
                setLong(loc.coords.longitude);
                setAccuracy(loc.coords.accuracy);
                if (loc.coords.accuracy < 21) {
                  resolve(bestLocation);
                }
              }
            }
          );

          timeoutId = setTimeout(() => {
            resolve(bestLocation);
          }, 5000);

        } catch (error) {
          reject(error);
        }
      });

      const location = await getLocation;

      if (subscription) {
        subscription.remove();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (location && location.coords.accuracy < 100) {
        Toast.show({
          type: 'success',
          text1: `✅ ${location.coords.accuracy.toFixed(0)}m de précision`,
          visibilityTime: 1500,
          position: 'top',
          topOffset: 60,
        });
        
        return location;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 7;

    const gpsTracker = async () => {
      if (!isMounted) return;

      try {
        setLoading(true);
        
        Toast.show({
          type: 'info',
          text1: '⚠️ Vas dehors pour une bonne réception!',
          text2: '📍 Recherche de votre position...',
          position: 'top',
          visibilityTime: 2000,
          topOffset: 60,
        });

        const location = await updateGeolocation();

        if (!location && retryCount < MAX_RETRIES) {
          retryCount++;
          Toast.show({
            type: 'error',
            text1: '❌ Echec!',
            text2: `🔄 Nouvelle tentative (${retryCount}/${MAX_RETRIES})`,
            position: 'top',
            visibilityTime: 1000,
            topOffset: 60,
          });
          setTimeout(gpsTracker, 2000);
          return;
        }

        if (isMounted) {
          setLoading(false);
          navigation.reset({ index: 0, routes: [{ name: "Présence" }] });
        }
      } catch (error) {
        if (isMounted) {
          setLoading(false);
        } 
      }
    };

    gpsTracker();
    
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={styles.loadingText}>⚠️ VAS DEHORS pour une bonne réception si trop long svp! ⚠️</Text>
        {accuracy && (
          <Text style={styles.accuracyText}>
            Précision: {accuracy.toFixed(0)}m
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 32,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: '500',
    alignSelf: 'center',
  },
  accuracyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#94a3b8',
  },
});

export default LocalisationScreen;