import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { Colors, Spacing, Radius } from '@/theme';
import { Text } from '@/components/ui/Text';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { WorkoutCard } from '@/components/WorkoutCard';
import { AIInsightCard } from '@/components/AIInsightCard';
import { ActivityRow } from '@/components/ActivityRow';
import { StartRunFAB } from '@/components/StartRunFAB';
import { useAuthStore } from '@/stores/authStore';
import { useTrainingStore } from '@/stores/trainingStore';
import { fetchRecentActivities } from '@/services/strava';
import { greeting, formatDistance, formatPace, formatDurationHuman } from '@/utils/format';
import { mockActivities, mockPlan, mockInsight, mockWeeklyStats } from '@/mock/data';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tokens = useAuthStore((s) => s.tokens);
  const activities = useTrainingStore((s) => s.activities);
  const setActivities = useTrainingStore((s) => s.setActivities);
  const plan = useTrainingStore((s) => s.plan);
  const [refreshing, setRefreshing] = useState(false);

  const syncStrava = async () => {
    if (!tokens || tokens.access_token === 'demo-access-token') return;
    try {
      setRefreshing(true);
      const fresh = await fetchRecentActivities();
      setActivities(fresh);
    } catch (err) {
      console.warn('[strava sync] failed', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activities.length === 0) syncStrava();
  }, []);

  const hasRealData = activities.length > 0;
  const recentActivities = hasRealData ? activities : mockActivities;
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={syncStrava}
              tintColor={Colors.primary}
            />
          }
        >
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
            <Pressable style={styles.iconBtn} onPress={() => router.push('/settings')}>
              <Ionicons name="settings-outline" size={20} color={Colors.textPrimary} />
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <Text variant="label" color={Colors.textSecondary} tracking="wider">
                  VOLUME DA SEMANA
                </Text>
                <Text variant="label" color={Colors.primary} tracking="wider">
                  {Math.round(weeklyProgress * 100)}%
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
              </View>
            </View>
          </Animated.View>

          {!hasRealData && (
            <Animated.View entering={FadeInDown.duration(400).delay(80)}>
              <Pressable
                style={styles.demoBanner}
                onPress={() => router.push('/run')}
              >
                <Ionicons name="information-circle-outline" size={16} color={Colors.tertiary} />
                <Text variant="caption" color={Colors.tertiary} style={{ flex: 1 }}>
                  Dados de exemplo. Sincronize o Strava ou faça sua primeira corrida.
                </Text>
                <Ionicons name="play-circle" size={20} color={Colors.primary} />
              </Pressable>
            </Animated.View>
          )}

          {lastRun ? (
            <Animated.View entering={FadeInDown.duration(500).delay(150)}>
              <Pressable style={styles.lastRunCard}>
                <View style={styles.lastRunHeader}>
                  <Text variant="label" color={Colors.textSecondary} tracking="wider">
                    ÚLTIMO TREINO
                  </Text>
                  {hasRealData && (
                    <View style={styles.stravaBadge}>
                      <Ionicons name="fitness" size={12} color={Colors.strava} />
                      <Text
                        variant="label"
                        color={Colors.strava}
                        tracking="wider"
                        style={{ marginLeft: 4 }}
                      >
                        STRAVA
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.lastRunStats}>
                  <View>
                    <Text variant="metricLarge" color={Colors.textPrimary}>
                      {formatDistance(lastRunKm)}
                    </Text>
                    <Text variant="label" color={Colors.textSecondary} tracking="wider">
                      KM
                    </Text>
                  </View>
                  <View style={styles.lastRunRight}>
                    <Text variant="metric" color={Colors.textPrimary}>
                      {formatPace(lastRunPace)}
                    </Text>
                    <Text variant="label" color={Colors.textSecondary} tracking="wider">
                      PACE /KM
                    </Text>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <AIInsightCard insight={mockInsight} />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(250)}>
            <Text variant="label" color={Colors.textSecondary} tracking="wider" style={styles.sectionLabel}>
              TREINO DE HOJE
            </Text>
            <WorkoutCard workout={todayWorkout} variant="today" />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <View style={styles.sectionHeader}>
              <Text variant="label" color={Colors.textSecondary} tracking="wider">
                ATIVIDADES RECENTES
              </Text>
              <Pressable onPress={() => router.push('/activities')}>
                <Text variant="caption" color={Colors.primary} weight="semibold">
                  Ver tudo
                </Text>
              </Pressable>
            </View>
            <View style={styles.activityList}>
              {recentActivities.slice(0, 3).map((a) => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  onPress={() => router.push('/activities')}
                />
              ))}
            </View>
          </Animated.View>

          <View style={{ height: 120 }} />
        </ScrollView>

        <StartRunFAB />
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
  sectionLabel: {
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  activityList: {
    gap: Spacing.sm,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.tertiary + '15',
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.tertiary + '30',
  },
});
