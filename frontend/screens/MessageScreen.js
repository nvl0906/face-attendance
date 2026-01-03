import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import api from '../api';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import useUserStore from "../stores/useUserStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function MessageScreen() {
  const navigation = useNavigation();
  const isadmin = useUserStore();
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const response = await api.get('/messages');
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
      setMessages(response.data.messages || []);
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
      setRefreshing(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !isadmin) return;
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('message', messageText.trim());
      const response = await api.post('/messages', formData);
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
      setMessages([...messages, response.data]);
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to send message';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View style={styles.messageBubble}>
       <Text style={styles.timestamp}>
        {new Date(item.created_at).toLocaleString('fr-FR', {
          timeZone: 'Africa/Dakar',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
      <Text style={styles.messageText}>{item.message}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A9EFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>Message</Text>
        {isadmin && <Text style={styles.adminBadge}>Admin</Text>}
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesList}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              setRefreshing(true);
              loadMessages();
            }}
            tintColor="#4A9EFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Message vide</Text>
          </View>
        }
      />

      {isadmin && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ecrivez votre message..."
            placeholderTextColor="#6B7280"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={10000}
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || isSending) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!messageText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
                <MaterialCommunityIcons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    paddingTop: 15,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F1F5F9',
  },
  adminBadge: {
    backgroundColor: '#4A9EFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  messagesList: {
    padding: 15,
    flexGrow: 1,
  },
  messageBubble: {
    backgroundColor: '#1E293B',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#E2E8F0',
  },
  timestamp: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 5,
    marginBottom: 10,
    alignSelf:'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginBottom: 15
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
    color: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendButton: {
    backgroundColor: '#4A9EFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    alignSelf:'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
  },
  readOnlyBanner: {
    backgroundColor: '#1E293B',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  readOnlyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});