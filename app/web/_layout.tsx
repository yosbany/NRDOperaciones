import { Stack } from 'expo-router';
import { Platform, View } from 'react-native';
import Navigation from '../../components/web/Navigation';
import { AuthProvider } from '../../contexts/AuthContext';

export default function WebLayout() {
  return (
    <AuthProvider>
      <View style={{ flex: 1 }}>
        {Platform.OS === 'web' && <Navigation />}
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="ordenes" />
          <Stack.Screen name="tareas" />
          <Stack.Screen name="productos" />
          <Stack.Screen name="contactos" />
          <Stack.Screen name="costos" />
        </Stack>
      </View>
    </AuthProvider>
  );
}
