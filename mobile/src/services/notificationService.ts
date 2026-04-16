/**
 * Push notifications via expo-notifications.
 *
 * Local notifications (training reminders, insight alerts) work on device builds.
 * Remote push notifications require registering the Expo Push Token with the backend.
 *
 * NOTE: Notifications do NOT work in Expo Go on iOS simulator.
 *       Use a physical device or a dev build: `npx expo run:ios`
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';

// How notifications appear while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type NotificationScreen = '/(tabs)' | '/(tabs)/training' | '/(tabs)/coach' | '/(tabs)/progress';

export const notificationService = {
  /**
   * Ask the user for notification permission.
   * Creates the Android notification channel on first call.
   * Returns true if permission was granted.
   */
  async requestPermission(): Promise<boolean> {
    if (!Device.isDevice) {
      // Simulators can't receive push notifications
      console.warn('[notifications] Running on simulator — push notifications unavailable.');
      return false;
    }

    const { status: current } = await Notifications.getPermissionsAsync();
    let finalStatus = current;

    if (current !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return false;

    // Android: create a branded notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('vincere', {
        name: 'VINCERE',
        description: 'Lembretes de treino e insights do Coach IA',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#CCFF00',
        sound: 'default',
        showBadge: false,
      });
    }

    return true;
  },

  /**
   * Get the Expo Push Token for this device.
   * Send this to the backend to enable server-side push notifications.
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) return null;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? 'your-eas-project-id';

      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
      return tokenResponse.data;
    } catch (err) {
      console.warn('[notifications] Could not get push token:', err);
      return null;
    }
  },

  /**
   * Register this device's push token with the backend.
   * The backend uses this to send remote notifications (e.g. AI insights).
   */
  async registerWithBackend(): Promise<void> {
    const token = await notificationService.getExpoPushToken();
    if (!token) return;

    try {
      await api.post('/notifications/register', {
        token,
        platform: Platform.OS,
      });
    } catch (err) {
      // Non-fatal: the app works fine without remote notifications
      console.warn('[notifications] Backend registration failed:', err);
    }
  },

  /**
   * Schedule a daily training reminder.
   * Replaces any previously scheduled reminder.
   *
   * @param hour   0–23, default 7 (7 AM)
   * @param minute 0–59, default 30 (07:30)
   */
  async scheduleDailyReminder(hour = 7, minute = 30): Promise<void> {
    // Cancel all existing reminders so we don't stack them
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'VINCERE',
        body: 'Seu treino de hoje está pronto. Mais um km no bolso?',
        sound: 'default',
        data: { type: 'training_reminder', screen: '/(tabs)/training' as NotificationScreen },
        ...(Platform.OS === 'android' ? { channelId: 'vincere' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  },

  /**
   * Show a local notification immediately (used for AI insights).
   */
  async showInsightNotification(body: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Coach IA',
        body,
        sound: 'default',
        data: { type: 'insight', screen: '/(tabs)/coach' as NotificationScreen },
        ...(Platform.OS === 'android' ? { channelId: 'vincere' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        repeats: false,
      },
    });
  },

  /**
   * Show a local notification immediately after a run is saved.
   */
  async showRunCompleteNotification(distanceKm: number, pace: string): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Treino concluído!',
        body: `${distanceKm.toFixed(1)} km a ${pace}/km. Salvo no VINCERE.`,
        sound: 'default',
        data: { type: 'run_complete', screen: '/(tabs)' as NotificationScreen },
        ...(Platform.OS === 'android' ? { channelId: 'vincere' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        repeats: false,
      },
    });
  },

  /**
   * Cancel all scheduled notifications (e.g. when user disables reminders).
   */
  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  /**
   * Listen for notification taps and call handler with the target screen.
   * Returns a subscription that should be removed on unmount.
   */
  addTapListener(onTap: (screen: NotificationScreen) => void): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen as NotificationScreen;
      if (screen) onTap(screen);
    });
  },
};
