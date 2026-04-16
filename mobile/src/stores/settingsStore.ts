/**
 * User settings persisted in SecureStore.
 * Controls notification preferences and health sync.
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEY = 'vincere_settings';

interface Settings {
  notificationsEnabled: boolean;
  reminderHour: number;   // 0–23
  reminderMinute: number; // 0–59
  healthSyncEnabled: boolean;
  autoSyncAfterRun: boolean;
}

interface SettingsStore extends Settings {
  hydrate: () => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setReminderTime: (hour: number, minute: number) => Promise<void>;
  setHealthSyncEnabled: (enabled: boolean) => Promise<void>;
  setAutoSyncAfterRun: (enabled: boolean) => Promise<void>;
}

const defaults: Settings = {
  notificationsEnabled: false,
  reminderHour: 7,
  reminderMinute: 30,
  healthSyncEnabled: false,
  autoSyncAfterRun: false,
};

async function persist(settings: Settings) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(settings));
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...defaults,

  async hydrate() {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) {
        const saved: Partial<Settings> = JSON.parse(raw);
        set({ ...defaults, ...saved });
      }
    } catch {
      // Ignore parse errors — fall back to defaults
    }
  },

  async setNotificationsEnabled(enabled) {
    const next: Settings = { ...get(), notificationsEnabled: enabled };
    set({ notificationsEnabled: enabled });
    await persist(next);
  },

  async setReminderTime(hour, minute) {
    const next: Settings = { ...get(), reminderHour: hour, reminderMinute: minute };
    set({ reminderHour: hour, reminderMinute: minute });
    await persist(next);
  },

  async setHealthSyncEnabled(enabled) {
    const next: Settings = { ...get(), healthSyncEnabled: enabled };
    set({ healthSyncEnabled: enabled });
    await persist(next);
  },

  async setAutoSyncAfterRun(enabled) {
    const next: Settings = { ...get(), autoSyncAfterRun: enabled };
    set({ autoSyncAfterRun: enabled });
    await persist(next);
  },
}));
