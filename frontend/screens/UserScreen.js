import { useState, useEffect, useRef, use } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../api';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from "buffer";
import axios from 'axios';

if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}

export default function UserScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [sortBy, setSortBy] = useState('username');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [allusers, setAllusers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [allusersFilter, setAllusersFilter] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const slideAnim = useRef(new Animated.Value(0)).current; // initial: hidden
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [newName, setNewName] = useState('');
  const [newVoice, setNewVoice] = useState(1);
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const formattednewName = newName
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // 📡 Fetch users
  const get_all_users = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v2/allusers');

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

      return response.data.allusers;
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
      setLoading(false);
    }
  };
  
  const fetchAllusers = async () => {
    const users = await get_all_users();
    if (users) setAllusers(users);
  };

  useEffect(() => {
    fetchAllusers();
  }, []);
  
  useEffect(() => {
    if (modalVisible == false || deleteModalVisible == false) {
      fetchAllusers();
    }
  }, [modalVisible, deleteModalVisible]);

  // 🔎 Filtering
  const filteredData = allusers
    .filter((item) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = item.username.toLowerCase().includes(query);
      const matchesFilter = allusersFilter === 0 || item.voice === allusersFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'username') {
        return a.username.localeCompare(b.username);
      } else if (sortBy === 'attendance') {
        return (b.attendance_count || 0) - (a.attendance_count || 0);
      } else if (sortBy === 'absence') {
        return (b.absence_count || 0) - (a.absence_count || 0);
      } else if (sortBy === 'not_seen') {
        return (b.not_seen || 0) - (a.not_seen || 0);
      } else {
        return 0;
      }
    });


  // 🛠️ Handle long press with animation
  const handleLongPress = (id) => {
    if (selectedId === id) {
      // Close
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.ease,
      }).start(() => setSelectedId(null));
    } else {
      setSelectedId(id);
      slideAnim.setValue(0);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    }
  };

// Delete handler
  const handleDelete = async (user_id, user_name) => {
    setLoading(true);
    try {
      const res = await api.post("/v2/delete-user", { id: user_id, name: user_name });

      if (res.data.status === 'errorAdmin') {
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

      const { status, message } = res.data;

    if (status === 'success') {
        Toast.show({
            type: 'success',
            text1: '✅ ' + message,
            visibilityTime: 3000,
            position: 'top',
            autoHide: true,
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
          text1: '❌ SERVEUR INDISPONIBLE!',
          text2: '❌ Veuillez réessayer ultérieurement!',
          position: 'top',
        });
      }
    }
    setLoading(false);
  };

  //Download excel
  const downloadAndShare = async () => {
  setLoading(true);
  try {
    const token = await SecureStore.getItemAsync("accessToken");
    if (!token) throw new Error("Utilisateur non authentifié.");

    const fileName = "tmi_presence.xlsx";
    const fileUri = FileSystem.cacheDirectory + fileName;

    // Axios GET request with token
    const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;;
    const response = await axios.get(`${BACKEND_URL}/v2/download`, {
      responseType: "arraybuffer", // binary data
      headers: { Authorization: `Bearer ${token}` },
    });

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

    // Convert ArrayBuffer -> base64 manually (no Buffer!)
    const base64Data = btoa(
      new Uint8Array(response.data)
        .reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    // Save file to cache using legacy write
    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Share file if available
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Partager la feuille de présence",
        UTI: "com.microsoft.excel.xlsx",
      });
    } else {
        Toast.show({
          type: 'error',
          text1: '❌ Partage non disponible!',
          text2: '❌ Impossible de partager ce fichier sur cet appareil!',
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
    setLoading(false);
  }
};


  // Update handler (now includes voice and is_admin)
  const handleUpdate = async (user_id, newName, newVoice, newIsAdmin) => {
    setLoadingModal(true);
    try {
      const res = await api.post("/v2/update-user", { id: user_id, name: newName, voice: newVoice, is_admin: newIsAdmin });
      if (res.data.status === 'errorAdmin') {
        Toast.show({
          type: 'error',
          text1: '❌ ' + res.data.message,
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

      if (res.data.status === 'success') {
          Toast.show({
              type: 'success',
              text1: '✅ ' + res.data.message,
              visibilityTime: 3000,
              position: 'top',
              autoHide: true,
              topOffset: 60,
          });
      } else if (res.data.status === 'error') {
        Toast.show({
          type: 'error',
          text1: '❌ ' + res.data.message,
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
      setLoadingModal(false);
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedId === item.id;

    const slideY = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-50, 0], // slide down from above
    });

    const opacity = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <View style={styles.itemContainer}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Claim', { userId: item.id, userName: item.username, userVoice: item.voice })}
          onLongPress={() => handleLongPress(item.id)}
          delayLongPress={300}
        >
          <View style={styles.item}>
            <Text style={styles.title1}>{item.username}</Text>
            {item.voice === 1 && <Text style={styles.title2}>1ère voix</Text>}
            {item.voice === 2 && <Text style={styles.title2}>2ème voix</Text>}
            {item.voice === 3 && <Text style={styles.title2}>3ème voix</Text>}
            {item.voice === 4 && <Text style={styles.title2}>4ème voix</Text>}
            {item.voice === 5 && <Text style={styles.title2}>P.E</Text>}
            <Text style={styles.title}>Présences: {item.attendance_count}</Text>
            <Text style={styles.title}>Absences: {item.absence_count}</Text>
            <Text style={styles.title}>Non vus: {item.not_seen}</Text>
            <View style={styles.avatarWrapper}>
              <Image source={item.profile ? { uri: item.profile } : require("../assets/user.jpg")} style={styles.avatar} />
            </View>
          </View>
        </TouchableOpacity>

        {isSelected && (
          <Animated.View
            style={[
              styles.actionRow,
              { transform: [{ translateY: slideY }], opacity },
            ]}
          >
            <TouchableOpacity
              style={[styles.actionButton, styles.updateButton]}
              onPress={() => {
                setEditUser(item);
                setNewName(item.username);
                setNewVoice(item.voice || 1);
                setNewIsAdmin(!!item.is_admin);
                setModalVisible(true);
              }}
            >
              <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
              <Text style={styles.actionText}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => {
                setUserToDelete({ id: item.id, name: item.username });
                setDeleteModalVisible(true);
              }}
            >
              <MaterialCommunityIcons name="delete" size={16} color="#fff" />
              <Text style={styles.actionText}>Supprimer</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 🔎 Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Rechercher par prénom..."
        placeholderTextColor="#aaa"
        value={searchQuery}
        onChangeText={setSearchQuery}
        editable={!loading}
      />

      {/* 🧭 Filter Buttons */}
      <View style={styles.filterRow}>
        {[0, 1, 2, 3, 4, 5].map((num) => (
          <TouchableOpacity
            key={num}
            style={[styles.filterBtn, allusersFilter === num && styles.activeFilter]}
            onPress={() => setAllusersFilter(num)}
            disabled={loading}
          >
            <Text style={[styles.filterText, allusersFilter === num && styles.activeFilterText]}>
              {num === 0 ? 'Tous' : num === 1 ? '1ère' : num === 2 ? '2ème' : num === 3 ? '3ème' : num === 4 ? '4ème' : 'P.E'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator color="#1e90ff" style={{ marginTop: 10 }} />}
      {!loading && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: '#fff' }}>{`Total: ${filteredData.length}`}</Text>
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={downloadAndShare}
          >
            <MaterialCommunityIcons name="download" size={20} color="#fff" />
            <Text style={{ color: '#fff', marginLeft: 5 }}>excel</Text>
          </TouchableOpacity>
          <View>
            <TouchableOpacity 
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center',
                backgroundColor: '#222',
                padding: 5,
                borderRadius: 5
              }}
              onPress={() => setShowSortDropdown(!showSortDropdown)}
            >
              <Text style={{ color: '#fff', marginRight: 5 }}>
                {sortBy === 'username' ? 'Tri: Prénom' :
                sortBy === 'attendance' ? 'Tri: Présences' :
                sortBy === 'absence' ? 'Tri: Absences' : 'Tri: Non vus'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color="#fff" />
            </TouchableOpacity>
            
            {showSortDropdown && (
              <View style={{
                position: 'absolute',
                top: 35,
                right: 0,
                width: 120,
                backgroundColor: '#333',
                borderRadius: 5,
                padding: 5,
                zIndex: 1,
                elevation: 5,
              }}>
                <TouchableOpacity 
                  style={{ padding: 8 }}
                  onPress={() => {
                    setSortBy('username');
                    setShowSortDropdown(false);
                  }}
                >
                  <Text style={{ color: '#fff' }}>Prénom</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ padding: 8 }}
                  onPress={() => {
                    setSortBy('attendance');
                    setShowSortDropdown(false);
                  }}
                >
                  <Text style={{ color: '#fff' }}>Présences</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 8 }}
                  onPress={() => {
                    setSortBy('absence');
                    setShowSortDropdown(false);
                  }}
                >
                  <Text style={{ color: '#fff' }}>Absences</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 8 }}
                  onPress={() => {
                    setSortBy('not_seen');
                    setShowSortDropdown(false);
                  }}
                >
                  <Text style={{ color: '#fff' }}>Non vus</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
      {!loading && (
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.username}-${index}`}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchAllusers} 
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{
          flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000a'
        }}>
          <View style={{
            backgroundColor: '#222', padding: 20, borderRadius: 10, width: '80%'
          }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 10 }}>Nouveau prénom</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              style={{
                backgroundColor: '#333', color: '#fff', borderRadius: 8, padding: 10, marginBottom: 15
              }}
              placeholder="Entrer le nouveau prénom"
              placeholderTextColor="#aaa"
              editable={!loadingModal}
            />
            <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 10 }}>Voix</Text>
            <View style={{ flexDirection: 'row', marginBottom: 15 }}>
              {[1, 2, 3, 4, 5].map((v) => (
                <TouchableOpacity
                  key={v}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: 10,
                  }}
                  onPress={() => setNewVoice(v)}
                  disabled={loadingModal}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: '#1e90ff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 5,
                    backgroundColor: newVoice === v ? '#1e90ff' : 'transparent',
                  }}>
                    {newVoice === v && (
                      <View style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: '#fff',
                      }} />
                    )}
                  </View>
                  <Text style={{ color: '#fff' }}>{v !== 5 ? v : 'P.E' }</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <TouchableOpacity
                onPress={() => setNewIsAdmin(!newIsAdmin)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: '#1e90ff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                  backgroundColor: newIsAdmin ? '#1e90ff' : 'transparent',
                }}
                disabled={loadingModal}
              >
                {newIsAdmin && (
                  <MaterialCommunityIcons name="check" size={18} color="#fff" />
                )}
              </TouchableOpacity>
              <Text style={{ color: '#fff' }}>Admin</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#444' }]}
                onPress={() => setModalVisible(false)}
                disabled={loadingModal}
              >
                <Text style={{ color: '#fff' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={async () => {
                  await handleUpdate(editUser.id, formattednewName, newVoice, newIsAdmin);
                  setModalVisible(false);
                }}
              >
                {loadingModal ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                <Text style={{ color: '#fff' }}>Valider</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#000a'
        }}>
          <View style={{
            backgroundColor: '#222',
            padding: 20,
            borderRadius: 10,
            width: '80%',
            alignItems: 'center'
          }}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#E53935" style={{ marginBottom: 15 }} />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, marginBottom: 10 }}>
              Confirmer la suppression
            </Text>
            <Text style={{ color: '#aaa', textAlign: 'center', marginBottom: 20 }}>
              Voulez-vous vraiment supprimer {userToDelete?.name} ?
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%' }}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#444',textAlign: 'center' }]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setUserToDelete(null);
                }}
              >
                <Text style={{ color: '#fff' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#E53935',textAlign: 'center' }]}
                onPress={async () => {
                  setDeleteModalVisible(false);
                  await handleDelete(userToDelete.id, userToDelete.name);
                  setUserToDelete(null);
                }}
              >
                <Text style={{ color: '#fff' }}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 20,
    backgroundColor: '#000',
  },
  searchInput: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#333',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeFilter: {
    backgroundColor: '#f9c2ff',
  },
  activeFilterText: {
    color: '#000',
    fontWeight: 'bold',
  },
  filterText: {
    color: '#fff',
    fontSize: 12,
  },
  itemContainer: {
    marginBottom: 10,
    backgroundColor: '#111',
    borderRadius: 10,
    overflow: 'hidden',
  },
  item: {
    backgroundColor: '#f9c2ff',
    padding: 20,
    borderRadius: 10,
  },
  title1: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
  },
  title2: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#222',
    paddingVertical: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  updateButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#E53935',
  },
  actionText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e90ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 5,
  },
  downloadButton: {
    backgroundColor: '#222',
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 5,
    borderRadius: 5
  },
    avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 100 / 2,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'absolute',
    right: 20,
    top: 20,
    backgroundColor: '#ccc',
  },
  avatar: { width: '100%', height: '100%', resizeMode: 'cover' },
});