import React, { useState } from 'react';
import { StyleSheet, View, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors, Spacing, Radius } from '@/theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import type { GoalType, UserProfile } from '@/types';
import { useAuthStore } from '@/stores/authStore';

const goals: {
  type: GoalType;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { type: '5k', title: '5K', desc: 'Primeira prova ou baixar tempo', icon: 'flash' },
  { type: '10k', title: '10K', desc: 'Resistência e velocidade', icon: 'rocket' },
  { type: '21k', title: 'MEIA MARATONA', desc: '21.1 km - A jornada intermediária', icon: 'flame' },
  { type: '42k', title: 'MARATONA', desc: '42.2 km - O desafio clássico', icon: 'trophy' },
  { type: 'Ultra', title: 'ULTRA', desc: '50k, 100k e além', icon: 'infinite' },
  { type: 'Pace', title: 'BAIXAR PACE', desc: 'Focar em velocidade', icon: 'speedometer' },
  { type: 'Mobility', title: 'MOBILIDADE', desc: 'Prevenção e recuperação', icon: 'body' },
];

export default function GoalScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<GoalType | null>(null);
  const [saving, setSaving] = useState(false);
  const user = useAuthStore((s) => s.user);
  const tokens = useAuthStore((s) => s.tokens);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const handleContinue = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const goal = {
        id: `goal_${Date.now()}`,
        type: selected,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // Build a base profile if `user` was never set (can happen on legacy
      // sessions that predate the profile-from-tokens fix in (auth)/index).
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
        trainingDaysPerWeek: 4,
        fitnessLevel: 'intermediate',
        mainGoal: goal,
        onboarded: false,
      };

      await setUser({ ...base, mainGoal: goal });
      router.push('/(auth)/profile');
    } catch (err: any) {
      console.error('[goal] save failed', err);
      Alert.alert(
        'Não foi possível salvar',
        err?.message ?? 'Tente novamente. Se persistir, saia e reconecte.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStartOver = () => {
    Alert.alert(
      'Recomeçar?',
      'Isso desconecta do Strava e limpa os dados locais.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recomeçar',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View style={styles.headerRow}>
            <Text variant="label" color={Colors.primary} tracking="wider">
              ETAPA 1 DE 2
            </Text>
            <Pressable onPress={handleStartOver} hitSlop={10}>
              <Text variant="caption" color={Colors.textTertiary} tracking="wider">
                RECOMEÇAR
              </Text>
            </Pressable>
          </View>
          <Text variant="display" color={Colors.textPrimary} style={styles.title}>
            Qual é o{'\n'}seu objetivo?
          </Text>
          <Text variant="body" color={Colors.textSecondary} style={styles.sub}>
            Todo o plano vai ser construído em cima da sua meta principal.
          </Text>
        </Animated.View>

        <View style={styles.list}>
          {goals.map((g, i) => {
            const active = selected === g.type;
            return (
              <Animated.View
                key={g.type}
                entering={FadeInDown.duration(400).delay(100 + i * 50)}
              >
                <Pressable
                  onPress={() => setSelected(g.type)}
                  style={({ pressed }) => [
                    styles.goalCard,
                    active && styles.goalActive,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={[styles.goalIcon, active && styles.goalIconActive]}>
                    <Ionicons
                      name={g.icon}
                      size={20}
                      color={active ? Colors.textInverse : Colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      variant="h3"
                      color={active ? Colors.textInverse : Colors.textPrimary}
                      tracking="wide"
                    >
                      {g.title}
                    </Text>
                    <Text
                      variant="caption"
                      color={active ? Colors.textInverse : Colors.textSecondary}
                    >
                      {g.desc}
                    </Text>
                  </View>
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'chevron-forward'}
                    size={22}
                    color={active ? Colors.textInverse : Colors.textTertiary}
                  />
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={saving ? 'Salvando...' : 'Continuar'}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!selected || saving}
          loading={saving}
          onPress={handleContinue}
          rightIcon={<Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    marginTop: Spacing.sm,
    fontSize: 40,
    lineHeight: 44,
  },
  sub: {
    marginTop: Spacing.md,
  },
  list: {
    gap: Spacing.md,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  goalActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  goalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  footer: {
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
  },
});
