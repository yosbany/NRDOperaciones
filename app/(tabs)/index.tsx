import { Redirect } from 'expo-router';

// Redirigir a Órdenes (primera pestaña)
export default function IndexRedirect() {
  return <Redirect href="/(tabs)/ordenes" />;
}
