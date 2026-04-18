import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Colors, Spacing, Radius } from '@/theme';
import { Text } from '@/components/ui/Text';
import { GoalProgressCard } from '@/components/GoalProgressCard';
import { MetricCard } from '@/components/MetricCard';
import { useAuthStore } from '@/stores/authStore';
import { useTrainingStore } from '@/stores/trainingStore';
import { mockPlan, mockActivities } from '@/mock/data';
import { formatTime, formatPace } from '@/utils/format';
import { lastNWeeks, personalRecordSlots } from '@/utils/stats';

const { width } = Dimensions.get('window');

export default function ProgressScreen() {
  const user = useAuthStore((s) => s.user);
  const activities = useTrainingStore((s) => s.activities);
  const goal = user?.mainGoal ?? (mockPlan && {
    id: 'mock',
    type: '42k' as const,
    raceName: 'Maratona Internacional SP',
    targetDate: new Date(Date.now() + 70 * 86400000).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
  });

  const plan = useTrainingStore((s) => s.plan);
  const hasRealData = activities.length > 0;
  const source = hasRealData ? activities : mockActivities;

  const weeks = useMemo(() => lastNWeeks(source, 6), [source]);
  const recordSlots = useMemo(() => personalRecordSlots(source), [source]);

  // Days until race
  const daysRemaining = goal?.targetDate
    ? Math.max(0, Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000))
    : undefined;

  const chartConfig = {
    backgroundGradientFrom: Colors.card,
    backgroundGradientTo: Colors.card,
    color: (opacity = 1) => `rgba(204, 255, 0, ${opacity})`,
    labelColor: () => Colors.textSecondary,
    strokeWidth: 3,
    propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.primary, fill: Colors.card },
    propsForBackgroundLines: {
      stroke: Colors.borderSubtle,
      strokeDasharray: '',
    },
    decimalPlaces: 0,
  };

  const weekData = {
    labels: weeks.map((w) => w.week),
    datasets: [{ data: weeks.map((w) => w.distance) }],
  };

  // chart-kit chokes on all-zero datasets — force at least a baseline so the
  // axis renders even on a rest week.
  const pacePoints = weeks.map((w) => w.avgPace || 0);
  const hasPace = pacePoints.some((p) => p > 0);
  const paceData = {
    labels: weeks.map((w) => w.week),
    datasets: [{ data: hasPace ? pacePoints : [0, 0, 0, 0, 0, 0] }],
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)}>
          <Text variant="label" color={Colors.primary} tracking="wider">
            EVOLUÇÃO
          </Text>
          <Text variant="display" color={Colors.textPrimary} style={styles.title}>
            Rumo à meta.
          </Text>
        </Animated.View>

        {goal ? (
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <GoalProgressCard
              goal={goal as any}
              currentWeek={plan?.currentWeek}
              totalWeeks={plan?.totalWeeks}
              daysRemaining={daysRemaining}
            />
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(500).delay(150)}>
          <View style={styles.metricsGrid}>
            <MetricCard
              label="KM SEMANA"
              value={String(weeks[weeks.length - 1]?.distance ?? 0)}
              unit="km"
              icon="trending-up"
              trend={
                weeks.length >= 2 &&
                weeks[weeks.length - 1].distance > weeks[weeks.length - 2].distance
                  ? 'up'
                  : 'down'
              }
              trendValue={
                weeks.length >= 2
                  ? `${weeks[weeks.length - 1].distance - weeks[weeks.length - 2].distance > 0 ? '+' : ''}${(
                      weeks[weeks.length - 1].distance - weeks[weeks.length - 2].distance
                    ).toFixed(1)} vs W ant.`
                  : 'Primeira semana'
              }
            />
            <MetricCard
              label="PACE MÉDIO"
              value={formatPace(weeks[weeks.length - 1]?.avgPace || 0)}
              unit="/km"
              accent={Colors.tertiary}
              icon="flash"
              trend={
                weeks.length >= 2 &&
                weeks[weeks.length - 1].avgPace > 0 &&
                weeks[weeks.length - 2].avgPace > 0 &&
                weeks[weeks.length - 1].avgPace < weeks[weeks.length - 2].avgPace
                  ? 'up'
                  : 'down'
              }
              trendValue={
                weeks.length >= 2 && weeks[weeks.length - 2].avgPace > 0
                  ? `${Math.round(
                      weeks[weeks.length - 2].avgPace - weeks[weeks.length - 1].avgPace,
                    )}s vs W ant.`
                  : '—'
              }
            />
          </View>
        </Animated.View>

        {/* Volume chart */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text variant="label" color={Colors.textSecondary} tracking="wider">
                VOLUME SEMANAL (KM)
              </Text>
            </View>
            <LineChart
              data={weekData}
              width={width - Spacing.screen * 2 - Spacing.md * 2}
              height={180}
              chartConfig={chartConfig}
              bezier
              withShadow={false}
              withInnerLines={false}
              style={styles.chart}
              fromZero
            />
          </View>
        </Animated.View>

        {/* Pace trend */}
        <Animated.View entering={FadeInDown.duration(500).delay(250)}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text variant="label" color={Colors.textSecondary} tracking="wider">
                PACE MÉDIO (SEG/KM)
              </Text>
            </View>
            <LineChart
              data={paceData}
              width={width - Spacing.screen * 2 - Spacing.xl * 2}
              height={180}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(255, 87, 34, ${opacity})`,
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: Colors.secondary,
                  fill: Colors.card,
                },
              }}
              bezier
              withShadow={false}
              withInnerLines={false}
              style={styles.chart}
            />
          </View>
        </Animated.View>

        {/* Personal records — vertical list, all distances */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <Text
            variant="label"
            color={Colors.textSecondary}
            tracking="wider"
            style={styles.sectionLabel}
          >
            RECORDES PESSOAIS
          </Text>
          <View style={styles.recordList}>
            {recordSlots.map((slot) => {
              const conquered = slot.record !== null;
              return (
                <View
                  key={slot.distance}
                  style={[
                    styles.recordRow,
                    conquered ? styles.recordRowDone : styles.recordRowPending,
                  ]}
                >
                  <View style={styles.recordLeft}>
                    <View
                      style={[
                        styles.recordIconBox,
                        {
                          backgroundColor: conquered
                            ? Colors.tertiary + '22'
                            : Colors.card,
                        },
                      ]}
                    >
                      <Ionicons
                        name={conquered ? 'trophy' : 'lock-closed'}
                        size={14}
                        color={conquered ? Colors.tertiary : Colors.textTertiary}
                      />
                    </View>
                    <View>
                      <Text
                        variant="h3"
                        color={conquered ? Colors.textPrimary : Colors.textSecondary}
                      >
                        {slot.distance.toUpperCase()}
                      </Text>
                      {conquered ? (
                        <Text variant="caption" color={Colors.textSecondary}>
                          {formatPace(slot.record!.pace)} /km
                        </Text>
                      ) : (
                        <Text variant="caption" color={Colors.textTertiary}>
                          Sem registro ainda
                        </Text>
                      )}
                    </View>
                  </View>

                  {conquered ? (
                    <Text variant="metric" color={Colors.textPrimary} style={styles.recordTime}>
                      {formatTime(slot.record!.time)}
                    </Text>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <Text variant="label" color={Colors.textTertiary} tracking="wider">
                        PENDENTE
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
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
  title: { marginTop: 4, fontSize: 32, lineHeight: 36 },
  sectionLabel: { marginBottom: Spacing.md },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  chart: {
    marginLeft: -Spacing.base,
  },
  recordList: {
    gap: Spacing.sm,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderWidth: 1,
  },
  recordRowDone: {
    borderColor: Colors.tertiary + '40',
  },
  recordRowPending: {
    borderColor: Colors.borderSubtle,
    opacity: 0.85,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  recordIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  recordTime: {
    textAlign: 'right',
  },
  pendingBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
});
