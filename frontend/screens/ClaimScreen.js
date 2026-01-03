import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList,
  TextInput, 
  TouchableOpacity,
  ActivityIndicator 
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import api from '../api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

export default function ClaimScreen({ route }) {
  const flatListRef = useRef(null);
  const navigation = useNavigation();
  const { userId, userName, userVoice } = route.params;
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(false);
  const [mypresence, setMypresence] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('');

  const get_mypresence = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      const response = await api.post('/v2/userpresence', formData);

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

      return response.data.userpresence;
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
      setLoading(false);
    }
  };

  const fetchPresence = async () => {
    const sup_mypresence = await get_mypresence();
    if (sup_mypresence) {
      setMypresence(sup_mypresence);
    }
  };

  const updatepresence = async (emplacement, timestamp) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('emplacement', emplacement);
      formData.append('timestamp', timestamp);
      const response = await api.post('/v2/updatepresence', formData);

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

      const updatedPresence = await get_mypresence();
      setMypresence(updatedPresence);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused == true) {
    fetchPresence();
    }
  }, [isFocused]);

  // ✅ Filtered data based on searchQuery & attendanceFilter
  const filteredData = mypresence.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      item.emplacement.toLowerCase().includes(query) ||
      item.timestamp.toLowerCase().includes(query);

    const matchesAttendance =
      attendanceFilter === '' || item.attendance === attendanceFilter;

    return matchesSearch && matchesAttendance;
  });

  const onSwipeGesture = (event) => {
    const { translationX, translationY } = event.nativeEvent;

    // Detect horizontal swipe (adjust threshold as needed)
    if (Math.abs(translationX) > Math.abs(translationY) && Math.abs(translationX) > 50) {
      if (translationX > 0) {
        navigation.navigate('User');
      } else {
        navigation.openDrawer();
      }
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.title1}>{item.emplacement}</Text>
      <Text style={styles.title}>{item.timestamp}</Text>
      <Text style={styles.title}>
        {item.attendance === 'present' ? '✅ Présent' : '❌ Absent'}
      </Text>
      {item.attendance === 'absent' && (
        <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, justifyContent: 'center', gap: 3 }}
          onPress={() => updatepresence(item.emplacement, item.timestamp)} 
          disabled={loading}
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#0021f6c3" />
          <Text style={{ color:"#0021f6c3", fontSize: 12, textDecorationLine: 'underline' }}>Marker comme présent</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <PanGestureHandler
      onGestureEvent={onSwipeGesture}
      activeOffsetX={[-10, 10]}
      failOffsetY={[-10, 10]}   // Fail if vertical movement is too much
    >
      <View style={styles.container}>

        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par emplacement ou date..."
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={setSearchQuery}
          editable={!loading}
        />

        {/* 🧭 Attendance Filter Buttons */}
        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={[styles.filterBtn, attendanceFilter === '' && styles.activeFilter]} 
            onPress={() => setAttendanceFilter('')}
            disabled={loading}
          >
            <Text style={[styles.filterText, attendanceFilter === '' && styles.activeFilterText]}>Tous</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBtn, attendanceFilter === 'present' && styles.activeFilter]} 
            onPress={() => setAttendanceFilter('present')}
            disabled={loading}
          >
            <Text style={[styles.filterText, attendanceFilter === 'present' && styles.activeFilterText]}>Présents ✅</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBtn, attendanceFilter === 'absent' && styles.activeFilter]} 
            onPress={() => setAttendanceFilter('absent')}
            disabled={loading}
          >
            <Text style={[styles.filterText, attendanceFilter === 'absent' && styles.activeFilterText]}>Absents ❌</Text>
          </TouchableOpacity>
        </View>
        {loading && <ActivityIndicator color="#1e90ff" style={{ marginTop: 10 }} />}
        {/* 📋 Filtered List */}
        {!loading && (
          <Text style={{ color: '#fff', marginBottom: 5, fontSize: 20, textAlign: "center" }}>{userName} {userVoice === 1 ? userVoice + "ère voix" : userVoice !== 5 ? userVoice + "ème voix" : "P.E"}</Text>
        )}
        {!loading && (
          <Text style={{ color: '#fff', marginBottom: 5 }}>{`Total: ${filteredData.length}`}</Text>
        )}
        {!loading && (
          <FlatList
            ref={flatListRef}
            data={filteredData}
            renderItem={renderItem}
            keyExtractor={(item, index) => `${item.emplacement}-${index}`}
            showsVerticalScrollIndicator={false}
            simultaneousHandlers={flatListRef}
          />
        )}
      </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 10, 
    paddingHorizontal: 20, 
    backgroundColor: '#000' 
  },
  item: {
    backgroundColor: '#f9c2ff',
    padding: 20,
    marginVertical: 8,
    borderRadius: 10,
  },
  title: {
    fontSize: 12,
  },
  title1: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
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
    marginRight: -12,
    marginLeft: -12,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  activeFilter: {
    backgroundColor: '#f9c2ff',
  },
  filterText: {
    color: '#fff',
    fontSize: 12,
  },
    activeFilterText: {
    color: '#000',
    fontWeight: 'bold',
  },
})
