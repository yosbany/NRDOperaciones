import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';

interface SimpleLoginProps {
  onLogin: (email: string, password: string) => void;
  isLoading?: boolean;
}

export default function SimpleLogin({ onLogin, isLoading = false }: SimpleLoginProps) {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      // Autocompletar el dominio si no se incluye
      const email = username.includes('@') 
        ? username.trim() 
        : `${username.trim()}@nrd.com`;
      
      console.log('📧 Email construido:', email);
      
      await onLogin(email, password);
    } catch (error: any) {
      Alert.alert('Error de autenticación', error.message || 'Error al iniciar sesión');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Logo y título principal */}
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>NRD Operación</Text>
            <Text style={styles.description}>
              Sistema de gestión de órdenes
            </Text>
          </View>

          {/* Formulario de login */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Ionicons name="person" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Usuario"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
                disabled={isLoading}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.loginButtonText}>Cargando...</Text>
              ) : (
                <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.tint,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 5,
  },
  description: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#333',
  },
  passwordToggle: {
    padding: 12,
  },
  loginButton: {
    backgroundColor: Colors.tint,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
