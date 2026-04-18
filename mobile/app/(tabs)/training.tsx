import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Colors, Spacing, Radius } from '@/theme';
import { Text } from '@/components/ui/Text';
import { WorkoutCard } from '@/components/WorkoutCard';
import { GlossaryButton } from '@/components/GlossaryModal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTrainingStore } from '@/stores/trainingStore';
import { useAuthStore } from '@/stores/authStore';
import { generateTrainingPlan } from '@/services/coach';
import { mockPlan } from '@/mock/data';
import type { Workout, StravaActivity } from '@/types';
import { formatPace, msToPace } from '@/utils/format';

const weekdays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
const MONTHS_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

/** Returns ISO date (YYYY-MM-DD) in local time (not UTC). */
function isoLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Mon=0, Sun=6 — matches pt-BR week layout. */
function weekdayIndexMon(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Start-of-week (Monday 00:00) for a given date. */
function mondayOf(d: Date): Date {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - weekdayIndexMon(m));
  return m;
}

export default function TrainingScreen() {
  const plan = useTrainingStore((s) => s.plan) ?? mockPlan;
  const setPlan = useTrainingStore((s) => s.setPlan);
  const activities = useTrainingStore((s) => s.activities);
  const user = useAuthStore((s) => s.user);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const todayISO = isoLocalDate(today);

  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [generating, setGenerating] = useState(false);

  // When the plan starts in the future (always starts next Monday now), land
  // the user on the first plan week so they don't stare at an empty "esta semana".
  useEffect(() => {
    const firstPlanWeek = plan.weeks[0];
    if (!firstPlanWeek?.startDate) return;
    const planMonday = new Date(firstPlanWeek.startDate + 'T00:00:00');
    const thisMonday = mondayOf(today);
    const diffWeeks = Math.round(
      (planMonday.getTime() - thisMonday.getTime()) / (7 * 86400000),
    );
    if (diffWeeks > 0) {
      setWeekOffset(diffWeeks);
      setSelectedDate(firstPlanWeek.startDate.slice(0, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id]);

  // Compute the Monday of the displayed week
  const weekStart = useMemo(() => {
    const m = mondayOf(today);
    m.setDate(m.getDate() + weekOffset * 7);
    return m;
  }, [today, weekOffset]);

  const weekDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  // Flatten ALL plan weeks into a single date-indexed map. The AI doesn't
  // always respect the weeks[] ordering (sometimes returns 1 week, sometimes 4),
  // so we match each displayed day by its ISO date directly.
  const workoutsByDate = useMemo(() => {
    const map: Record<string, Workout> = {};
    for (const week of plan.weeks) {
      for (const w of week.workouts) {
        if (w.date) map[w.date.slice(0, 10)] = w;
      }
    }
    return map;
  }, [plan.weeks]);

  // Find the plan week whose startDate matches the displayed week's Monday.
  // Used only for phase/totalKm header metadata.
  const displayedWeek = useMemo(() => {
    const startISO = isoLocalDate(weekStart);
    return plan.weeks.find((w) => w.startDate?.slice(0, 10) === startISO) ?? null;
  }, [plan.weeks, weekStart]);

  const activitiesByDate = useMemo(() => {
    const map: Record<string, StravaActivity> = {};
    for (const a of activities) {
      const iso = (a.start_date_local || a.start_date || '').slice(0, 10);
      if (iso && !map[iso]) map[iso] = a;
    }
    return map;
  }, [activities]);

  // Fallback workout for days without a plan entry (rest) or when displaying past week
  function dayItem(date: Date): Workout {
    const iso = isoLocalDate(date);
    const planned = workoutsByDate[iso];
    if (planned) return planned;

    // If past day has a Strava activity, synthesize a "completed" workout
    const act = activitiesByDate[iso];
    if (act) {
      const km = act.distance / 1000;
      const pace = msToPace(act.average_speed);
      return {
        id: `strava_${act.id}`,
        type: 'easy_run',
        title: act.name,
        description: `Registrado no Strava · ${km.toFixed(1)}km em ${Math.round(act.moving_time / 60)}min`,
        date: iso,
        targetDistance: Math.round(km * 10) / 10,
        targetPace: formatPace(pace),
        targetDuration: Math.round(act.moving_time / 60),
        completed: true,
        stravaActivityId: act.id,
      };
    }

    // Empty day → rest
    return {
      id: `rest_${iso}`,
      type: 'rest',
      title: 'Descanso',
      description: 'Nenhum treino planejado.',
      date: iso,
      completed: false,
    };
  }

  const selectedWorkout = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return dayItem(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, workoutsByDate, activitiesByDate]);

  // Allow navigation up to the last planned week + 1 (so user can peek ahead)
  const maxOffset = Math.max(1, plan.weeks.length);
  const canGoNext = weekOffset < maxOffset;
  const canGoPrev = true; // past weeks always viewable (backed by Strava activities)

  const runGeneration = async () => {
    const goal = user?.mainGoal;
    if (!goal) return;
    setGenerating(true);
    try {
      const newPlan = await generateTrainingPlan({
        goal,
        training_days: user?.trainingDays,
        long_run_day: user?.longRunDay,
        fitness_level: user?.fitnessLevel,
      });
      setPlan(newPlan);
      Alert.alert(
        'Plano atualizado!',
        `Geradas ${newPlan.weeks.length} semanas a partir de ${newPlan.startDate}.`,
      );
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      let msg: string;
      if (status) {
        msg = `Backend respondeu ${status}${detail ? `: ${detail}` : ''}.`;
      } else if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        msg = 'Timeout — a IA demorou mais de 30s. Tente de novo.';
      } else if (err?.message?.includes('Network')) {
        msg = 'Backend inacessível. Está rodando `docker compose up` em backend/?';
      } else {
        msg = err?.message ?? 'Erro desconhecido.';
      }
      console.error('[training] generate plan failed', err);
      Alert.alert('Não consegui gerar o plano', msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateWeek = () => {
    const goal = user?.mainGoal;
    if (!goal) {
      Alert.alert(
        'Meta não configurada',
        'Configure sua meta principal nas configurações para gerar um plano personalizado.',
      );
      return;
    }

    // Gate: if there's already a plan less than 6 days old, ask for confirmation
    // to avoid inconsistency ("every click changes everything")
    const existing = useTrainingStore.getState().plan;
    const ageDays = existing?.lastUpdated
      ? Math.floor((Date.now() - new Date(existing.lastUpdated).getTime()) / 86400000)
      : 999;

    if (existing && ageDays < 6) {
      Alert.alert(
        'Regenerar plano?',
        `Seu plano atual tem ${ageDays} dia(s). Regenerar vai sobrescrevê-lo. Recomendado: só regenere no fim da semana para manter consistência.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Regenerar', style: 'destructive', onPress: runGeneration },
        ],
      );
      return;
    }

    runGeneration();
  };

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

  const weekPhase = displayedWeek?.phase ?? 'base';
  const totalKm = displayedWeek?.totalKm ?? 0;
  const totalWorkouts = displayedWeek?.workouts.length ?? 0;
  const completed = displayedWeek
    ? displayedWeek.workouts.filter((w) => w.completed || activitiesByDate[w.date?.slice(0, 10) ?? '']).length
    : weekDates.filter((d) => activitiesByDate[isoLocalDate(d)]).length;
  const weekProgress = totalWorkouts > 0 ? completed / totalWorkouts : 0;

  const weekRangeLabel = `${weekStart.getDate()} – ${weekDates[6].getDate()} ${MONTHS_ABBR[weekDates[6].getMonth()]}`;
  const weekTitle =
    weekOffset === 0
      ? 'Esta semana'
      : weekOffset === -1
        ? 'Semana passada'
        : weekOffset === 1
          ? 'Próxima semana'
          : weekOffset < 0
            ? `${-weekOffset} semanas atrás`
            : `Em ${weekOffset} semanas`;

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
          <View style={styles.headerRight}>
            <View
              style={[
                styles.phaseBadge,
                { borderColor: phaseColor[weekPhase] + '50' },
              ]}
            >
              <View style={[styles.phaseDot, { backgroundColor: phaseColor[weekPhase] }]} />
              <Text variant="label" color={phaseColor[weekPhase]} tracking="wider">
                {phaseLabel[weekPhase]}
              </Text>
            </View>
            <GlossaryButton />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text variant="label" color={Colors.textSecondary} tracking="wider">
                VOLUME
              </Text>
              <Text variant="metric" color={Colors.textPrimary}>
                {totalKm}
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
                  {' '}/ {Math.max(totalWorkouts, completed)}
                </Text>
              </Text>
            </View>
          </View>
          <View style={{ marginTop: Spacing.lg }}>
            <ProgressBar value={weekProgress} color={Colors.primary} height={6} />
          </View>
        </Animated.View>

        {/* Week navigation header */}
        <Animated.View entering={FadeInDown.duration(500).delay(130)}>
          <View style={styles.weekNavRow}>
            <Pressable
              style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
              onPress={() => canGoPrev && setWeekOffset((w) => w - 1)}
              disabled={!canGoPrev}
              hitSlop={8}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={canGoPrev ? Colors.textPrimary : Colors.textTertiary}
              />
            </Pressable>
            <View style={{ alignItems: 'center' }}>
              <Text variant="label" color={Colors.textSecondary} tracking="wider">
                {weekTitle.toUpperCase()}
              </Text>
              <Text variant="bodyMedium" color={Colors.textPrimary} style={{ marginTop: 2 }}>
                {weekRangeLabel}
              </Text>
            </View>
            <Pressable
              style={[styles.navBtn, !canGoNext && styles.navBtnDisabled]}
              onPress={() => canGoNext && setWeekOffset((w) => w + 1)}
              disabled={!canGoNext}
              hitSlop={8}
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={canGoNext ? Colors.textPrimary : Colors.textTertiary}
              />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {weekDates.map((date, idx) => {
              const iso = isoLocalDate(date);
              const workout = workoutsByDate[iso];
              const activity = activitiesByDate[iso];
              const hasActivity = workout
                ? workout.type !== 'rest'
                : !!activity;
              const isSelected = selectedDate === iso;
              const isToday = iso === todayISO;
              const completedMark = !!activity || workout?.completed;
              return (
                <Pressable
                  key={iso}
                  onPress={() => setSelectedDate(iso)}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellActive,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                >
                  <Text
                    variant="label"
                    color={isSelected ? Colors.textInverse : Colors.textSecondary}
                    tracking="wider"
                  >
                    {weekdays[idx]}
                  </Text>
                  <Text
                    variant="h3"
                    color={isSelected ? Colors.textInverse : Colors.textPrimary}
                    style={{ marginTop: 4 }}
                  >
                    {date.getDate()}
                  </Text>
                  <View
                    style={[
                      styles.dayDot,
                      {
                        backgroundColor: completedMark
                          ? isSelected
                            ? Colors.textInverse
                            : Colors.primary
                          : hasActivity
                            ? isSelected
                              ? Colors.textInverse + '80'
                              : Colors.primary + '60'
                            : 'transparent',
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Selected day workout */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <Text
            variant="label"
            color={Colors.textSecondary}
            tracking="wider"
            style={styles.sectionLabel}
          >
            {selectedDate === todayISO ? 'TREINO DE HOJE' : 'TREINO DO DIA'}
          </Text>
          <WorkoutCard workout={selectedWorkout} variant="today" />
        </Animated.View>

        {/* Rest of the week */}
        <Animated.View entering={FadeInDown.duration(500).delay(250)}>
          <Text
            variant="label"
            color={Colors.textSecondary}
            tracking="wider"
            style={styles.sectionLabel}
          >
            SEMANA COMPLETA
          </Text>
          <View style={styles.workoutsList}>
            {weekDates
              .filter((d) => isoLocalDate(d) !== selectedDate)
              .map((d) => (
                <WorkoutCard
                  key={isoLocalDate(d)}
                  workout={dayItem(d)}
                  variant="compact"
                  onPress={() => setSelectedDate(isoLocalDate(d))}
                />
              ))}
          </View>
        </Animated.View>

        {/* AI adjustment CTA */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <Pressable
            style={[styles.aiCta, generating && { opacity: 0.6 }]}
            onPress={handleGenerateWeek}
            disabled={generating}
          >
            <View style={styles.aiIcon}>
              {generating ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="sparkles" size={18} color={Colors.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" color={Colors.textPrimary}>
                {generating ? 'Gerando plano...' : 'Gerar próxima semana com IA'}
              </Text>
              <Text variant="caption" color={Colors.textSecondary}>
                A IA analisa seus últimos treinos e monta os próximos 7 dias.
              </Text>
            </View>
            {!generating && <Ionicons name="arrow-forward" size={18} color={Colors.primary} />}
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
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
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
  weekNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.4,
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
  dayCellToday: {
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
