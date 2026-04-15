// mobile/App.tsx
// Root entry point — đọc FEATURE_MOBILE_RN.md trước khi sửa file này

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View, Text } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

// Screens (tạo dần theo thứ tự trong FEATURE_MOBILE_RN.md)
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import OrderListScreen from './src/screens/OrderListScreen';
import CustomerListScreen from './src/screens/CustomerListScreen';
import ProfileScreen from './src/screens/ProfileScreen';

import { colors } from './src/theme/colors';

// ─── Auth Context ───────────────────────────────────────────────
type AuthContextType = {
  user: any | null;
  token: string | null;
  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = React.createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  logout: async () => {},
});

// ─── Navigators ─────────────────────────────────────────────────
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrderList" component={OrderListScreen} />
      {/* Thêm OrderDetail, OrderCreate ở đây sau */}
    </Stack.Navigator>
  );
}

function CustomersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerList" component={CustomerListScreen} />
      {/* Thêm CustomerDetail ở đây sau */}
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, any> = {
            Dashboard: focused ? 'grid' : 'grid-outline',
            Orders: focused ? 'receipt' : 'receipt-outline',
            Customers: focused ? 'people' : 'people-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Tổng quan' }} />
      <Tab.Screen name="Orders" component={OrdersStack} options={{ tabBarLabel: 'Đơn hàng' }} />
      <Tab.Screen name="Customers" component={CustomersStack} options={{ tabBarLabel: 'Khách hàng' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Tôi' }} />
    </Tab.Navigator>
  );
}

// ─── Root App ───────────────────────────────────────────────────
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Check stored auth on startup
  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('token');
        const storedUser = await SecureStore.getItemAsync('user');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        // token lỗi → clear
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const login = async (newToken: string, newUser: any) => {
    await SecureStore.setItemAsync('token', newToken);
    await SecureStore.setItemAsync('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setToken(null);
    setUser(null);
  };

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgLight }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textMid, fontWeight: '600', fontSize: 13 }}>
          Đang khởi động...
        </Text>
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      <SafeAreaProvider>
        <NavigationContainer>
          {token ? <MainTabs /> : <LoginScreen />}
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}
