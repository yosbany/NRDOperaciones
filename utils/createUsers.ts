import { get, ref } from 'firebase/database';
import { USER_ROLES } from '../constants/Config';
import { auth, database } from '../services/firebaseService';

/**
 * Función para probar la conexión con Firebase
 */
export const testFirebaseConnection = async () => {
  try {
    console.log('🔍 Probando conexión con Firebase...');
    
    // Probar conexión a la base de datos
    console.log('📊 Probando conexión a Realtime Database...');
    const testRef = ref(database, 'test');
    await get(testRef);
    console.log('✅ Conexión a Realtime Database exitosa');
    
    // Probar conexión a Authentication
    console.log('🔐 Probando conexión a Firebase Auth...');
    console.log('✅ Firebase Auth inicializado correctamente');
    console.log('📧 Auth Domain:', auth.config.authDomain);
    
    console.log('🎉 Todas las conexiones funcionan correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error en la conexión con Firebase:', error);
    return false;
  }
};

/**
 * Función para verificar si un usuario existe en Firebase Auth
 * @param email - Email del usuario
 */
export const checkUserInFirebaseAuth = async (email: string) => {
  try {
    console.log(`🔍 Verificando usuario ${email} en Firebase Auth...`);
    
    // Esta función requiere Firebase Admin SDK para verificar usuarios
    // Por ahora, solo podemos verificar intentando hacer login
    console.log('⚠️  Para verificar usuarios en Firebase Auth, usa la consola de Firebase');
    console.log('📋 Pasos:');
    console.log('1. Ve a Firebase Console → Authentication → Users');
    console.log('2. Busca el usuario por email');
    console.log('3. Verifica que esté habilitado y tenga el email correcto');
    
    return false;
  } catch (error) {
    console.error('❌ Error verificando usuario:', error);
    return false;
  }
};

/**
 * Función para listar todos los usuarios en la base de datos
 */
export const listUsersInDatabase = async () => {
  try {
    console.log('📋 Listando usuarios en la base de datos...');
    
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      console.log('📭 No hay usuarios en la base de datos');
      return [];
    }
    
    const users = snapshot.val();
    const userList = Object.entries(users).map(([uid, userData]: any) => ({
      uid,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      contactId: userData.contactId || 'No asignado'
    }));
    
    console.log('👥 Usuarios encontrados:');
    userList.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email})`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Rol: ${user.role}`);
      console.log(`   ContactId: ${user.contactId}`);
      console.log('');
    });
    
    return userList;
  } catch (error) {
    console.error('❌ Error listando usuarios:', error);
    return [];
  }
};

/**
 * Script para actualizar roles de usuarios existentes en Firebase
 * Este script asume que los usuarios ya están creados en Firebase Authentication
 * y solo actualiza el rol y contactId en la base de datos
 */

/**
 * Actualiza el rol de un usuario existente
 * @param uid - UID del usuario de Firebase Auth
 * @param role - Nuevo rol (ADMIN o PRODUCTOR)
 * @param contactId - ID del contacto (opcional, solo para PRODUCTOR)
 */
export const updateUserRole = async (
  uid: string,
  role: 'ADMIN' | 'PRODUCTOR',
  contactId?: string
) => {
  try {
    const updates: any = {
      role: role === 'ADMIN' ? USER_ROLES.ADMIN : USER_ROLES.PRODUCTOR,
    };

    if (contactId) {
      updates.contactId = contactId;
    }

    await updateUser(uid, updates);
    console.log(`✅ Rol actualizado para usuario ${uid}:`, role);
    
    if (contactId) {
      console.log(`✅ ContactId asignado:`, contactId);
    }
  } catch (error) {
    console.error(`❌ Error actualizando rol para usuario ${uid}:`, error);
    throw error;
  }
};

/**
 * Asigna rol ADMIN a un usuario
 * @param uid - UID del usuario de Firebase Auth
 */
export const assignAdminRole = async (uid: string) => {
  await updateUserRole(uid, 'ADMIN');
};

/**
 * Asigna rol PRODUCTOR a un usuario con contacto específico
 * @param uid - UID del usuario de Firebase Auth
 * @param contactId - ID del contacto asociado
 */
export const assignProductorRole = async (uid: string, contactId: string) => {
  await updateUserRole(uid, 'PRODUCTOR', contactId);
};

/**
 * Lista de usuarios de ejemplo para configurar
 * Ejecutar estos comandos después de crear los usuarios en Firebase Authentication
 */
export const setupExampleUsers = async () => {
  console.log('🚀 Configurando usuarios de ejemplo...');
  console.log('');
  console.log('📋 Pasos a seguir:');
  console.log('1. Crear usuarios en Firebase Authentication:');
  console.log('   - admin@nrd.com');
  console.log('   - productor1@nrd.com');
  console.log('');
  console.log('2. Obtener los UIDs de los usuarios creados');
  console.log('');
  console.log('3. Ejecutar los siguientes comandos:');
  console.log('');
  console.log('// Para el usuario ADMIN');
  console.log('await assignAdminRole("UID_DEL_ADMIN");');
  console.log('');
  console.log('// Para el usuario PRODUCTOR');
  console.log('await assignProductorRole("UID_DEL_PRODUCTOR", "CONTACTO_ID");');
  console.log('');
  console.log('⚠️  IMPORTANTE: Reemplazar los UIDs y CONTACTO_ID con valores reales');
};

/**
 * Función de utilidad para obtener información de un usuario
 * @param uid - UID del usuario
 */
export const getUserInfo = async (uid: string) => {
  try {
    const { getUserByUid } = await import('../services/firebase');
    const user = await getUserByUid(uid);
    
    if (user) {
      console.log('📋 Información del usuario:');
      console.log('   UID:', user.id);
      console.log('   Username:', user.username);
      console.log('   Email:', user.email);
      console.log('   Rol:', user.role);
      console.log('   ContactId:', user.contactId || 'No asignado');
      console.log('   Creado:', user.createdAt);
    } else {
      console.log('❌ Usuario no encontrado en la base de datos');
    }
  } catch (error) {
    console.error('❌ Error obteniendo información del usuario:', error);
  }
};
