import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList,  
  TextInput, 
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import api from '../api';
import useUserStore from "../stores/useUserStore";
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';

export default function MypresenceScreen() {
  const username = useUserStore((s) => s.username);
  const [mypresence, setMypresence] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const get_mypresence = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v2/mypresence');
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
      return response.data.mypresence;
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

  const fetchPresence = async () => {
    const sup_mypresence = await get_mypresence();
    if (sup_mypresence) {
      setMypresence(sup_mypresence);
    }
  };

  useEffect(() => {
    fetchPresence();
  }, []);

  const filteredData = mypresence.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      item.emplacement.toLowerCase().includes(query) ||
      item.timestamp.toLowerCase().includes(query);
    const matchesAttendance =
      attendanceFilter === '' || item.attendance === attendanceFilter;
    return matchesSearch && matchesAttendance;
  });

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.title1}>{item.emplacement}</Text>
      <Text style={styles.title}>{item.timestamp}</Text>
      <Text style={styles.title}>
        {item.attendance === 'present' ? '✅ Présent' : '❌ Absent'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Rechercher par emplacement ou date..."
        placeholderTextColor="#aaa"
        value={searchQuery}
        onChangeText={setSearchQuery}
        editable={!loading}
      />
      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[styles.filterBtn, attendanceFilter === '' && styles.activeFilter]} 
          onPress={() => setAttendanceFilter('')}
          disabled={loading}
        >
          <Text style={[styles.filterText, attendanceFilter === '' && styles.activeFilterText]} >Tous</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterBtn, attendanceFilter === 'present' && styles.activeFilter]} 
          onPress={() => setAttendanceFilter('present')}
          disabled={loading}
        >
          <Text style={[styles.filterText, attendanceFilter === 'present' && styles.activeFilterText]} >Présents ✅</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterBtn, attendanceFilter === 'absent' && styles.activeFilter]} 
          onPress={() => setAttendanceFilter('absent')}
          disabled={loading}
        >
          <Text style={[styles.filterText, attendanceFilter === 'absent' && styles.activeFilterText]} >Absents ❌</Text>
        </TouchableOpacity>
      </View>
      {loading && <ActivityIndicator color="#1e90ff" style={{ marginTop: 10 }} />}
      {/* 📋 Filtered List */}
      {!loading && (
        <Text style={{ color: '#fff', marginBottom: 5, fontSize: 20, textAlign: "center" }}>{username}</Text>
      )}
      {!loading && (
        <Text style={{ color: '#fff', marginBottom: 5 }}>{`Total: ${filteredData.length}`}</Text>
      )}
      {!loading && (
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.emplacement}-${index}`}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchPresence} 
        />
      )}
    </View>
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
    marginLeft: -12,
    marginRight: -12,
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
  activeFilterText: {
    color: '#000',
    fontWeight: 'bold',
  },
  filterText: {
    color: '#fff',
    fontSize: 12,
  },
});

