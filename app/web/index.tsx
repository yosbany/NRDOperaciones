import Dashboard from '../../components/web/Dashboard';
import LoginForm from '../../components/web/LoginForm';
import { useAuth } from '../../contexts/AuthContext';

export default function WebHome() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // El AuthProvider maneja el loading
  }

  if (!user) {
    return <LoginForm />;
  }

  return <Dashboard />;
}
