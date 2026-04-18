import React, { useState } from 'react';
import { StyleSheet, View, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors, Spacing, Radius } from '@/theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import type { UserProfile } from '@/types';
import { useAuthStore } from '@/stores/authStore';

type Level = 'beginner' | 'intermediate' | 'advanced' | 'elite';

const levels: { value: Level; title: string; desc: string }[] = [
  {
    value: 'beginner',
    title: 'INICIANTE',
    desc: 'Começando agora, até 20 km/semana',
  },
  {
    value: 'intermediate',
    title: 'INTERMEDIÁRIO',
    desc: 'Corro regularmente, 20-40 km/semana',
  },
  {
    value: 'advanced',
    title: 'AVANÇADO',
    desc: 'Provas frequentes, 40-70 km/semana',
  },
  {
    value: 'elite',
    title: 'ELITE',
    desc: 'Competitivo, 70+ km/semana',
  },
];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const [level, setLevel] = useState<Level | null>(null);
  const [days, setDays] = useState(4);
  const [saving, setSaving] = useState(false);
  const user = useAuthStore((s) => s.user);
  const tokens = useAuthStore((s) => s.tokens);
  const setUser = useAuthStore((s) => s.setUser);

  const handleFinish = async () => {
    console.log('[profile] handleFinish tapped', { level, days, hasUser: !!user, hasTokens: !!tokens });
    if (!level) return;
    setSaving(true);
    try {
      // Fall back to tokens if the user somehow wasn't persisted earlier.
      const base: UserProfile = user ?? {
        stravaId: tokens?.athlete?.id ?? 0,
        name:
          [tokens?.athlete?.firstname, tokens?.athlete?.lastname]
            .filter(Boolean)
            .join(' ') || 'Atleta',
        avatar:
          tokens?.athlete?.profile_medium || tokens?.athlete?.profile || '',
        weight: tokens?.athlete?.weight || undefined,
        weeklyGoalKm: 50,
        trainingDaysPerWeek: days,
        fitnessLevel: level,
        mainGoal: {
          id: `goal_${Date.now()}`,
          type: '21k',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        onboarded: false,
      };

      await setUser({
        ...base,
        fitnessLevel: level,
        trainingDaysPerWeek: days,
        onboarded: true,
      });
      console.log('[profile] setUser ok, navigating to /(tabs)');
      // Belt-and-suspenders: _layout.tsx also handles this redirect via isAuthenticated,
      // but explicit navigate ensures no timing edge case on slower devices.
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('[profile] save failed', err);
      Alert.alert(
        'Não foi possível salvar',
        err?.message ?? 'Tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <Text variant="label" color={Colors.primary} tracking="wider">
            ETAPA 2 DE 2
          </Text>
          <Text variant="display" color={Colors.textPrimary} style={styles.title}>
            Conta sobre{'\n'}seu ritmo.
          </Text>
          <Text variant="body" color={Colors.textSecondary} style={styles.sub}>
            A IA vai calibrar cada treino pro seu nível atual.
          </Text>
        </Animated.View>

        <View style={styles.section}>
          <Text variant="label" color={Colors.textSecondary} tracking="wider">
            NÍVEL ATUAL
          </Text>
          <View style={styles.list}>
            {levels.map((lv, i) => {
              const active = level === lv.value;
              return (
                <Animated.View
                  key={lv.value}
                  entering={FadeInDown.duration(400).delay(100 + i * 60)}
                >
                  <Pressable
                    onPress={() => setLevel(lv.value)}
                    style={({ pressed }) => [
                      styles.card,
                      active && styles.cardActive,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        variant="h3"
                        color={active ? Colors.textInverse : Colors.textPrimary}
                      >
                        {lv.title}
                      </Text>
                      <Text
                        variant="caption"
                        color={active ? Colors.textInverse : Colors.textSecondary}
                      >
                        {lv.desc}
                      </Text>
                    </View>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={22} color={Colors.textInverse} />
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="label" color={Colors.textSecondary} tracking="wider">
            DIAS DE TREINO POR SEMANA
          </Text>
          <View style={styles.daysRow}>
            {[3, 4, 5, 6].map((d) => {
              const active = days === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDays(d)}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                >
                  <Text
                    variant="h2"
                    color={active ? Colors.textInverse : Colors.textPrimary}
                  >
                    {d}
                  </Text>
                  <Text
                    variant="caption"
                    color={active ? Colors.textInverse : Colors.textSecondary}
                  >
                    {d === 3 ? 'leve' : d === 4 ? 'balanço' : d === 5 ? 'sério' : 'elite'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={saving ? 'Gerando...' : 'Gerar meu plano'}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!level || saving}
          loading={saving}
          onPress={handleFinish}
          rightIcon={<Ionicons name="sparkles" size={18} color={Colors.textInverse} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  header: { marginBottom: Spacing.xl },
  title: { marginTop: Spacing.sm, fontSize: 40, lineHeight: 44 },
  sub: { marginTop: Spacing.md },
  section: { marginBottom: Spacing.xl, gap: Spacing.md },
  list: { gap: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    minHeight: 64,
  },
  cardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  daysRow: { flexDirection: 'row', gap: Spacing.sm },
  dayChip: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  dayChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  footer: {
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
});
