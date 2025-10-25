import React, { createContext, ReactNode, useContext } from 'react';
import { User } from '../services/firebaseService';

// Definir el tipo del contexto
interface UserContextType {
  userData: User | null;
  onLogout: () => void;
}

// Crear el contexto
const UserContext = createContext<UserContextType | undefined>(undefined);

// Props del provider
interface UserProviderProps {
  userData: User | null;
  onLogout: () => void;
  children: ReactNode;
}

// Componente Provider
export const UserProvider: React.FC<UserProviderProps> = ({ userData, onLogout, children }) => {
  return (
    <UserContext.Provider value={{ userData, onLogout }}>
      {children}
    </UserContext.Provider>
  );
};

// Hook para usar el contexto
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Exportar como default para compatibilidad
export default UserProvider;

