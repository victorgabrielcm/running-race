import React from 'react';
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
import { mockPlan, mockRecords } from '@/mock/data';
import { formatTime, formatPace } from '@/utils/format';

const { width } = Dimensions.get('window');

export default function ProgressScreen() {
  const user = useAuthStore((s) => s.user);
  const goal = user?.mainGoal ?? mockPlan && {
    id: 'mock',
    type: '42k' as const,
    raceName: 'Maratona Internacional SP',
    targetDate: new Date(Date.now() + 70 * 86400000).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
  };

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
    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
    datasets: [{ data: [22, 28, 34, 30, 38, 42] }],
  };

  const paceData = {
    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
    datasets: [{ data: [340, 335, 328, 322, 318, 312] }],
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
              currentDistance={35}
              daysRemaining={70}
              projection="No ritmo atual, você completa a maratona em 3h28"
            />
          </Animated.View>
        ) : null}

        {/* Fitness Metrics */}
        <Animated.View entering={FadeInDown.duration(500).delay(150)}>
          <Text
            variant="label"
            color={Colors.textSecondary}
            tracking="wider"
            style={styles.sectionLabel}
          >
            MÉTRICAS DE FITNESS
          </Text>
          <View style={styles.metricsGrid}>
            <MetricCard label="CTL (FITNESS)" value="65" icon="fitness" trend="up" trendValue="+8%" />
            <MetricCard
              label="ATL (FADIGA)"
              value="58"
              accent={Colors.secondary}
              icon="pulse"
              trend="up"
              trendValue="+2%"
            />
          </View>
          <View style={styles.metricsGrid}>
            <MetricCard label="TSB (FORMA)" value="+7" icon="trending-up" trend="up" trendValue="Descansado" />
            <MetricCard
              label="VO2 MAX"
              value="52"
              unit="ml/kg"
              accent={Colors.tertiary}
              icon="flash"
              trend="up"
              trendValue="+0.8"
            />
          </View>
        </Animated.View>

        {/* Volume chart */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text variant="label" color={Colors.textSecondary} tracking="wider">
                VOLUME SEMANAL
              </Text>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                <Text variant="caption" color={Colors.textSecondary}>
                  Km / semana
                </Text>
              </View>
            </View>
            <LineChart
              data={weekData}
              width={width - Spacing.screen * 2 - Spacing.xl * 2}
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
              <View style={styles.legendRow}>
                <Ionicons name="trending-down" size={14} color={Colors.primary} />
                <Text variant="caption" color={Colors.primary} weight="semibold">
                  -28s em 6 semanas
                </Text>
              </View>
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

        {/* Personal records */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <Text
            variant="label"
            color={Colors.textSecondary}
            tracking="wider"
            style={styles.sectionLabel}
          >
            RECORDES PESSOAIS
          </Text>
          <View style={styles.records}>
            {mockRecords.map((r, i) => (
              <View key={r.distance} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <Text variant="h3" color={Colors.tertiary}>
                    {r.distance.toUpperCase()}
                  </Text>
                  <Ionicons name="trophy" size={14} color={Colors.tertiary} />
                </View>
                <Text variant="metric" color={Colors.textPrimary} style={{ marginTop: 8 }}>
                  {formatTime(r.time)}
                </Text>
                <Text variant="caption" color={Colors.textSecondary}>
                  {formatPace(r.pace)} /km
                </Text>
              </View>
            ))}
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
  records: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  recordCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.tertiary + '30',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
