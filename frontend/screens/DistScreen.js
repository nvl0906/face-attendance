import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import api from '../api'; // your api
import Toast from 'react-native-toast-message';
import { useIsFocused, useNavigation } from '@react-navigation/native';


export default function DistScreen() {
    const isFocused = useIsFocused();
    const navigation = useNavigation();
    const [dist, setDist] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (dist) => {
        setLoading(true);
        try {
            const res = await api.post("/v2/update-dist", { dist: dist });

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

            const { message } = res.data;
            Toast.show({
                type: 'success',
                text1: '✅ ' + message,
                visibilityTime: 3000,
                position: 'top',
                autoHide: true,
                topOffset: 60,
            });
            navigation.navigate("Présence");
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

    const getCurrentDist = async () => {
        try {
            const res = await api.get("/v2/get-dist");

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

            const { distance } = res.data;
            setDist(distance.toString());
        } catch (err) {
            if (err.status === 530 || err.status === 502) {
                Toast.show({
                type: 'error',
                text1: '❌ Désolé! Le serveur est actuellement indisponible!',
                text2: '❌ Veuillez réessayer plus tard!',
                position: 'top',
                });
            }
        }
    };

    useEffect(() => {
        if (isFocused == true) {
            async function fetchData() {
                await getCurrentDist();
            }
            fetchData();
        }
    }, [isFocused]);

    return (
        <View style={styles.container}>
            <View style={{
            backgroundColor: '#222', padding: 20, borderRadius: 10, width: '80%'
            }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 10 }}>Nouvelle Distance</Text>
                <TextInput
                    value={dist}
                    onChangeText={setDist}
                    style={{
                    backgroundColor: '#333', color: '#fff', borderRadius: 8, padding: 10, marginBottom: 15
                    }}
                    placeholder="Nouvelle distance (en mètres)"
                    placeholderTextColor="#aaa"
                    editable={!loading}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                    <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#555' }]}
                    onPress={() => {
                    navigation.navigate("Présence"); // or setModalVisible(false) if this is a modal
                    }}
                    >
                        <Text style={{ color: '#fff' }}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={async () => {
                            await handleUpdate(dist);
                        }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                        <Text style={{ color: '#fff' }}>Valider</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e90ff',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginHorizontal: 5,
    }

});