import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ResultScreen({ route }) {
  const { user_profile = [] } = route.params || {};
  const navigation = useNavigation();

  const data = user_profile;

  const renderItem = ({ item }) => {
    const name = item.username
    const profilePic = item.profile
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 30, marginTop: 7, gap: 10 }}>
        <View>
          <Image 
            source={profilePic ? { uri: profilePic } : require("../assets/user.jpg")} 
            style={{
              width: 45,
              height: 45,
              borderRadius: 22.5,
              borderWidth: 1,
              borderColor: "#555",
            }} 
          />
        </View>
        <View>
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>
            {name}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate('Présence')} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={26} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.title}>Résultats de reconnaissance</Text>

      <FlatList
        style={styles.scroll}
        data={data}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        maxToRenderPerBatch={30}
        windowSize={10}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: 30, // adjust depending on your styles
          offset: 30 * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 5, paddingHorizontal: 20, backgroundColor: '#000' },
  backButton: { position: 'absolute', top: 15, left: 10, zIndex: 10 },
  title: { fontSize: 18, fontWeight: 'bold', marginTop: 10, textAlign: 'center', color: '#fff' },
  scroll: { marginTop: 3 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 10,
    color: '#fff',
    backgroundColor: '#000',
    paddingVertical: 3,
  },
  name: { fontSize: 14, color: '#fff', paddingLeft: 5, height: 24 },
});
