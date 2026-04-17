import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Colors, Spacing, Radius } from '@/theme';
import { Text } from '@/components/ui/Text';
import { ActivityRow } from '@/components/ActivityRow';
import { useTrainingStore } from '@/stores/trainingStore';
import { useAuthStore } from '@/stores/authStore';
import { fetchRecentActivities } from '@/services/strava';
import { mockActivities } from '@/mock/data';
import { formatDistance, formatDurationHuman, formatPace } from '@/utils/format';

export default function ActivitiesScreen() {
  const router = useRouter();
  const activities = useTrainingStore((s) => s.activities);
  const setActivities = useTrainingStore((s) => s.setActivities);
  const tokens = useAuthStore((s) => s.tokens);
  const [refreshing, setRefreshing] = useState(false);

  const isDemo = !tokens || tokens.access_token === 'demo-access-token';
  const hasReal = activities.length > 0;
  const list = hasReal ? activities : mockActivities;

  const sync = async () => {
    if (isDemo) return;
    try {
      setRefreshing(true);
      const fresh = await fetchRecentActivities();
      setActivities(fresh);
    } catch (err) {
      console.warn('[activities] sync failed', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isDemo && activities.length === 0) sync();
  }, []);

  // Group activities by month for a cleaner scroll
  const grouped = useMemo(() => {
    const map = new Map<string, typeof list>();
    for (const a of list) {
      const d = new Date(a.start_date_local);
      const key = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [list]);

  const totals = useMemo(() => {
    const distanceKm = list.reduce((acc, a) => acc + a.distance / 1000, 0);
    const time = list.reduce((acc, a) => acc + a.moving_time, 0);
    const avgPaceSec =
      distanceKm > 0 ? time / distanceKm : 0;
    return {
      distanceKm,
      time,
      avgPaceSec,
      count: list.length,
    };
  }, [list]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="label" color={Colors.primary} tracking="wider">
            HISTÓRICO
          </Text>
          <Text variant="h3" color={Colors.textPrimary}>
            Suas corridas
          </Text>
        </View>
        {!isDemo && (
          <Pressable onPress={sync} style={styles.backBtn} hitSlop={10}>
            {refreshing ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="refresh" size={20} color={Colors.textPrimary} />
            )}
          </Pressable>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          !isDemo ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={sync}
              tintColor={Colors.primary}
            />
          ) : undefined
        }
      >
        {isDemo && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.demoBanner}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.tertiary} />
            <Text variant="caption" color={Colors.tertiary} style={{ flex: 1 }}>
              Histórico de exemplo. Conecte o Strava para ver suas corridas reais.
            </Text>
          </Animated.View>
        )}

        {/* Totals summary */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text variant="label" color={Colors.textSecondary} tracking="wider">
                TOTAL
              </Text>
              <Text variant="metric" color={Colors.textPrimary}>
                {formatDistance(totals.distanceKm)}
                <Text variant="body" color={Colors.textSecondary}>
                  {' '}km
                </Text>
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="label" color={Colors.textSecondary} tracking="wider">
                TEMPO
              </Text>
              <Text variant="metric" color={Colors.textPrimary}>
                {formatDurationHuman(totals.time)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text variant="label" color={Colors.textSecondary} tracking="wider">
                PACE MÉDIO
              </Text>
              <Text variant="metric" color={Colors.textPrimary}>
                {formatPace(totals.avgPaceSec)}
                <Text variant="body" color={Colors.textSecondary}>
                  {' '}/km
                </Text>
              </Text>
            </View>
          </View>
          <View style={styles.countBadge}>
            <Ionicons name="walk" size={14} color={Colors.primary} />
            <Text variant="caption" color={Colors.textSecondary}>
              {totals.count} {totals.count === 1 ? 'corrida' : 'corridas'} registradas
            </Text>
          </View>
        </Animated.View>

        {grouped.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="walk-outline" size={40} color={Colors.textTertiary} />
            <Text variant="bodyMedium" color={Colors.textSecondary} style={{ marginTop: Spacing.md }}>
              Nenhuma corrida ainda
            </Text>
            <Text variant="caption" color={Colors.textTertiary} style={{ textAlign: 'center', marginTop: 4 }}>
              Conecte o Strava ou grave sua primeira corrida.
            </Text>
          </View>
        ) : (
          grouped.map(([month, items], groupIdx) => (
            <Animated.View
              key={month}
              entering={FadeInDown.duration(400).delay(50 + groupIdx * 30)}
              style={styles.group}
            >
              <Text
                variant="label"
                color={Colors.textSecondary}
                tracking="wider"
                style={styles.groupLabel}
              >
                {month.toUpperCase()}
              </Text>
              <View style={styles.rows}>
                {items.map((a) => (
                  <ActivityRow key={a.id} activity={a} />
                ))}
              </View>
            </Animated.View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  scroll: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.base,
    gap: Spacing.lg,
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
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  summaryItem: { flex: 1 },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  group: {
    gap: Spacing.md,
  },
  groupLabel: {
    textTransform: 'uppercase',
  },
  rows: {
    gap: Spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
});
