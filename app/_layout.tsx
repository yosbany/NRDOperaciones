import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { User as FirebaseAuthUser, onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CustomTabs from '../components/CustomTabs';
import SimpleLogin from '../components/SimpleLogin';
import UserProvider from '../components/UserContext';
import { LoadingProvider } from '../contexts/LoadingContext';
import { User, auth, clearAuthState, createUserInDatabase, getUserByUid, getUserData, hasValidSession, loginWithFirebase, logout, saveAuthState, saveUserData } from '../services/firebaseService';
// Notificaciones eliminadas


export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [sessionRestoredFromStorage, setSessionRestoredFromStorage] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Refs para acceder a los valores actuales sin crear dependencias
  const isAuthenticatedRef = useRef(isAuthenticated);
  const userDataRef = useRef(userData);
  const sessionRestoredRef = useRef(sessionRestoredFromStorage);
  
  // Actualizar refs cuando cambien los valores
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);
  
  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);
  
  useEffect(() => {
    sessionRestoredRef.current = sessionRestoredFromStorage;
  }, [sessionRestoredFromStorage]);

  // Verificar sesión de Firebase Auth al iniciar la aplicación
  useEffect(() => {
    const checkInitialAuthState = async () => {
      try {
        // Verificar si Firebase Auth tiene un usuario activo
        if (!auth) {
          console.error('❌ Firebase Auth no está inicializado');
          setIsLoading(false);
          setIsCheckingAuth(false);
          return;
        }
        
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          // Obtener datos del usuario desde la base de datos
          const userDataFromFirebase = await getUserByUid(currentUser.uid);
          
          if (userDataFromFirebase) {
            setUserData(userDataFromFirebase);
            setIsAuthenticated(true);
          } else {
            try {
              // Crear usuario en la base de datos
              const newUser = await createUserInDatabase(
                currentUser.uid, 
                currentUser.email || '', 
                currentUser.displayName || undefined
              );
              
              setUserData(newUser);
              setIsAuthenticated(true);
            } catch (createError) {
              console.error('❌ Error creando usuario automáticamente:', createError);
              // Limpiar sesión si no se puede crear el usuario
              await logout();
            }
          }
        } else {
          // Verificar si hay una sesión válida guardada en AsyncStorage
          const hasSession = await hasValidSession();
          
          if (hasSession) {
            // Obtener datos del usuario guardados
            const savedUserData = await getUserData();
            
            if (savedUserData) {
              // Marcar inmediatamente que hay una sesión restaurada para evitar mostrar login
              setSessionRestoredFromStorage(true);
              setUserData(savedUserData);
              setIsAuthenticated(true);
              
              // Forzar a Firebase Auth a verificar la persistencia
              try {
                // Esperar un poco para que Firebase Auth se inicialice completamente
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Verificar si Firebase Auth se sincronizó automáticamente
                const currentUserAfterWait = auth.currentUser;
                if (currentUserAfterWait) {
                  setSessionRestoredFromStorage(false);
                } else {
                  // Intentar forzar la sincronización esperando más tiempo
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  const currentUserAfterLongWait = auth.currentUser;
                  if (currentUserAfterLongWait) {
                    setSessionRestoredFromStorage(false);
                  } else {
                    // Intentar re-autenticarse con las credenciales guardadas
                    try {
                      const savedUserData = await getUserData();
                      if (savedUserData && savedUserData.email) {
                        // No tenemos contraseña guardada, limpiar sesión local para forzar login
                        await clearAuthState();
                        setUserData(null);
                        setIsAuthenticated(false);
                        setSessionRestoredFromStorage(false);
                      }
                    } catch (reauthError) {
                      console.error('❌ Error en re-autenticación:', reauthError);
                      await clearAuthState();
                      setUserData(null);
                      setIsAuthenticated(false);
                      setSessionRestoredFromStorage(false);
                    }
                  }
                }
              } catch (_syncError) {
                // Error verificando sincronización de Firebase Auth
              }
            } else {
              await clearAuthState();
            }
          }
        }
      } catch (error) {
        console.error('❌ Error verificando estado inicial de autenticación:', error);
      } finally {
        setIsInitialLoad(false);
        setIsLoading(false);
        setIsCheckingAuth(false);
      }
    };

    checkInitialAuthState();
  }, []);

  // Escuchar cambios en el estado de autenticación de Firebase
  useEffect(() => {
    if (isInitialLoad) return; // Esperar a que termine la restauración inicial
    
    if (!auth) {
      console.error('❌ Firebase Auth no está inicializado para el listener');
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseAuthUser | null) => {
      
      // Si Firebase Auth no tiene usuario, verificar si hay sesión restaurada
      if (!firebaseUser) {
        // Solo limpiar si no hay sesión restaurada desde AsyncStorage
        if (!sessionRestoredRef.current) {
          setIsAuthenticated(false);
          setUserData(null);
          setSessionRestoredFromStorage(false);
        } else {
          // Limpiar la sesión local para forzar al usuario a hacer login nuevamente
          // ya que sin Firebase Auth sincronizado no se puede acceder a la base de datos
          await clearAuthState();
          setIsAuthenticated(false);
          setUserData(null);
          setSessionRestoredFromStorage(false);
        }
        return;
      }
      
      // Firebase Auth tiene usuario, obtener datos y autenticar
      try {
        const userDataFromFirebase = await getUserByUid(firebaseUser.uid);
        
        if (userDataFromFirebase) {
          setUserData(userDataFromFirebase);
          setIsAuthenticated(true);
          setSessionRestoredFromStorage(false); // Ya no es restauración
          
          // Guardar estado
          await saveAuthState(true);
          await saveUserData(userDataFromFirebase);
        } else {
          setIsAuthenticated(false);
          setUserData(null);
          setSessionRestoredFromStorage(false);
        }
      } catch (error) {
        console.error('❌ Error obteniendo datos del usuario:', error);
        setIsAuthenticated(false);
        setUserData(null);
        setSessionRestoredFromStorage(false);
      }
      
      // Si hay sesión restaurada pero Firebase Auth se sincronizó, limpiar la bandera
      if (sessionRestoredRef.current) {
        setSessionRestoredFromStorage(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isInitialLoad]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    try {
      const userDataFromFirebase = await loginWithFirebase(email, password);
      setUserData(userDataFromFirebase);
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setIsAuthenticated(false);
      setUserData(null);
    } catch (error) {
      console.error('❌ Error en logout desde layout:', error);
    }
  }, []);

  // Notificaciones eliminadas

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }


  // Si está verificando autenticación o cargando inicialmente, mostrar loading
  if (isCheckingAuth || isLoading || isInitialLoad) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SimpleLogin onLogin={handleLogin} isLoading={true} />
          <StatusBar style="auto" />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  // Si no está autenticado y no hay sesión restaurada, mostrar login
  if (!isAuthenticated && !sessionRestoredFromStorage) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SimpleLogin onLogin={handleLogin} isLoading={false} />
          <StatusBar style="auto" />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  // Si está autenticado, mostrar la app
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <UserProvider userData={userData} onLogout={handleLogout}>
          <LoadingProvider>
            {/* Autenticado con Firebase Auth = acceso a la app */}
            <>
              <CustomTabs userData={userData} />
              <StatusBar style="auto" />
            </>
          </LoadingProvider>
        </UserProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
