import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Colors, Spacing, Radius } from '@/theme';
import { Text } from '@/components/ui/Text';
import { WorkoutCard } from '@/components/WorkoutCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTrainingStore } from '@/stores/trainingStore';
import { mockPlan } from '@/mock/data';
import { formatDurationHuman } from '@/utils/format';

const weekdays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

export default function TrainingScreen() {
  const plan = useTrainingStore((s) => s.plan) ?? mockPlan;
  const currentWeek = plan.weeks[0];
  const [selectedDay, setSelectedDay] = useState(0);

  const phaseLabel: Record<string, string> = {
    base: 'BASE AERÓBICA',
    build: 'CONSTRUÇÃO',
    peak: 'PICO',
    taper: 'POLIMENTO',
    recovery: 'RECUPERAÇÃO',
  };

  const phaseColor: Record<string, string> = {
    base: Colors.zone2,
    build: Colors.primary,
    peak: Colors.secondary,
    taper: Colors.tertiary,
    recovery: Colors.zone1,
  };

  const totalWorkouts = currentWeek.workouts.length;
  const completed = currentWeek.workouts.filter((w) => w.completed).length;
  const weekProgress = completed / totalWorkouts;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <View>
            <Text variant="label" color={Colors.primary} tracking="wider">
              SEMANA {plan.currentWeek} DE {plan.totalWeeks}
            </Text>
            <Text variant="display" color={Colors.textPrimary} style={styles.title}>
              Plano de Treino
            </Text>
          </View>
          <View
            style={[
              styles.phaseBadge,
              { borderColor: phaseColor[currentWeek.phase] + '50' },
            ]}
          >
            <View
              style={[styles.phaseDot, { backgroundColor: phaseColor[currentWeek.phase] }]}
            />
            <Text
              variant="label"
              color={phaseColor[currentWeek.phase]}
              tracking="wider"
            >
              {phaseLabel[currentWeek.phase]}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text variant="label" color={Colors.textSecondary} tracking="wider">
                VOLUME
              </Text>
              <Text variant="metric" color={Colors.textPrimary}>
                {currentWeek.totalKm}
                <Text variant="body" color={Colors.textSecondary}>
                  {' '}km
                </Text>
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="label" color={Colors.textSecondary} tracking="wider">
                TREINOS
              </Text>
              <Text variant="metric" color={Colors.textPrimary}>
                {completed}
                <Text variant="body" color={Colors.textSecondary}>
                  {' '}/ {totalWorkouts}
                </Text>
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="label" color={Colors.textSecondary} tracking="wider">
                CARGA
              </Text>
              <Text variant="metric" color={Colors.textPrimary}>
                420
                <Text variant="body" color={Colors.textSecondary}>
                  {' '}TSS
                </Text>
              </Text>
            </View>
          </View>
          <View style={{ marginTop: Spacing.lg }}>
            <ProgressBar value={weekProgress} color={Colors.primary} height={6} />
          </View>
        </Animated.View>

        {/* Week calendar */}
        <Animated.View entering={FadeInDown.duration(500).delay(150)}>
          <Text variant="label" color={Colors.textSecondary} tracking="wider" style={styles.sectionLabel}>
            SEMANA
          </Text>
          <View style={styles.weekRow}>
            {weekdays.map((day, idx) => {
              const workout = currentWeek.workouts[idx];
              const hasWorkout = !!workout && workout.type !== 'rest';
              const active = selectedDay === idx;
              return (
                <Pressable
                  key={day}
                  onPress={() => setSelectedDay(idx)}
                  style={[styles.dayCell, active && styles.dayCellActive]}
                >
                  <Text
                    variant="label"
                    color={active ? Colors.textInverse : Colors.textSecondary}
                    tracking="wider"
                  >
                    {day}
                  </Text>
                  <Text
                    variant="h3"
                    color={active ? Colors.textInverse : Colors.textPrimary}
                    style={{ marginTop: 4 }}
                  >
                    {idx + 15}
                  </Text>
                  <View
                    style={[
                      styles.dayDot,
                      {
                        backgroundColor: hasWorkout
                          ? active
                            ? Colors.textInverse
                            : Colors.primary
                          : 'transparent',
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Workouts list */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <Text
            variant="label"
            color={Colors.textSecondary}
            tracking="wider"
            style={styles.sectionLabel}
          >
            PRÓXIMOS TREINOS
          </Text>
          <View style={styles.workoutsList}>
            {currentWeek.workouts.map((workout, i) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                variant={i === 0 ? 'today' : 'compact'}
              />
            ))}
          </View>
        </Animated.View>

        {/* AI adjustment CTA */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <Pressable style={styles.aiCta}>
            <View style={styles.aiIcon}>
              <Ionicons name="sparkles" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" color={Colors.textPrimary}>
                Ajustar próxima semana com IA
              </Text>
              <Text variant="caption" color={Colors.textSecondary}>
                Claude analisa seus últimos treinos e recalibra o plano.
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
          </Pressable>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.base,
    gap: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: { marginTop: 4, fontSize: 32, lineHeight: 36 },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    backgroundColor: Colors.card,
  },
  phaseDot: { width: 6, height: 6, borderRadius: 3 },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  summaryItem: { flex: 1 },
  sectionLabel: {
    marginBottom: Spacing.md,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  dayCellActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 6,
  },
  workoutsList: {
    gap: Spacing.md,
  },
  aiCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
