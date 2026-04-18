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

const WEEKDAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const [level, setLevel] = useState<Level | null>(null);
  // Pre-select Mon/Wed/Fri/Sat/Sun as a sane default
  const [trainingDays, setTrainingDays] = useState<number[]>([0, 2, 4, 5, 6]);
  const [longRunDay, setLongRunDay] = useState<number>(6); // Sunday default
  const [saving, setSaving] = useState(false);
  const user = useAuthStore((s) => s.user);
  const tokens = useAuthStore((s) => s.tokens);
  const setUser = useAuthStore((s) => s.setUser);

  const toggleDay = (d: number) => {
    setTrainingDays((prev) => {
      const has = prev.includes(d);
      const next = has ? prev.filter((x) => x !== d) : [...prev, d].sort();
      // If removing the current long-run day, pick a new weekend (or last day)
      if (has && d === longRunDay && next.length > 0) {
        const weekend = next.find((x) => x === 6) ?? next.find((x) => x === 5) ?? next[next.length - 1];
        setLongRunDay(weekend);
      }
      return next;
    });
  };

  const handleFinish = async () => {
    if (!level) return;
    if (trainingDays.length < 3) {
      Alert.alert(
        'Escolha pelo menos 3 dias',
        'A IA precisa de uma base mínima pra montar uma semana coerente.',
      );
      return;
    }
    setSaving(true);
    try {
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
        trainingDaysPerWeek: trainingDays.length,
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
        trainingDaysPerWeek: trainingDays.length,
        trainingDays,
        longRunDay,
        onboarded: true,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Não foi possível salvar', err?.message ?? 'Tente novamente.');
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
            Conta sobre{'\n'}sua rotina.
          </Text>
          <Text variant="body" color={Colors.textSecondary} style={styles.sub}>
            A IA vai calibrar os treinos ao seu nível, dias disponíveis e preferência pro longão.
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
          <View style={styles.sectionHeader}>
            <Text variant="label" color={Colors.textSecondary} tracking="wider">
              DIAS DE TREINO
            </Text>
            <Text variant="caption" color={Colors.textTertiary}>
              {trainingDays.length} dia(s) selecionado(s)
            </Text>
          </View>
          <Text variant="caption" color={Colors.textTertiary}>
            Toque pra marcar os dias que você consegue treinar.
          </Text>
          <View style={styles.weekRow}>
            {WEEKDAY_LABELS.map((lbl, idx) => {
              const active = trainingDays.includes(idx);
              return (
                <Pressable
                  key={lbl}
                  onPress={() => toggleDay(idx)}
                  style={[styles.weekChip, active && styles.weekChipActive]}
                >
                  <Text
                    variant="label"
                    color={active ? Colors.textInverse : Colors.textSecondary}
                    tracking="wider"
                  >
                    {lbl}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="label" color={Colors.textSecondary} tracking="wider">
            MELHOR DIA PRO LONGÃO
          </Text>
          <Text variant="caption" color={Colors.textTertiary}>
            O treino mais longo da semana (90 min a 2h30).
          </Text>
          <View style={styles.weekRow}>
            {WEEKDAY_LABELS.map((lbl, idx) => {
              const available = trainingDays.includes(idx);
              const active = longRunDay === idx;
              return (
                <Pressable
                  key={lbl}
                  onPress={() => available && setLongRunDay(idx)}
                  disabled={!available}
                  style={[
                    styles.weekChip,
                    active && styles.weekChipActive,
                    !available && { opacity: 0.3 },
                  ]}
                >
                  <Text
                    variant="label"
                    color={active ? Colors.textInverse : Colors.textSecondary}
                    tracking="wider"
                  >
                    {lbl}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 6,
  },
  weekChip: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  weekChipActive: {
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
