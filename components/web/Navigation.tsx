import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const Navigation: React.FC = () => {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/web');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (Platform.OS !== 'web') {
    return null; // Solo mostrar en web
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NRD Operaciones</Text>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {user?.displayName || user?.username}
          </Text>
          <View style={[styles.roleBadge, { 
            backgroundColor: user?.role === 'ADMIN' ? '#667eea' : '#28a745' 
          }]}>
            <Text style={styles.roleText}>
              {user?.role === 'ADMIN' ? 'Administrador' : 'Productor'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.nav}>
        <TouchableOpacity 
          onPress={() => router.push('/web')} 
          style={styles.navItem}
        >
          <Text style={styles.navText}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => router.push('/web/ordenes')} 
          style={styles.navItem}
        >
          <Text style={styles.navText}>Órdenes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => router.push('/web/tareas')} 
          style={styles.navItem}
        >
          <Text style={styles.navText}>Tareas</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => router.push('/web/productos')} 
          style={styles.navItem}
        >
          <Text style={styles.navText}>Productos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => router.push('/web/contactos')} 
          style={styles.navItem}
        >
          <Text style={styles.navText}>Contactos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => router.push('/web/costos')} 
          style={styles.navItem}
        >
          <Text style={styles.navText}>Costos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userName: {
    fontSize: 16,
    color: '#333',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  logoutText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  nav: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  navItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  navText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default Navigation;
