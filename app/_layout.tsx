import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { User as FirebaseAuthUser, onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CustomTabs from '../components/CustomTabs';
import RestrictedAccess from '../components/RestrictedAccess';
import SimpleLogin from '../components/SimpleLogin';
import UserProvider from '../components/UserContext';
import { clearAuthState, getUserData, hasValidSession, saveAuthState, saveUserData } from '../services/authStorage';
import { User, diagnosticarUsuario, getUserByUid, loginWithFirebase, logout, setupFCMForUser } from '../services/firebaseUnified';
import { auth } from '../shared/services/firebaseConfig';
// Importación condicional de notificaciones para compatibilidad con Expo Go
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.warn('⚠️ expo-notifications no disponible en Expo Go. Se deshabilitarán las notificaciones push.');
}


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
        console.log('🔄 Verificando estado inicial de autenticación...');
        
        // Verificar si Firebase Auth tiene un usuario activo
        if (!auth) {
          console.error('❌ Firebase Auth no está inicializado');
          setIsLoading(false);
          setIsCheckingAuth(false);
          return;
        }
        
        const currentUser = auth.currentUser;
        console.log('🔐 Usuario actual de Firebase Auth:', currentUser ? currentUser.email : 'Ninguno');
        
        if (currentUser) {
          console.log('✅ Usuario autenticado encontrado en Firebase Auth, cargando datos...');
          
          // Obtener datos del usuario desde la base de datos
          const userDataFromFirebase = await getUserByUid(currentUser.uid);
          
          if (userDataFromFirebase) {
            setUserData(userDataFromFirebase);
            setIsAuthenticated(true);
            console.log('✅ Sesión restaurada desde Firebase Auth:', userDataFromFirebase.email);
            
            // Configurar FCM para notificaciones push
            try {
              await setupFCMForUser(userDataFromFirebase);
            } catch (fcmError) {
              console.warn('⚠️ Error configurando FCM:', fcmError);
            }
          } else {
            console.log('⚠️ Usuario de Firebase Auth no encontrado en base de datos');
            // Limpiar sesión si no hay datos en la base de datos
            await logout();
          }
        } else {
          console.log('📱 No hay usuario autenticado en Firebase Auth');
          
          // Verificar si hay una sesión válida guardada en AsyncStorage
          const hasSession = await hasValidSession();
          
          if (hasSession) {
            console.log('📱 Sesión válida encontrada en AsyncStorage, restaurando desde almacenamiento local...');
            
            // Obtener datos del usuario guardados
            const savedUserData = await getUserData();
            
            if (savedUserData) {
              // Marcar inmediatamente que hay una sesión restaurada para evitar mostrar login
              setSessionRestoredFromStorage(true);
              setUserData(savedUserData);
              setIsAuthenticated(true);
              console.log('✅ Sesión restaurada desde AsyncStorage:', savedUserData.email);
              
              // Configurar FCM para notificaciones push
              try {
                await setupFCMForUser(savedUserData);
              } catch (fcmError) {
                console.warn('⚠️ Error configurando FCM:', fcmError);
              }
              
              // Ya se marcó arriba, solo log
              console.log('📱 Sesión ya marcada como restaurada desde AsyncStorage');
              
              // Forzar a Firebase Auth a verificar la persistencia
              console.log('🔄 Forzando verificación de persistencia de Firebase Auth...');
              try {
                // Esperar un poco para que Firebase Auth se inicialice completamente
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Verificar si Firebase Auth se sincronizó automáticamente
                const currentUserAfterWait = auth.currentUser;
                if (currentUserAfterWait) {
                  console.log('✅ Firebase Auth se sincronizó automáticamente:', currentUserAfterWait.email);
                  setSessionRestoredFromStorage(false);
                } else {
                  console.log('⚠️ Firebase Auth no se sincronizó automáticamente, usando sesión local');
                }
              } catch (syncError) {
                console.warn('⚠️ Error verificando sincronización de Firebase Auth:', syncError);
              }
            } else {
              console.log('⚠️ No se pudieron obtener datos del usuario desde AsyncStorage');
              await clearAuthState();
            }
          } else {
            console.log('📱 No hay sesión válida guardada');
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
    
    console.log('🔍 Configurando listener de autenticación...');
    
    if (!auth) {
      console.error('❌ Firebase Auth no está inicializado para el listener');
      return;
    }
    
    console.log('🔍 Estado actual antes de configurar listener:', {
      isAuthenticated: isAuthenticatedRef.current,
      hasUserData: !!userDataRef.current,
      sessionRestored: sessionRestoredRef.current,
      firebaseCurrentUser: auth.currentUser?.uid
    });
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseAuthUser | null) => {
      console.log('🔄 Estado de autenticación cambiado:', firebaseUser ? `Usuario presente (${firebaseUser.uid})` : 'Usuario ausente');
      console.log('🔍 Estado actual en listener:', {
        isAuthenticated: isAuthenticatedRef.current,
        hasUserData: !!userDataRef.current,
        sessionRestored: sessionRestoredRef.current,
        firebaseCurrentUser: auth.currentUser?.uid
      });
      
      // Si la sesión fue restaurada desde AsyncStorage, no interferir hasta que Firebase Auth se sincronice
      if (sessionRestoredRef.current && !firebaseUser) {
        console.log('⚠️ Sesión restaurada desde AsyncStorage, esperando sincronización de Firebase Auth');
        return;
      }
      
      // Si ya tenemos una sesión válida y Firebase Auth no tiene usuario,
      // no limpiar la sesión - puede ser una restauración desde AsyncStorage
      if (!firebaseUser && isAuthenticatedRef.current && userDataRef.current) {
        console.log('⚠️ Firebase Auth no tiene usuario pero hay sesión válida local, manteniendo sesión');
        return;
      }
      
      if (firebaseUser) {
        try {
          console.log('🔍 Intentando obtener datos del usuario desde Firebase Database...');
          // Obtener datos del usuario desde la base de datos
          const userDataFromFirebase = await getUserByUid(firebaseUser.uid);
          
          if (userDataFromFirebase) {
            setUserData(userDataFromFirebase);
            setIsAuthenticated(true);
            console.log('✅ Usuario autenticado:', firebaseUser.email, 'Rol:', userDataFromFirebase.role);
            
            // NO limpiar la bandera de sesión restaurada para evitar mostrar login
            if (sessionRestoredRef.current) {
              console.log('🔄 Firebase Auth sincronizado, manteniendo bandera de sesión restaurada');
              // setSessionRestoredFromStorage(false); // Comentado para evitar mostrar login
            }
            
            // Guardar estado de autenticación y datos del usuario
            try {
              await saveAuthState(true);
              await saveUserData(userDataFromFirebase);
              console.log('💾 Estado de autenticación y datos del usuario guardados');
            } catch (storageError) {
              console.warn('⚠️ Error guardando estado de autenticación:', storageError);
            }
            
            // Configurar FCM para notificaciones push
            try {
              await setupFCMForUser(userDataFromFirebase);
            } catch (fcmError) {
              console.warn('⚠️ Error configurando FCM:', fcmError);
            }
          } else {
            console.log('⚠️ Usuario no encontrado en base de datos, pero manteniendo autenticación');
            console.log('🔍 UID del usuario:', firebaseUser.uid);
            console.log('🔍 Email del usuario:', firebaseUser.email);
            
            // Ejecutar diagnóstico para usuarios específicos que están teniendo problemas
            if (firebaseUser.uid === 'smD4POpJSBeKTmgBSITXJTI2lGV2') {
              console.log('🔍 Ejecutando diagnóstico para usuario problemático...');
              await diagnosticarUsuario(firebaseUser.uid);
            }
            
            // NO cerrar sesión automáticamente - mantener la autenticación de Firebase
            // El usuario puede estar en proceso de creación o puede ser un usuario válido
            // que aún no se ha sincronizado con la base de datos
            setIsAuthenticated(true);
            setUserData(null); // No hay datos de usuario, pero mantiene autenticación
            
            // Intentar obtener datos del usuario desde AsyncStorage como fallback
            try {
              const storedUserData = await getUserData();
              if (storedUserData && storedUserData.id === firebaseUser.uid) {
                console.log('📱 Usando datos de usuario guardados localmente');
                setUserData(storedUserData);
              }
            } catch (storageError) {
              console.warn('⚠️ Error obteniendo datos guardados:', storageError);
            }
          }
        } catch (error) {
          console.error('❌ Error cargando datos del usuario:', error);
          console.log('🔍 Tipo de error:', (error as any).message);
          
          // NO cerrar sesión automáticamente por errores de base de datos
          // Mantener la autenticación de Firebase y intentar recuperar datos guardados
          console.log('🔄 Manteniendo autenticación a pesar del error, intentando recuperar datos guardados...');
          setIsAuthenticated(true);
          setUserData(null);
          
          // Intentar obtener datos del usuario desde AsyncStorage como fallback
          try {
            const storedUserData = await getUserData();
            if (storedUserData && storedUserData.id === firebaseUser.uid) {
              console.log('📱 Usando datos de usuario guardados localmente como fallback');
              setUserData(storedUserData);
            }
          } catch (storageError) {
            console.warn('⚠️ Error obteniendo datos guardados como fallback:', storageError);
          }
        }
      } else {
        // Usuario no autenticado - solo limpiar cuando Firebase Auth confirma que no hay usuario
        // Y no hay una sesión válida restaurada desde AsyncStorage
        if (!isAuthenticatedRef.current || !userDataRef.current) {
          console.log('🚪 Usuario no autenticado, limpiando estado');
          setIsAuthenticated(false);
          setUserData(null);
          
          // Limpiar estado de autenticación guardado
          try {
            await clearAuthState();
            console.log('🧹 Estado de autenticación limpiado del almacenamiento local');
          } catch (storageError) {
            console.warn('⚠️ Error limpiando estado de autenticación:', storageError);
          }
        } else {
          console.log('⚠️ Firebase Auth no tiene usuario pero hay sesión local válida, manteniendo sesión');
        }
      }
      setIsLoading(false);
    });

    return () => {
      console.log('🧹 Limpiando listener de autenticación');
      unsubscribe();
    };
  }, [isInitialLoad]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    try {
      const userDataFromFirebase = await loginWithFirebase(email, password);
      setUserData(userDataFromFirebase);
      setIsAuthenticated(true);
      console.log('✅ Usuario autenticado:', email, 'Rol:', userDataFromFirebase.role);
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      console.log('🔐 Iniciando logout desde layout...');
      await logoutFromFirebase();
      // El onAuthStateChanged debería manejar esto, pero por si acaso:
      setIsAuthenticated(false);
      setUserData(null);
      console.log('✅ Logout completado desde layout');
    } catch (error) {
      console.error('❌ Error en logout desde layout:', error);
    }
  }, []);

  // Configurar y solicitar permisos de notificaciones al iniciar la app
  useEffect(() => {
    const configurarNotificaciones = async () => {
      if (!Notifications) {
        console.warn('⚠️ Notificaciones no disponibles - saltando configuración');
        return;
      }
      
      try {
        // Configurar el comportamiento de las notificaciones
        Notifications.setNotificationHandler({
          handleNotification: async (notification) => {
            console.log('🔔 Notificación recibida:', notification.request.content);
            
            // Mostrar notificaciones tanto en foreground como en background
            // pero con diferentes comportamientos
            const appState = AppState.currentState;
            if (appState === 'active') {
              console.log('📱 App en foreground, mostrando notificación con banner');
              return {
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
              };
            }
            
            // Si la app está en background o cerrada, mostrar la notificación completa
            console.log('📱 App en background, mostrando notificación completa');
            return {
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
              shouldShowBanner: true,
              shouldShowList: true,
            };
          },
        });

        // Verificar y solicitar permisos
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.warn('⚠️ Permisos de notificaciones no concedidos');
          return;
        }
        
        console.log('✅ Permisos de notificaciones concedidos');
        
        // Verificar si las notificaciones están habilitadas en el sistema
        const settings = await Notifications.getPermissionsAsync();
        console.log('📱 Estado de permisos de notificaciones:', settings);
        
      } catch (error) {
        console.error('❌ Error configurando notificaciones:', error);
      }
    };

    configurarNotificaciones();
  }, []);

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
          {/* Si el usuario no tiene datos o no tiene rol asignado, mostrar pantalla de acceso restringido */}
          {!userData || !userData.role ? (
            <RestrictedAccess />
          ) : (
            <>
              <CustomTabs userData={userData} />
              <StatusBar style="auto" />
            </>
          )}
        </UserProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
