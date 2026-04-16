import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useRunStore } from '@/stores/runStore';
import type { GeoPoint } from '@/utils/geo';

export const BACKGROUND_LOCATION_TASK = 'vincere-location-task';

// Background task handler — keeps recording when the app is minimized.
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
  if (error) {
    console.warn('[bg-location]', error);
    return;
  }
  const payload = data as { locations?: Location.LocationObject[] };
  if (!payload?.locations) return;
  for (const loc of payload.locations) {
    const point: GeoPoint = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      altitude: loc.coords.altitude ?? null,
      timestamp: loc.timestamp,
      speed: loc.coords.speed ?? null,
      accuracy: loc.coords.accuracy ?? null,
    };
    useRunStore.getState().pushPoint(point);
  }
});

let foregroundSub: Location.LocationSubscription | null = null;

export async function requestLocationPermissions(): Promise<
  'granted' | 'denied' | 'limited'
> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'denied';
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted' ? 'granted' : 'limited';
}

export async function startTracking() {
  // Foreground subscription (high accuracy while app is open)
  foregroundSub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 2,
    },
    (loc) => {
      useRunStore.getState().pushPoint({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        altitude: loc.coords.altitude ?? null,
        timestamp: loc.timestamp,
        speed: loc.coords.speed ?? null,
        accuracy: loc.coords.accuracy ?? null,
      });
    },
  );

  // Background tracking (continues when app is minimized)
  const hasBg = await Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK,
  );
  if (!hasBg) {
    try {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5,
        foregroundService: {
          notificationTitle: 'Vincere — corrida em andamento',
          notificationBody: 'Gravando seu treino.',
          notificationColor: '#CCFF00',
        },
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.Fitness,
        showsBackgroundLocationIndicator: true,
      });
    } catch (err) {
      // Some simulators don't support background — foreground still works.
      console.warn('[location] background tracking unavailable', err);
    }
  }
}

export async function stopTracking() {
  foregroundSub?.remove();
  foregroundSub = null;

  const hasBg = await Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK,
  );
  if (hasBg) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}

export async function probeGpsSignal(): Promise<Location.LocationObject | null> {
  try {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
  } catch {
    return null;
  }
}
