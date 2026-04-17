import React, { useEffect, useRef } from 'react';
import { Stack, SplashScreen, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  useFonts as useGrotesk,
} from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { Colors } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { notificationService, type NotificationScreen } from '@/services/notificationService';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useGrotesk({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const hydrate = useAuthStore((s) => s.hydrate);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const reminderHour = useSettingsStore((s) => s.reminderHour);
  const reminderMinute = useSettingsStore((s) => s.reminderMinute);
  const segments = useSegments();
  const router = useRouter();

  // Keep a ref so we can remove the notification tap listener on unmount
  const notifListenerRef = useRef<ReturnType<typeof notificationService.addTapListener> | null>(null);

  useEffect(() => {
    hydrate();
    hydrateSettings();
  }, [hydrate, hydrateSettings]);

  // Set up notification tap deep-linking once the router is ready
  useEffect(() => {
    notifListenerRef.current = notificationService.addTapListener((screen: NotificationScreen) => {
      router.push(screen as any);
    });
    return () => {
      notifListenerRef.current?.remove();
    };
  }, [router]);

  // Re-schedule daily reminder whenever the setting changes
  useEffect(() => {
    if (notificationsEnabled) {
      notificationService.scheduleDailyReminder(reminderHour, reminderMinute).catch(() => {});
    }
  }, [notificationsEnabled, reminderHour, reminderMinute]);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  useEffect(() => {
    if (isLoading || !fontsLoaded) return;
    const inAuth = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)');
    } else if (isAuthenticated && inAuth) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading, fontsLoaded, router]);

  if (!fontsLoaded || isLoading) {
    return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="run"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="activities"
            options={{
              animation: 'slide_from_right',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
