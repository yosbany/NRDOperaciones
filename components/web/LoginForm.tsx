import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={styles.webForm}>
          <Text style={styles.webTitle}>Iniciar Sesión</Text>
          
          {error && (
            <View style={styles.webErrorContainer}>
              <Text style={styles.webErrorText}>{error}</Text>
            </View>
          )}

          <View style={styles.webInputContainer}>
            <Text style={styles.webLabel}>Email:</Text>
            <TextInput
              style={styles.webInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Ingresa tu email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.webInputContainer}>
            <Text style={styles.webLabel}>Contraseña:</Text>
            <TextInput
              style={styles.webInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Ingresa tu contraseña"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.webButton, loading && styles.webButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.webButtonText}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Text>
          </TouchableOpacity>

          <View style={styles.webInfoContainer}>
            <Text style={styles.webInfoTitle}>⚠️ Usuarios de prueba:</Text>
            <Text style={styles.webInfoText}>
              <Text style={styles.webInfoBold}>Necesitas crear estos usuarios en Firebase Authentication:</Text>
              {'\n'}• admin@nrd.com / admin123
              {'\n'}• productor@nrd.com / productor123
              {'\n\n'}
              <Text style={styles.webInfoBold}>O usa cualquier email/contraseña que tengas en Firebase Auth</Text>
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Mobile version
  return (
    <ScrollView style={styles.mobileContainer}>
      <View style={styles.mobileForm}>
        <Text style={styles.mobileTitle}>Iniciar Sesión</Text>
        
        {error && (
          <View style={styles.mobileErrorContainer}>
            <Text style={styles.mobileErrorText}>{error}</Text>
          </View>
        )}

        <View style={styles.mobileInputContainer}>
          <Text style={styles.mobileLabel}>Email:</Text>
          <TextInput
            style={styles.mobileInput}
            value={email}
            onChangeText={setEmail}
            placeholder="Ingresa tu email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.mobileInputContainer}>
          <Text style={styles.mobileLabel}>Contraseña:</Text>
          <TextInput
            style={styles.mobileInput}
            value={password}
            onChangeText={setPassword}
            placeholder="Ingresa tu contraseña"
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.mobileButton, loading && styles.mobileButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.mobileButtonText}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Text>
        </TouchableOpacity>

        <View style={styles.mobileInfoContainer}>
          <Text style={styles.mobileInfoTitle}>⚠️ Usuarios de prueba:</Text>
          <Text style={styles.mobileInfoText}>
            <Text style={styles.mobileInfoBold}>Necesitas crear estos usuarios en Firebase Authentication:</Text>
            {'\n'}• admin@nrd.com / admin123
            {'\n'}• productor@nrd.com / productor123
            {'\n\n'}
            <Text style={styles.mobileInfoBold}>O usa cualquier email/contraseña que tengas en Firebase Auth</Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // Web styles
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  webForm: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  webTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  webErrorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  webErrorText: {
    color: '#c33',
    textAlign: 'center',
    fontSize: 14,
  },
  webInputContainer: {
    marginBottom: 16,
  },
  webLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  webInput: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    fontSize: 16,
    backgroundColor: 'white',
  },
  webButton: {
    width: '100%',
    padding: 12,
    backgroundColor: '#667eea',
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 16,
  },
  webButtonDisabled: {
    backgroundColor: '#ccc',
  },
  webButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  webInfoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 4,
  },
  webInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  webInfoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  webInfoBold: {
    fontWeight: 'bold',
  },

  // Mobile styles
  mobileContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mobileForm: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  mobileTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 32,
  },
  mobileErrorContainer: {
    backgroundColor: '#fee',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  mobileErrorText: {
    color: '#c33',
    textAlign: 'center',
    fontSize: 16,
  },
  mobileInputContainer: {
    marginBottom: 20,
  },
  mobileLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  mobileInput: {
    width: '100%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: 'white',
  },
  mobileButton: {
    width: '100%',
    padding: 16,
    backgroundColor: '#667eea',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  mobileButtonDisabled: {
    backgroundColor: '#ccc',
  },
  mobileButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  mobileInfoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 8,
  },
  mobileInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  mobileInfoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  mobileInfoBold: {
    fontWeight: 'bold',
  },
});

export default LoginForm;
