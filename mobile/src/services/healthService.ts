/**
 * Apple Health (iOS) + Google Health Connect (Android) integration.
 *
 * Requires a development build — does NOT work in Expo Go.
 * Build locally with: `npx expo run:ios` or `npx expo run:android`
 *
 * iOS:  react-native-health  → HealthKit
 * Android: react-native-health-connect → Health Connect
 */

import { Platform } from 'react-native';

export interface WorkoutData {
  startTime: Date;
  endTime: Date;
  distanceMeters: number;
  durationSeconds: number;
  avgPaceSecPerKm: number;
  elevationGain: number;
  splits: Array<{ km: number; pace: number }>;
}

// Simple calorie estimate: MET × weight × time
// MET ~11 for running >10 km/h, ~8 for slower jogging
function estimateCalories(distanceMeters: number, durationSeconds: number): number {
  if (durationSeconds === 0) return 0;
  const speedMps = distanceMeters / durationSeconds;
  const MET = speedMps >= 2.8 ? 11 : 8; // ~10 km/h threshold
  const weightKg = 70; // default; a future version can pull from user profile
  const hours = durationSeconds / 3600;
  return Math.round(MET * weightKg * hours);
}

// ─── iOS HealthKit ────────────────────────────────────────────────────────────

async function syncToAppleHealth(workout: WorkoutData): Promise<void> {
  // Dynamic require so the app doesn't crash if the native module isn't linked
  // (e.g. when running in Expo Go)
  const RNHealth = require('react-native-health');
  const AppleHealthKit = RNHealth.default ?? RNHealth;
  const { Permissions } = RNHealth;

  const permissions = {
    permissions: {
      read: [
        Permissions.DistanceWalkingRunning,
        Permissions.ActiveEnergyBurned,
        Permissions.Workout,
      ],
      write: [
        Permissions.DistanceWalkingRunning,
        Permissions.ActiveEnergyBurned,
        Permissions.Workout,
      ],
    },
  };

  // 1. Init & request permissions
  await new Promise<void>((resolve, reject) => {
    AppleHealthKit.initHealthKit(permissions, (error: string) => {
      if (error) reject(new Error(`HealthKit init: ${error}`));
      else resolve();
    });
  });

  // 2. Save workout
  const calories = estimateCalories(workout.distanceMeters, workout.durationSeconds);

  await new Promise<void>((resolve, reject) => {
    AppleHealthKit.saveWorkout(
      {
        type: AppleHealthKit.Constants.Activities.Running,
        startDate: workout.startTime.toISOString(),
        endDate: workout.endTime.toISOString(),
        distance: workout.distanceMeters / 1000,
        distanceUnit: 'kilometer',
        energyBurned: calories,
        energyBurnedUnit: 'kilocalorie',
      },
      (err: string) => {
        if (err) reject(new Error(`HealthKit save: ${err}`));
        else resolve();
      }
    );
  });
}

// ─── Android Health Connect ───────────────────────────────────────────────────

async function syncToGoogleHealth(workout: WorkoutData): Promise<void> {
  const HealthConnect = require('react-native-health-connect');

  const isAvailable = await HealthConnect.isAvailable();
  if (!isAvailable) {
    throw new Error(
      'Google Health Connect não está disponível. Instale o app "Health Connect" pela Play Store.'
    );
  }

  // Request write permissions
  const granted = await HealthConnect.requestPermission([
    { accessType: 'write', recordType: 'ExerciseSession' },
    { accessType: 'write', recordType: 'Distance' },
    { accessType: 'write', recordType: 'TotalCaloriesBurned' },
  ]);

  if (!granted) {
    throw new Error('Permissão negada pelo Health Connect.');
  }

  const calories = estimateCalories(workout.distanceMeters, workout.durationSeconds);
  const startTime = workout.startTime.toISOString();
  const endTime = workout.endTime.toISOString();

  await HealthConnect.insertRecords([
    {
      recordType: 'ExerciseSession',
      startTime,
      endTime,
      exerciseType: 37, // EXERCISE_TYPE_RUNNING
      title: 'Corrida VINCERE',
    },
    {
      recordType: 'Distance',
      startTime,
      endTime,
      distance: { value: workout.distanceMeters, unit: 'meters' },
    },
    {
      recordType: 'TotalCaloriesBurned',
      startTime,
      endTime,
      energy: { value: calories, unit: 'kilocalories' },
    },
  ]);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const healthService = {
  /**
   * Returns the platform health app name for display in the UI.
   */
  getPlatformName(): string {
    if (Platform.OS === 'ios') return 'Apple Health';
    if (Platform.OS === 'android') return 'Google Health';
    return 'Health';
  },

  /**
   * Sync a completed workout to the platform health app.
   * Throws if permissions are denied or the module isn't available.
   */
  async syncWorkout(workout: WorkoutData): Promise<void> {
    if (Platform.OS === 'ios') {
      await syncToAppleHealth(workout);
    } else if (Platform.OS === 'android') {
      await syncToGoogleHealth(workout);
    } else {
      throw new Error('Health sync is only available on iOS and Android.');
    }
  },
};
