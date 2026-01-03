import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ImageBackground
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../api';
import useUserStore from "../stores/useUserStore";

export default function ProfileScreen({ navigation }) {
  const username = useUserStore((s) => s.username);
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const voice = useUserStore((s) => s.voice);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permission required', text2: 'Permission to access photos is required.' });
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.2,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri || res.uri;
      if (!uri) return;
      setUploading(true);
      setProfile(null);
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'student.jpg',
        type: 'image/jpeg',
      });
      const uploadRes = await api.post('/v2/userphoto', formData);
      if (uploadRes.data.status === 'errorAdmin') {
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
      if (uploadRes.data.status === 'success') {
        Toast.show({ type: 'success', text1: '✅ '+ uploadRes.data.message, position: 'top' });
        setProfile(uploadRes.data.photoUrl);
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
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <ImageBackground
            source={require("../assets/icon.png")}
            style={styles.background}
            resizeMode="cover"
        >
            <LinearGradient colors={['#7c3aed', '#a78bfa']} style={styles.header}></LinearGradient>
        </ImageBackground>

        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <Image source={profile ? { uri: profile } : require("../assets/user.jpg")} style={styles.avatar} />
            <TouchableOpacity style={styles.cameraBtn} onPress={pickAvatar} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : <MaterialCommunityIcons name="camera" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>

        </View>

        <View style={styles.card}>
          <ReadField icon="account" label="Nom" value={username} />
          <ReadField icon="music-note" label="Voix" value={voice} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReadField({ icon, label, value }) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldIcon}>
        <MaterialCommunityIcons name={icon} size={20} color="#7c3aed" />
      </View>
      <View style={styles.fieldBody}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value == 5 ? "Période d'essai" : value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  container: { paddingBottom: 40, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    height: 140,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: Platform.OS === 'android' ? 28 : 48,
    paddingHorizontal: 16,
    opacity: 0
  },
  backBtn: { position: 'absolute', left: 12, top: Platform.OS === 'android' ? 32 : 52 },
  headerTitle: { color: '#fff', fontSize: 18, textAlign: 'center', fontWeight: '600' },

  avatarSection: {
    marginTop: -44,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 110 / 2,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
    borderWidth: 4,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#374151', width: '100%', height: '100%' },
  cameraBtn: {
    position: 'absolute',
    right: 5,
    bottom: 0,
    backgroundColor: '#7c3aed',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
  },

  nameRow: { flex: 1, marginLeft: 16, flexDirection: 'row', alignItems: 'center' },
  nameText: { color: '#fff', fontSize: 20, fontWeight: '700' },

  card: { marginTop: 18, marginHorizontal: 16, backgroundColor: '#071024', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#061226' },
  fieldIcon: { width: 36, alignItems: 'center' },
  fieldBody: { flex: 1, marginLeft: 8 },
  fieldLabel: { color: '#94a3b8', fontSize: 12 },
  fieldValue: { color: '#fff', fontSize: 15 },

  actions: { marginTop: 20, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between' },
  button: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 6 },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#7c3aed' },
  buttonText: { color: '#fff', fontWeight: '600' },
   background: {
    flex: 1,
  },
});