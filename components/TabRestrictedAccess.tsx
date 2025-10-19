import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';

interface TabRestrictedAccessProps {
  message?: string;
}

export default function TabRestrictedAccess({ 
  message = "No tienes permisos para acceder a esta sección" 
}: TabRestrictedAccessProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Acceso Restringido</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
});
