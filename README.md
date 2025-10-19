# NRD Operaciones 📱

Aplicación móvil para la gestión de operaciones de NRD, desarrollada con React Native y Expo.

## 🚀 Características

- **Gestión de Órdenes**: Crear, editar y gestionar órdenes de trabajo
- **Control de Productos**: Administración del catálogo de productos
- **Gestión de Contactos**: Base de datos de contactos y clientes
- **Control de Costos**: Seguimiento y análisis de costos operativos
- **Autenticación**: Sistema de login seguro con Firebase
- **Notificaciones**: Sistema de notificaciones push
- **Multiplataforma**: Compatible con Android e iOS

## 🛠️ Tecnologías

- **React Native** con Expo
- **TypeScript** para tipado estático
- **Firebase** para backend y autenticación
- **React Navigation** para navegación
- **Expo Notifications** para notificaciones push

## 📋 Requisitos Previos

- Node.js (versión 18 o superior)
- npm o yarn
- Expo CLI
- Cuenta de Firebase (para funcionalidades completas)

## 🚀 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/yosbany/NRDOperaciones.git
   cd NRDOperaciones
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar Firebase**
   - Copia los archivos de configuración de Firebase:
     - `google-services.json` (Android)
     - `GoogleService-Info.plist` (iOS)

4. **Iniciar la aplicación**
   ```bash
   npx expo start
   ```

## 📱 Desarrollo

### Opciones de desarrollo:

- **Expo Go**: Escanea el código QR con la app Expo Go
- **Android Emulator**: Ejecuta en emulador de Android Studio
- **iOS Simulator**: Ejecuta en simulador de iOS (solo macOS)
- **Development Build**: Build personalizado para testing

### Estructura del proyecto:

```
├── app/                    # Páginas principales (file-based routing)
├── components/             # Componentes reutilizables
├── services/               # Servicios (Firebase, notificaciones)
├── constants/              # Constantes y configuraciones
├── hooks/                  # Custom hooks
├── utils/                  # Utilidades y helpers
└── assets/                 # Recursos (imágenes, sonidos)
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm start                   # Inicia el servidor de desarrollo
npm run android            # Ejecuta en Android
npm run ios                # Ejecuta en iOS
npm run web                # Ejecuta en web

# Build
npm run build              # Build para producción
./build-android.sh         # Build para Android
./build-google-play.sh     # Build para Google Play Store
```

## 🔐 Configuración de Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilita Authentication y Realtime Database
3. Descarga los archivos de configuración
4. Configura las reglas de seguridad en `firebase-rules.json`

## 📦 Build para Producción

### Android
```bash
./build-android.sh
```

### Google Play Store
```bash
./build-google-play.sh
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas sobre el proyecto, contacta al equipo de desarrollo.

---

**Desarrollado con ❤️ para NRD Operaciones**
