import React from 'react';
import { Pressable, StyleSheet, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/theme';
import { Text } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/authStore';

export function DevSkipButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  if (!__DEV__) return null;

  const skip = async () => {
    try {
      await setTokens({
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 6 * 3600,
        athlete: {
          id: 99999,
          firstname: 'Victor',
          lastname: 'Demo',
          profile: '',
          profile_medium: '',
          measurement_preference: 'meters',
          date_preference: '',
        } as any,
      });
      await setUser({
        stravaId: 99999,
        name: 'Victor Demo',
        avatar: '',
        weight: 72,
        height: 178,
        age: 30,
        weeklyGoalKm: 50,
        trainingDaysPerWeek: 4,
        fitnessLevel: 'intermediate',
        mainGoal: {
          id: 'demo-goal',
          type: '21k',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        onboarded: true,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('[skip] failed', err);
      Alert.alert('Skip falhou', err?.message ?? String(err));
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + 6 }]}
    >
      <Pressable onPress={skip} style={styles.btn} hitSlop={12}>
        <Ionicons name="flash" size={14} color={Colors.background} />
        <Text variant="caption" color={Colors.background} weight="bold" tracking="wider">
          PULAR (DEV)
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 12,
    zIndex: 9999,
    elevation: 9999,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
});
