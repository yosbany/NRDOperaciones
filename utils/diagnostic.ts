import { checkUserInFirebaseAuth, listUsersInDatabase, testFirebaseConnection } from './createUsers';

/**
 * Script de diagnóstico completo para problemas de acceso
 */
export const runDiagnostic = async () => {
  console.log('🔍 ===== DIAGNÓSTICO DE FIREBASE =====');
  console.log('');
  
  // 1. Probar conexión con Firebase
  console.log('1️⃣ Probando conexión con Firebase...');
  const connectionOk = await testFirebaseConnection();
  console.log('');
  
  if (!connectionOk) {
    console.log('❌ Error de conexión. Verifica:');
    console.log('   - Configuración de Firebase en firebaseConfig.ts');
    console.log('   - Conexión a internet');
    console.log('   - Reglas de seguridad de Firebase');
    return;
  }
  
  // 2. Listar usuarios en la base de datos
  console.log('2️⃣ Verificando usuarios en la base de datos...');
  const users = await listUsersInDatabase();
  console.log('');
  
  // 3. Instrucciones de verificación
  console.log('3️⃣ Verificaciones manuales necesarias:');
  console.log('');
  console.log('📋 En Firebase Console:');
  console.log('   1. Ve a Authentication → Users');
  console.log('   2. Verifica que el usuario esté creado');
  console.log('   3. Verifica que el email esté correcto');
  console.log('   4. Verifica que el usuario esté habilitado');
  console.log('');
  console.log('📋 En Realtime Database:');
  console.log('   1. Ve a Realtime Database → users');
  console.log('   2. Verifica que exista el nodo del usuario');
  console.log('   3. Verifica que tenga el rol correcto');
  console.log('');
  
  // 4. Posibles problemas y soluciones
  console.log('4️⃣ Posibles problemas y soluciones:');
  console.log('');
  console.log('🔴 Problema: Usuario no existe en Firebase Auth');
  console.log('   Solución: Crear usuario en Firebase Console → Authentication → Users');
  console.log('');
  console.log('🔴 Problema: Contraseña incorrecta');
  console.log('   Solución: Resetear contraseña en Firebase Console');
  console.log('');
  console.log('🔴 Problema: Usuario no existe en base de datos');
  console.log('   Solución: El usuario se crea automáticamente en el primer login');
  console.log('');
  console.log('🔴 Problema: Reglas de seguridad bloquean acceso');
  console.log('   Solución: Verificar reglas en Realtime Database → Rules');
  console.log('');
  console.log('🔴 Problema: Email no verificado');
  console.log('   Solución: Verificar email o deshabilitar verificación en Firebase Console');
  console.log('');
  
  // 5. Comandos de prueba
  console.log('5️⃣ Comandos para probar:');
  console.log('');
  console.log('// Probar conexión');
  console.log('await testFirebaseConnection();');
  console.log('');
  console.log('// Listar usuarios');
  console.log('await listUsersInDatabase();');
  console.log('');
  console.log('// Verificar usuario específico');
  console.log('await checkUserInFirebaseAuth("tu-email@ejemplo.com");');
  console.log('');
  
  console.log('✅ ===== DIAGNÓSTICO COMPLETADO =====');
};

/**
 * Función específica para diagnosticar un usuario
 */
export const diagnoseUser = async (email: string) => {
  console.log(`🔍 ===== DIAGNÓSTICO PARA ${email} =====`);
  console.log('');
  
  // 1. Verificar conexión
  const connectionOk = await testFirebaseConnection();
  if (!connectionOk) {
    console.log('❌ Error de conexión con Firebase');
    return;
  }
  
  // 2. Verificar usuario en Firebase Auth
  console.log('🔐 Verificando en Firebase Authentication...');
  await checkUserInFirebaseAuth(email);
  console.log('');
  
  // 3. Verificar usuario en base de datos
  console.log('📊 Verificando en base de datos...');
  const users = await listUsersInDatabase();
  const userInDB = users.find(u => u.email === email);
  
  if (userInDB) {
    console.log('✅ Usuario encontrado en base de datos:');
    console.log(`   UID: ${userInDB.uid}`);
    console.log(`   Rol: ${userInDB.role}`);
    console.log(`   ContactId: ${userInDB.contactId}`);
  } else {
    console.log('❌ Usuario no encontrado en base de datos');
    console.log('   Se creará automáticamente en el primer login');
  }
  console.log('');
  
  // 4. Instrucciones específicas
  console.log('📋 Pasos para solucionar:');
  console.log('');
  console.log('1. Verifica en Firebase Console → Authentication → Users');
  console.log(`   - Busca el usuario: ${email}`);
  console.log('   - Verifica que esté habilitado');
  console.log('   - Verifica que el email esté correcto');
  console.log('');
  console.log('2. Si el usuario no existe:');
  console.log('   - Crea el usuario en Firebase Console');
  console.log('   - O usa el botón "Add User"');
  console.log('');
  console.log('3. Si el usuario existe pero no puede acceder:');
  console.log('   - Verifica la contraseña');
  console.log('   - Considera resetear la contraseña');
  console.log('');
  console.log('4. Después del primer login exitoso:');
  console.log('   - Ve a Realtime Database → users');
  console.log('   - Asigna el rol correcto (ADMIN o PRODUCTOR)');
  console.log('   - Para PRODUCTOR, asigna el contactId');
  console.log('');
  
  console.log('✅ ===== DIAGNÓSTICO COMPLETADO =====');
};
