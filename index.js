/**
 * Punto de Entrada Principal - Compatible con Expo Router
 * 
 * Este archivo actúa como puente entre Expo y nuestra nueva estructura modular
 */

import { registerRootComponent } from 'expo';
import RootLayout from './app/_layout';

// Registrar la aplicación como componente raíz
registerRootComponent(RootLayout);
