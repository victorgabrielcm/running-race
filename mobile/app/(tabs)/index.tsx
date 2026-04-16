import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors, Spacing, Radius, BRAND } from '@/theme';
import { Text } from '@/components/ui/Text';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { MetricCard } from '@/components/MetricCard';
import { WorkoutCard } from '@/components/WorkoutCard';
import { AIInsightCard } from '@/components/AIInsightCard';
import { ActivityRow } from '@/components/ActivityRow';
import { useAuthStore } from '@/stores/authStore';
import { useTrainingStore } from '@/stores/trainingStore';
import { greeting, formatDistance, formatPace, formatDurationHuman } from '@/utils/format';
import { mockActivities, mockPlan, mockInsight, mockWeeklyStats } from '@/mock/data';

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const activities = useTrainingStore((s) => s.activities);
  const plan = useTrainingStore((s) => s.plan);

  // Fallback to mock data during development
  const recentActivities = activities.length > 0 ? activities : mockActivities;
  const todayWorkout = plan?.weeks[0]?.workouts[0] ?? mockPlan.weeks[0].workouts[0];
  const weekStats = mockWeeklyStats;

  const weeklyGoal = user?.weeklyGoalKm ?? 50;
  const weeklyDone = weekStats.distance;
  const weeklyProgress = weeklyDone / weeklyGoal;

  const lastRun = recentActivities[0];
  const lastRunKm = lastRun ? lastRun.distance / 1000 : 0;
  const lastRunPace = lastRun ? lastRun.moving_time / lastRunKm : 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background, '#0F0F08', Colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} tintColor={Colors.primary} />}
        >
          {/* Header with brand + avatar */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text variant="caption" color={Colors.textSecondary}>
                  {greeting()},
                </Text>
                <Text variant="h3" color={Colors.textPrimary}>
                  {user?.name?.split(' ')[0] ?? 'Atleta'}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Text variant="label" color={Colors.primary} tracking="widest">
                {BRAND.name}
              </Text>
              <Pressable style={styles.iconBtn}>
                <Ionicons name="settings-outline" size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>
          </Animated.View>

          {/* Weekly Volume hero card — mirrors Stitch mockup */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <Text variant="label" color={Colors.textSecondary} tracking="wider">
                  VOLUME DA SEMANA
                </Text>
                <Text variant="label" color={Colors.primary} tracking="wider">
                  {Math.round(weeklyProgress * 100)}% ATINGIDO
                </Text>
              </View>
              <View style={styles.heroValueRow}>
                <Text variant="metricLarge" color={Colors.textPrimary}>
                  {Math.round(weeklyDone)}
                </Text>
                <Text variant="h3" color={Colors.textSecondary} style={styles.heroUnit}>
                  / {weeklyGoal} KM
                </Text>
              </View>
              <View style={{ marginTop: Spacing.base }}>
                <ProgressBar value={weeklyProgress} color={Colors.primary} height={8} />
              </View>

              <View style={styles.heroFooter}>
                <MiniStat label="Treinos" value={`${weekStats.runs}/5`} />
                <View style={styles.divider} />
                <MiniStat label="Tempo" value={formatDurationHuman(weekStats.duration * 60)} />
                <View style={styles.divider} />
                <MiniStat
                  label="Elevação"
                  value={`${Math.round(weekStats.elevation)}m`}
                />
              </View>
            </View>
          </Animated.View>

          {/* Last Run Performance — matches mockup card */}
          {lastRun ? (
            <Animated.View entering={FadeInDown.duration(500).delay(150)}>
              <Pressable style={styles.lastRunCard}>
                <View style={styles.lastRunHeader}>
                  <Text variant="label" color={Colors.textSecondary} tracking="wider">
                    ÚLTIMO TREINO
                  </Text>
                  <View style={styles.stravaBadge}>
                    <Ionicons name="logo-strava" size={12} color={Colors.strava} />
                    <Text
                      variant="label"
                      color={Colors.strava}
                      tracking="wider"
                      style={{ marginLeft: 4 }}
                    >
                      STRAVA
                    </Text>
                  </View>
                </View>

                <View style={styles.lastRunStats}>
                  <View>
                    <Text variant="metricLarge" color={Colors.textPrimary}>
                      {formatDistance(lastRunKm)}
                    </Text>
                    <Text
                      variant="label"
                      color={Colors.textSecondary}
                      tracking="wider"
                    >
                      DISTÂNCIA (KM)
                    </Text>
                  </View>
                  <View style={styles.lastRunRight}>
                    <View style={styles.paceCircle}>
                      <Text variant="metric" color={Colors.textPrimary}>
                        {formatPace(lastRunPace)}
                      </Text>
                      <Text
                        variant="label"
                        color={Colors.textSecondary}
                        tracking="wider"
                      >
                        PACE (/KM)
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.intensityBar}>
                  <View
                    style={[
                      styles.intensityFill,
                      {
                        backgroundColor: Colors.secondary,
                        width: '82%',
                      },
                    ]}
                  />
                  <Text
                    variant="label"
                    color={Colors.secondary}
                    tracking="wider"
                    style={styles.intensityLabel}
                  >
                    INTENSIDADE: ALTA
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          ) : null}

          {/* AI Insight */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <AIInsightCard insight={mockInsight} />
          </Animated.View>

          {/* Today's Workout */}
          <Animated.View entering={FadeInDown.duration(500).delay(250)}>
            <Text variant="label" color={Colors.textSecondary} tracking="wider" style={styles.sectionLabel}>
              TREINO DE HOJE
            </Text>
            <WorkoutCard workout={todayWorkout} variant="today" />
          </Animated.View>

          {/* Metrics row */}
          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <Text variant="label" color={Colors.textSecondary} tracking="wider" style={styles.sectionLabel}>
              FITNESS & FORMA
            </Text>
            <View style={styles.metricsRow}>
              <MetricCard
                label="FORMA (TSB)"
                value="+8"
                unit=""
                icon="pulse"
                trend="up"
                trendValue="Descansado"
              />
              <MetricCard
                label="CARGA 7D"
                value="420"
                unit="TSS"
                accent={Colors.secondary}
                icon="trending-up"
                trend="up"
                trendValue="+12%"
              />
            </View>
            <View style={styles.metricsRow}>
              <MetricCard
                label="VO2 MAX"
                value="52"
                unit="ml/kg"
                accent={Colors.tertiary}
                icon="flash"
                trend="up"
                trendValue="+0.8"
              />
              <MetricCard
                label="PACE MÉDIO"
                value={formatPace(weekStats.avgPace)}
                unit="/km"
                icon="speedometer"
                trend="down"
                trendValue="-6s/km"
              />
            </View>
          </Animated.View>

          {/* Recent activities */}
          <Animated.View entering={FadeInDown.duration(500).delay(350)}>
            <View style={styles.sectionHeader}>
              <Text variant="label" color={Colors.textSecondary} tracking="wider">
                ATIVIDADES RECENTES
              </Text>
              <Pressable>
                <Text variant="caption" color={Colors.primary} weight="semibold">
                  Ver tudo
                </Text>
              </Pressable>
            </View>
            <View style={styles.activityList}>
              {recentActivities.slice(0, 4).map((a) => (
                <ActivityRow key={a.id} activity={a} />
              ))}
            </View>
          </Animated.View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="label" color={Colors.textTertiary} tracking="wider">
        {label}
      </Text>
      <Text variant="bodyMedium" color={Colors.textPrimary}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.base,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  heroUnit: {
    marginBottom: 8,
  },
  heroFooter: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.borderSubtle,
  },
  lastRunCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  lastRunHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stravaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.strava + '22',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  lastRunStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing.base,
  },
  lastRunRight: {
    alignItems: 'flex-end',
  },
  paceCircle: {
    alignItems: 'flex-end',
  },
  intensityBar: {
    marginTop: Spacing.lg,
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  intensityFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  intensityLabel: {
    position: 'absolute',
    right: 0,
    top: 6,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  activityList: {
    gap: Spacing.sm,
  },
});
