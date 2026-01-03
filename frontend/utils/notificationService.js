import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from '../api';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'notification.wav',
    });
  }

  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return;
  }
  
  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
      Toast.show({
        type: 'error',
        text1: 'Notification Setup Failed',
        text2: 'Missing Expo project ID configuration.',
      });
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync({
      projectId,
    })).data;
  } catch (error) {
    return null;
  }

  return token;
}

export async function sendTokenToBackend(token) {
  try {
    const formData = new FormData();
    formData.append('expo_push_token', token);
    formData.append('device_type', Platform.OS);
    formData.append('device_name', Device.modelName || 'Unknown Device');
    
    const response = await api.post('/v2/register-device', formData);

    await AsyncStorage.setItem('expoPushToken', token);
  } catch (error) {
  }
}

export async function unregisterDevice() {
  try {
    const token = await AsyncStorage.getItem('expoPushToken');
    
    if (!token) {
      return true; 
    }
    const formData = new FormData();
    formData.append('expo_push_token', token);
    const response = await api.post('/v2/unregister-device', formData);

    if (response.ok) {
      await AsyncStorage.removeItem('expoPushToken');
    }
    
    return true;
  } catch (error) {
    return false;
  }
}
