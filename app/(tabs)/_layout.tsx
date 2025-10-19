import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useUser } from '../../components/UserContext';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  // Usar useUser con manejo de errores
  let userData = null;
  try {
    const userContext = useUser();
    userData = userContext.userData;
  } catch (error) {
    console.warn('⚠️ TabLayout: UserContext no disponible aún, esperando...');
    // Si el contexto no está disponible, mostrar loading o retornar null
    return null;
  }

  // Si el usuario no tiene rol definido, mostrar pantalla de acceso restringido
  if (userData && !userData.role) {
    return <RestrictedAccess />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#ffb3b3',
        tabBarStyle: {
          backgroundColor: Colors.tint,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ordenes"
        options={{
          title: 'Órdenes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="productos"
        options={{
          title: 'Productos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="costos"
        options={{
          title: 'Costos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calculator" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contactos"
        options={{
          title: 'Contactos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
