import { View, Text, Image, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as SecureStore from 'expo-secure-store';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import PrésenceScreen from './screens/PrésenceScreen';;
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import LiveScreen from './screens/LiveScreen';
import ResultScreen from './screens/ResultScreen';
import ClaimScreen from './screens/ClaimScreen';
import UserScreen from './screens/UserScreen';
import MypresenceScreen from './screens/MypresenceScreen';
import DistScreen from './screens/DistScreen';
import MessageScreen from './screens/MessageScreen';
import ProfileScreen from './screens/ProfileScreen';
import LocalisationScreen from './screens/LocalisationScreen';
import AuthScreen from './screens/AuthScreen';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { useColorScheme } from "react-native";
import useUserStore from "./stores/useUserStore";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  unregisterDevice,
} from './utils/notificationService';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const toastConfig = {
  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: 'red',
        backgroundColor: '#000',
      }}
      text1Style={{
        fontSize: 11,
        fontWeight: 'bold',
        color: '#fff',
      }}
      text2Style={{
        fontSize: 10,
        color: '#fff',
      }}
    />
  ),

  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: 'green',
        backgroundColor: '#000',
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 11,
        fontWeight: 'bold',
        color: '#fff',
      }}
      text2Style={{
        fontSize: 10,
        color: '#fff',
      }}
    />
  ),

  info: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: 'yellow',
        backgroundColor: '#000',
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 11,
        fontWeight: 'bold',
        color: '#fff',
      }}
      text2Style={{
        fontSize: 10,
        color: '#fff',
      }}
    />
  ),
};

function CustomDrawerContent(props) {
  const username = useUserStore((s)=>s.username);
  const isadmin = useUserStore((s)=>s.isadmin);
  const profile = useUserStore((s)=>s.profile);

  const handleLogout = async () => {
    const b = await unregisterDevice();
    await SecureStore.deleteItemAsync("accessToken");
    props.navigation.reset({
      index: 0,
      routes: [
        { 
          name: "Auth",
        },
      ],
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#121212" }}>
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: "#333",
          padding: 20,
          marginTop: 50,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => props.navigation.navigate("Profile")}>
          <Image
            source={profile ? { uri: profile } : require("./assets/user.jpg")}
            style={{
              width: 45,
              height: 45,
              borderRadius: 22.5,
              borderWidth: 1,
              borderColor: "#555",
            }}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => props.navigation.navigate("Profile")}>
          <View>
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>
              {username} {isadmin ? "(ADMIN)" : ""}
            </Text>
          </View>
         </TouchableOpacity>
      </View>
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: "#333", marginBottom: 50 }}>
        <TouchableOpacity onPress={handleLogout} style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialCommunityIcons name="logout" size={22} color="red" />
          <Text style={{ color: "red", marginLeft: 10, fontWeight: "bold" }}>Déconnecter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MainTabs() {
  const isadmin = useUserStore((s)=>s.isadmin);
  return (
    <Drawer.Navigator 
      initialRouteName="Mypresence"
      drawerContent={(props) => <CustomDrawerContent {...props} />} 
      screenOptions={{
        unmountOnBlur: false,
        headerShown: true,
        drawerPosition: 'right',
        drawerType: 'front',
        swipeEdgeWidth: 200,
        drawerStyle: {
          backgroundColor: '#121212',
          width: 250,
        },
        headerTitleAlign: 'center',
        headerTitleStyle: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
        headerStyle: { backgroundColor: "#121212", height: 60 },
        headerTintColor: "#fff",
        drawerActiveTintColor: "#4cafef",
        drawerInactiveTintColor: "#aaa",
        drawerLabelStyle: { fontSize: 15 },
      }}
    >
      <Drawer.Screen 
        name="Localisation" 
        component={LocalisationScreen} 
        options={{ 
          headerTitle: "Localisation", 
          title: "Localisation",
          unmountOnBlur: false,
          drawerItemStyle: { display: "none" } 
        }} 
      />
      <Drawer.Screen 
        name="Présence" 
        component={PrésenceScreen} 
        options={{ 
          headerTitle: "Présence", 
          title: "Présence",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="camera" size={size} color={color} />
          ), 
          unmountOnBlur: false,
        }} 
      />
      <Drawer.Screen 
        name="Mypresence" 
        component={MypresenceScreen} 
        options={{ 
          headerTitle: "Mes présences", 
          title: "Mes présences",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="note" size={size} color={color} />
          ), 
          unmountOnBlur: false,
        }} 
      />
      <Drawer.Screen 
        name="Message" 
        component={MessageScreen} 
        options={{ 
          headerTitle: "Message", 
          title: "Message",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="message" size={size} color={color} />
          ), 
          unmountOnBlur: false,
        }} 
      />
      <Drawer.Screen 
        name="User" 
        component={UserScreen} 
        options={{ 
          headerTitle: "Gestion", 
          title: "Gestion",
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="database" size={size} color={color} />
          ), 
          unmountOnBlur: false,
          drawerItemStyle: isadmin ? undefined : { display: "none" }
        }} 
      />
      <Drawer.Screen name="Live" component={LiveScreen} options={{ drawerItemStyle: { display: "none" }, unmountOnBlur: false, headerTitle: "Présence(Live)" }}  />
      <Drawer.Screen name="Ajout" component={RegisterScreen} options={{ drawerItemStyle: { display: "none" }, unmountOnBlur: false, headerTitle: "Ajout" }} />
      <Drawer.Screen name="Result" component={ResultScreen} options={{ drawerItemStyle: { display: "none" }, headerTitle: "Résultat"}} />
      <Drawer.Screen name="Claim" component={ClaimScreen} options={{ drawerItemStyle: { display: "none" }, unmountOnBlur: false, headerTitle: "Modification", title: "Modification" }} />
      <Drawer.Screen name="Dist" component={DistScreen} options={{ drawerItemStyle: { display: "none" }, headerTitle: "Distance", unmountOnBlur: false }} />
      <Drawer.Screen name="Profile" component={ProfileScreen} options={{ drawerItemStyle: { display: "none" }, headerTitle: "Profile", unmountOnBlur: false }} />
    </Drawer.Navigator>
  );
}

function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Auth">
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{ unmountOnBlur: true }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ unmountOnBlur: true }}
      />
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ unmountOnBlur: true }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const scheme = useColorScheme(); 

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <NavigationContainer theme={scheme === "dark" ? DarkTheme : DefaultTheme} >
          <RootNavigator />
        </NavigationContainer>
        <Toast config={toastConfig} />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

