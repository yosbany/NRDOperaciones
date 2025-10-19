import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
// Importación condicional de notificaciones para compatibilidad con Expo Go
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.warn('⚠️ expo-notifications no disponible en Expo Go. Se deshabilitarán las notificaciones push.');
}

// Claves para almacenar el estado de notificaciones
const NOTIFICATION_STATE_KEY = '@nrd_notification_state';
const LAST_NOTIFICATION_KEY = '@nrd_last_notification';

interface NotificationState {
  isAppInForeground: boolean;
  lastNotificationTime: number;
  pendingNotifications: string[]; // IDs de notificaciones pendientes
  visibleNotifications: Map<string, number>; // Tipo de notificación -> timestamp de cuando se mostró
}

interface LastNotificationData {
  type: string;
  id: string;
  timestamp: number;
}

interface SmartNotificationRule {
  type: 'hourly_check' | 'order_created' | 'order_updated' | 'task_created' | 'task_updated';
  targetUsers: 'all' | 'except_creator';
  cooldownMs: number;
  groupKey: string; // Para agrupar notificaciones
}

class NotificationManager {
  private static instance: NotificationManager;
  private appState: AppStateStatus = 'active';
  private appStateSubscription: any = null;
  private hourlyCheckInterval: NodeJS.Timeout | null = null;
  private notificationState: NotificationState = {
    isAppInForeground: true,
    lastNotificationTime: 0,
    pendingNotifications: [],
    visibleNotifications: new Map()
  };

  // Reglas inteligentes de notificaciones
  private readonly smartRules: SmartNotificationRule[] = [
    {
      type: 'hourly_check',
      targetUsers: 'all',
      cooldownMs: 3600000, // 1 hora
      groupKey: 'hourly_reminder'
    },
    {
      type: 'order_created',
      targetUsers: 'except_creator',
      cooldownMs: 30000, // 30 segundos
      groupKey: 'order_updates'
    },
    {
      type: 'order_updated',
      targetUsers: 'except_creator',
      cooldownMs: 30000, // 30 segundos
      groupKey: 'order_updates'
    },
    {
      type: 'task_created',
      targetUsers: 'except_creator',
      cooldownMs: 30000, // 30 segundos
      groupKey: 'task_updates'
    },
    {
      type: 'task_updated',
      targetUsers: 'except_creator',
      cooldownMs: 30000, // 30 segundos
      groupKey: 'task_updates'
    }
  ];

  private constructor() {
    this.initializeAppStateListener();
    this.loadNotificationState();
    this.startHourlyChecks();
  }

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Inicializa el listener del estado de la aplicación
   */
  private initializeAppStateListener(): void {
    const subscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    
    // Guardar la suscripción para poder limpiarla después
    this.appStateSubscription = subscription;
  }

  /**
   * Maneja los cambios de estado de la aplicación
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    console.log('📱 Estado de la app cambió:', this.appState, '->', nextAppState);
    
    this.appState = nextAppState;
    this.notificationState.isAppInForeground = nextAppState === 'active';
    
    this.saveNotificationState();
    
    // Si la app vuelve a estar activa, limpiar notificaciones pendientes
    if (nextAppState === 'active') {
      this.clearPendingNotifications();
    }
  }

  /**
   * Carga el estado de notificaciones desde AsyncStorage
   */
  private async loadNotificationState(): Promise<void> {
    try {
      const stateString = await AsyncStorage.getItem(NOTIFICATION_STATE_KEY);
      if (stateString) {
        const loadedState = JSON.parse(stateString);
        this.notificationState = { 
          ...this.notificationState, 
          ...loadedState,
          visibleNotifications: new Map(loadedState.visibleNotifications || [])
        };
      }
    } catch (error) {
      console.warn('⚠️ Error cargando estado de notificaciones:', error);
    }
  }

  /**
   * Guarda el estado de notificaciones en AsyncStorage
   */
  private async saveNotificationState(): Promise<void> {
    try {
      const stateToSave = {
        ...this.notificationState,
        visibleNotifications: Array.from(this.notificationState.visibleNotifications.entries())
      };
      await AsyncStorage.setItem(NOTIFICATION_STATE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('⚠️ Error guardando estado de notificaciones:', error);
    }
  }

  /**
   * Verifica si se debe enviar una notificación basada en las reglas inteligentes
   */
  public shouldSendSmartNotification(
    type: 'hourly_check' | 'order_created' | 'order_updated' | 'task_created' | 'task_updated',
    id: string,
    creatorUserId?: string
  ): boolean {
    console.log('🧠 Verificando regla inteligente para:', type, id, 'creador:', creatorUserId);

    const rule = this.smartRules.find(r => r.type === type);
    if (!rule) {
      console.warn('⚠️ Regla no encontrada para tipo:', type);
      return false;
    }

    const now = Date.now();

    // 1. Verificar cooldown específico de la regla
    const timeSinceLastNotification = now - this.notificationState.lastNotificationTime;
    if (timeSinceLastNotification < rule.cooldownMs) {
      console.log('⏰ Cooldown activo para regla:', type, 'hace', Math.round(timeSinceLastNotification / 1000), 'segundos');
      return false;
    }

    // 2. Verificar si ya existe una notificación agrupada del mismo tipo
    const visibleNotificationTime = this.notificationState.visibleNotifications.get(rule.groupKey);
    if (visibleNotificationTime) {
      const timeSinceVisible = now - visibleNotificationTime;
      // Si la notificación del mismo grupo se mostró hace menos de 2 minutos, no enviar otra
      if (timeSinceVisible < 120000) { // 2 minutos
        console.log('🚫 Notificación del mismo grupo ya visible, evitando duplicado:', rule.groupKey, 'hace', Math.round(timeSinceVisible / 1000), 'segundos');
        return false;
      }
    }

    // 3. Verificar si ya se envió esta notificación específica recientemente
    const lastNotification = this.getLastNotification(type, id);
    if (lastNotification && (now - lastNotification.timestamp) < rule.cooldownMs) {
      console.log('🔄 Notificación específica duplicada evitada:', type, id);
      return false;
    }

    console.log('✅ Regla inteligente aprobada para envío:', type, id);
    return true;
  }

  /**
   * @deprecated Usar shouldSendSmartNotification en su lugar
   */
  public shouldSendNotification(type: string, id: string, cooldownMs: number = 30000): boolean {
    console.warn('⚠️ shouldSendNotification está deprecated. Usar shouldSendSmartNotification.');
    return this.shouldSendSmartNotification('order_created', id);
  }

  /**
   * Obtiene la última notificación de un tipo e ID específico
   */
  private getLastNotification(type: string, id: string): LastNotificationData | null {
    try {
      const key = `${LAST_NOTIFICATION_KEY}_${type}_${id}`;
      const data = AsyncStorage.getItem(key);
      return data ? JSON.parse(data as any) : null;
    } catch {
      return null;
    }
  }

  /**
   * Registra que se envió una notificación
   */
  public async markNotificationSent(type: string, id: string): Promise<void> {
    try {
      const notificationData: LastNotificationData = {
        type,
        id,
        timestamp: Date.now()
      };

      const key = `${LAST_NOTIFICATION_KEY}_${type}_${id}`;
      await AsyncStorage.setItem(key, JSON.stringify(notificationData));
      
      this.notificationState.lastNotificationTime = notificationData.timestamp;
      await this.saveNotificationState();
      
      console.log('✅ Notificación registrada:', type, id);
    } catch (error) {
      console.warn('⚠️ Error registrando notificación:', error);
    }
  }

  /**
   * Envía una notificación inteligente basada en las reglas
   */
  public async sendSmartNotification(
    type: 'hourly_check' | 'order_created' | 'order_updated' | 'task_created' | 'task_updated',
    title: string,
    body: string,
    id: string,
    data: any = {},
    creatorUserId?: string
  ): Promise<boolean> {
    if (!Notifications) {
      console.warn('⚠️ Notificaciones no disponibles - saltando notificación inteligente:', type, id);
      return false;
    }
    
    if (!this.shouldSendSmartNotification(type, id, creatorUserId)) {
      return false;
    }

    try {
      const rule = this.smartRules.find(r => r.type === type);
      if (!rule) return false;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'notification-sound.wav',
          data: {
            ...data,
            type,
            id,
            timestamp: new Date().toISOString(),
            groupKey: rule.groupKey
          },
        },
        trigger: null, // Inmediata
      });

      // Registrar que se mostró una notificación de este grupo
      this.notificationState.visibleNotifications.set(rule.groupKey, Date.now());
      await this.saveNotificationState();

      await this.markNotificationSent(type, id);
      console.log('✅ Notificación inteligente enviada:', type, id);
      return true;
    } catch (error) {
      console.error('❌ Error enviando notificación inteligente:', error);
      return false;
    }
  }

  /**
   * @deprecated Usar sendSmartNotification en su lugar
   */
  public async sendLocalNotification(
    title: string,
    body: string,
    type: string,
    id: string,
    data: any = {},
    cooldownMs: number = 30000
  ): Promise<boolean> {
    console.warn('⚠️ sendLocalNotification está deprecated. Usar sendSmartNotification.');
    return this.sendSmartNotification('order_created', title, body, id, data);
  }

  /**
   * Envía notificación de nueva orden creada a todos los usuarios excepto al creador
   */
  public async notifyOrderCreated(orden: any, creatorUserId?: string): Promise<void> {
    try {
      console.log('🔔 Enviando notificación de orden creada...');
      
      await this.sendSmartNotification(
        'order_created',
        '🔔 Nueva orden pendiente',
        `Orden creada para: ${orden.proveedorNombre}`,
        `orden_created_${orden.id}`,
        {
          ordenId: orden.id,
          proveedorId: orden.proveedorId,
          proveedorNombre: orden.proveedorNombre,
          timestamp: new Date().toISOString()
        },
        creatorUserId
      );
      
      console.log('✅ Notificación de orden creada enviada');
    } catch (error) {
      console.error('❌ Error enviando notificación de orden creada:', error);
    }
  }

  /**
   * Envía notificación de orden actualizada a todos los usuarios excepto al que la actualizó
   */
  public async notifyOrderUpdated(orden: any, creatorUserId?: string): Promise<void> {
    try {
      console.log('🔔 Enviando notificación de orden actualizada...');
      
      await this.sendSmartNotification(
        'order_updated',
        '📝 Orden actualizada',
        `Orden de ${orden.proveedorNombre} ha sido actualizada`,
        `orden_updated_${orden.id}`,
        {
          ordenId: orden.id,
          proveedorId: orden.proveedorId,
          proveedorNombre: orden.proveedorNombre,
          timestamp: new Date().toISOString()
        },
        creatorUserId
      );
      
      console.log('✅ Notificación de orden actualizada enviada');
    } catch (error) {
      console.error('❌ Error enviando notificación de orden actualizada:', error);
    }
  }

  /**
   * Envía notificación de nueva tarea creada a todos los usuarios excepto al creador
   */
  public async notifyTaskCreated(tarea: any, creatorUserId?: string): Promise<void> {
    try {
      console.log('🔔 Enviando notificación de tarea creada...');
      
      await this.sendSmartNotification(
        'task_created',
        '🔔 Nueva tarea asignada',
        `Tarea: ${tarea.titulo}`,
        `task_created_${tarea.id}`,
        {
          tareaId: tarea.id,
          titulo: tarea.titulo,
          prioridad: tarea.prioridad,
          asignadaA: tarea.asignadaA,
          timestamp: new Date().toISOString()
        },
        creatorUserId
      );
      
      console.log('✅ Notificación de tarea creada enviada');
    } catch (error) {
      console.error('❌ Error enviando notificación de tarea creada:', error);
    }
  }

  /**
   * Envía notificación de tarea actualizada a todos los usuarios excepto al que la actualizó
   */
  public async notifyTaskUpdated(tarea: any, creatorUserId?: string): Promise<void> {
    try {
      console.log('🔔 Enviando notificación de tarea actualizada...');
      
      await this.sendSmartNotification(
        'task_updated',
        '📝 Tarea actualizada',
        `Tarea: ${tarea.titulo} ha sido actualizada`,
        `task_updated_${tarea.id}`,
        {
          tareaId: tarea.id,
          titulo: tarea.titulo,
          prioridad: tarea.prioridad,
          completada: tarea.completada,
          timestamp: new Date().toISOString()
        },
        creatorUserId
      );
      
      console.log('✅ Notificación de tarea actualizada enviada');
    } catch (error) {
      console.error('❌ Error enviando notificación de tarea actualizada:', error);
    }
  }

  /**
   * @deprecated Usar sendSmartNotification en su lugar
   */
  public async sendImmediateNotification(
    title: string,
    body: string,
    type: string,
    id: string,
    data: any = {}
  ): Promise<boolean> {
    console.warn('⚠️ sendImmediateNotification está deprecated. Usar sendSmartNotification.');
    return this.sendSmartNotification('order_created', title, body, id, data);
  }

  /**
   * Limpia las notificaciones pendientes
   */
  private async clearPendingNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.notificationState.pendingNotifications = [];
      
      // Limpiar notificaciones visibles antiguas (más de 5 minutos)
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      
      for (const [type, timestamp] of this.notificationState.visibleNotifications.entries()) {
        if (timestamp < fiveMinutesAgo) {
          this.notificationState.visibleNotifications.delete(type);
          console.log('🧹 Notificación visible antigua limpiada:', type);
        }
      }
      
      await this.saveNotificationState();
      console.log('🧹 Notificaciones pendientes limpiadas');
    } catch (error) {
      console.warn('⚠️ Error limpiando notificaciones pendientes:', error);
    }
  }

  /**
   * Obtiene el estado actual de la aplicación
   */
  public getAppState(): AppStateStatus {
    return this.appState;
  }

  /**
   * Verifica si la app está en foreground
   */
  public isAppInForeground(): boolean {
    return this.appState === 'active';
  }

  /**
   * Obtiene información sobre las notificaciones visibles actuales
   */
  public getVisibleNotificationsInfo(): { type: string; timeAgo: number }[] {
    const now = Date.now();
    const visibleInfo: { type: string; timeAgo: number }[] = [];
    
    for (const [type, timestamp] of this.notificationState.visibleNotifications.entries()) {
      visibleInfo.push({
        type,
        timeAgo: Math.round((now - timestamp) / 1000) // segundos
      });
    }
    
    return visibleInfo;
  }

  /**
   * Verifica si hay notificaciones visibles en el dispositivo
   */
  private async hasVisibleNotificationsOnDevice(): Promise<boolean> {
    if (!Notifications) {
      return false;
    }

    try {
      // Obtener notificaciones presentadas actualmente
      const presentedNotifications = await Notifications.getPresentedNotificationsAsync();
      
      if (presentedNotifications && presentedNotifications.length > 0) {
        console.log(`📱 ${presentedNotifications.length} notificaciones visibles en el dispositivo`);
        return true;
      }

      // También verificar nuestro registro interno de notificaciones recientes
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      
      for (const [type, timestamp] of this.notificationState.visibleNotifications.entries()) {
        if (timestamp > fiveMinutesAgo) {
          console.log(`📱 Notificación reciente registrada: ${type} (hace ${Math.round((now - timestamp) / 1000)}s)`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.warn('⚠️ Error verificando notificaciones visibles:', error);
      return false;
    }
  }

  /**
   * Limpia el historial de notificaciones
   */
  public async clearNotificationHistory(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const notificationKeys = keys.filter(key => key.startsWith(LAST_NOTIFICATION_KEY));
      await AsyncStorage.multiRemove(notificationKeys);
      
      this.notificationState.lastNotificationTime = 0;
      this.notificationState.pendingNotifications = [];
      this.notificationState.visibleNotifications.clear();
      await this.saveNotificationState();
      
      console.log('🧹 Historial de notificaciones limpiado');
    } catch (error) {
      console.warn('⚠️ Error limpiando historial de notificaciones:', error);
    }
  }

  /**
   * Programa una notificación con control de duplicados
   */
  public async scheduleNotification(
    title: string,
    body: string,
    type: string,
    id: string,
    trigger: any,
    data: any = {},
    cooldownMs: number = 30000
  ): Promise<boolean> {
    if (!this.shouldSendNotification(type, id, cooldownMs)) {
      return false;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'notification-sound.wav',
          data: {
            ...data,
            type,
            id,
            timestamp: new Date().toISOString()
          },
        },
        trigger,
      });

      // Registrar que se programó una notificación de este tipo
      this.notificationState.visibleNotifications.set(type, Date.now());
      await this.saveNotificationState();

      await this.markNotificationSent(type, id);
      console.log('✅ Notificación programada:', type, id);
      return true;
    } catch (error) {
      console.error('❌ Error programando notificación:', error);
      return false;
    }
  }


  /**
   * Inicia las verificaciones cada hora para órdenes/tareas pendientes
   */
  private startHourlyChecks(): void {
    // Limpiar timeout existente si existe
    if (this.hourlyCheckInterval) {
      clearTimeout(this.hourlyCheckInterval);
    }

    // Programar verificación para la próxima hora exacta
    this.scheduleNextHourlyCheck();

    console.log('⏰ Verificaciones horarias iniciadas');
  }

  /**
   * Programa la próxima verificación horaria exactamente en la hora
   */
  private scheduleNextHourlyCheck(): void {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0); // Próxima hora exacta

    const msUntilNextHour = nextHour.getTime() - now.getTime();

    console.log(`⏰ Próxima verificación programada para: ${nextHour.toLocaleTimeString()}`);

    this.hourlyCheckInterval = setTimeout(() => {
      this.checkPendingItemsAndNotify();
      // Programar la siguiente verificación
      this.scheduleNextHourlyCheck();
    }, msUntilNextHour);
  }

  /**
   * Verifica si es hora de notificar y si hay órdenes/tareas pendientes
   * REGLA: Cada hora desde las 8 hasta las 22 horas, consultar tareas y órdenes pendientes
   * y notificar a TODOS los usuarios si las hay
   */
  private async checkPendingItemsAndNotify(): Promise<void> {
    try {
      const now = new Date();
      const hour = now.getHours();

      console.log(`⏰ Ejecutando verificación horaria inteligente a las ${hour}:00`);

      // Solo entre 8:00 y 22:00 (horas exactas)
      if (hour < 8 || hour > 22) {
        console.log(`🚫 Fuera del horario de notificaciones (${hour}:00). Horario permitido: 8:00-22:00`);
        return;
      }

      // Verificar si hay notificaciones visibles en el dispositivo
      const hasVisibleNotifications = await this.hasVisibleNotificationsOnDevice();
      if (hasVisibleNotifications) {
        console.log('🚫 Hay notificaciones visibles en el dispositivo, saltando recordatorio horario');
        return;
      }

      console.log(`✅ Iniciando verificación inteligente de órdenes/tareas pendientes a las ${hour}:00`);

      // Importar Firebase functions dinámicamente para evitar dependencias circulares
      const firebase = await import('./firebase');
      
      // Verificar órdenes pendientes
      const ordenesPendientes = await this.checkPendingOrders(firebase);
      
      // Verificar tareas pendientes
      const tareasPendientes = await this.checkPendingTasks(firebase);

      // Si hay pendientes, enviar notificación agrupada a TODOS los usuarios
      if (ordenesPendientes > 0 || tareasPendientes > 0) {
        await this.sendHourlyReminderNotification(ordenesPendientes, tareasPendientes);
      }

    } catch (error) {
      console.error('❌ Error en verificación horaria inteligente:', error);
    }
  }

  /**
   * Verifica y cuenta órdenes pendientes
   */
  private async checkPendingOrders(firebase: any): Promise<number> {
    try {
      // Obtener órdenes pendientes
      const { ref, get } = await import('firebase/database');
      const { database } = firebase;
      
      const ordenesRef = ref(database, 'ordenes');
      const snapshot = await get(ordenesRef);
      
      if (!snapshot.exists()) return 0;

      const ordenes = Object.entries(snapshot.val()).map(([id, orden]: [string, any]) => ({ ...orden, id }));
      const ordenesPendientes = ordenes.filter((orden: any) => orden.estado === 'PENDIENTE');

      console.log(`📋 Órdenes pendientes encontradas: ${ordenesPendientes.length}`);
      return ordenesPendientes.length;
    } catch (error) {
      console.error('❌ Error verificando órdenes pendientes:', error);
      return 0;
    }
  }

  /**
   * Verifica y cuenta tareas pendientes
   */
  private async checkPendingTasks(firebase: any): Promise<number> {
    try {
      // Obtener tareas pendientes
      const { ref, get } = await import('firebase/database');
      const { database } = firebase;
      
      const tareasRef = ref(database, 'tareas');
      const snapshot = await get(tareasRef);
      
      if (!snapshot.exists()) return 0;

      const tareas = Object.entries(snapshot.val()).map(([id, tarea]: [string, any]) => ({ ...tarea, id }));
      const tareasPendientes = tareas.filter((tarea: any) => !tarea.completada);

      console.log(`✅ Tareas pendientes encontradas: ${tareasPendientes.length}`);
      return tareasPendientes.length;
    } catch (error) {
      console.error('❌ Error verificando tareas pendientes:', error);
      return 0;
    }
  }

  /**
   * Envía notificación de recordatorio horario agrupada
   */
  private async sendHourlyReminderNotification(ordenesPendientes: number, tareasPendientes: number): Promise<void> {
    try {
      let title = '';
      let body = '';
      let hasItems = false;

      if (ordenesPendientes > 0 && tareasPendientes > 0) {
        title = `📋 ${ordenesPendientes} órdenes y ${tareasPendientes} tareas pendientes`;
        body = 'Hay órdenes y tareas que requieren atención';
        hasItems = true;
      } else if (ordenesPendientes > 0) {
        title = `📋 ${ordenesPendientes} órdenes pendientes`;
        body = 'Hay órdenes que requieren atención';
        hasItems = true;
      } else if (tareasPendientes > 0) {
        title = `✅ ${tareasPendientes} tareas pendientes`;
        body = 'Hay tareas que requieren atención';
        hasItems = true;
      }

      if (hasItems) {
        await this.sendSmartNotification(
          'hourly_check',
          title,
          body,
          `hourly_reminder_${new Date().getHours()}`,
          { 
            ordenesPendientes,
            tareasPendientes,
            timestamp: new Date().toISOString()
          }
        );
        
        console.log(`✅ Notificación de recordatorio horario enviada: ${title}`);
      }
    } catch (error) {
      console.error('❌ Error enviando notificación de recordatorio horario:', error);
    }
  }

  /**
   * Limpia la suscripción del AppState y detiene verificaciones horarias
   */
  public cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
      console.log('🧹 Suscripción de AppState limpiada');
    }

    if (this.hourlyCheckInterval) {
      clearTimeout(this.hourlyCheckInterval);
      this.hourlyCheckInterval = null;
      console.log('🧹 Verificaciones horarias detenidas');
    }
  }

  // ===== MÉTODOS DE COMPATIBILIDAD (DEPRECATED) =====
  // Estos métodos se mantienen para compatibilidad con el código existente
  // pero ahora usan el nuevo sistema inteligente

  /**
   * @deprecated Usar sendSmartNotification en su lugar
   */
  public async scheduleNotification(
    title: string,
    body: string,
    type: string,
    id: string,
    trigger: any,
    data: any = {},
    cooldownMs: number = 30000
  ): Promise<boolean> {
    console.warn('⚠️ scheduleNotification está deprecated. Usar sendSmartNotification.');
    return this.sendSmartNotification('order_created', title, body, id, data);
  }
}

export default NotificationManager;
