import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Spacing, Radius } from '@/theme';
import { Text } from './ui/Text';
import { ProgressBar } from './ui/ProgressBar';
import type { UserGoal } from '@/types';

interface Props {
  goal: UserGoal;
  currentDistance?: number; // km completed toward goal
  daysRemaining?: number;
  projection?: string; // "You'll hit 10k in 48:25"
}

export function GoalProgressCard({
  goal,
  currentDistance = 0,
  daysRemaining,
  projection,
}: Props) {
  const targetKm = parseInt(goal.type.replace('k', '')) || 0;
  const progress = targetKm > 0 ? currentDistance / targetKm : 0;

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(204, 255, 0, 0.08)', 'rgba(204, 255, 0, 0)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.header}>
        <View>
          <Text variant="label" color={Colors.primary} tracking="wider">
            META PRINCIPAL
          </Text>
          <Text variant="display" color={Colors.textPrimary} style={styles.goalTitle}>
            {goal.raceName ?? `${goal.type.toUpperCase()} Challenge`}
          </Text>
        </View>
        <View style={styles.iconCircle}>
          <Ionicons name="trophy" size={20} color={Colors.primary} />
        </View>
      </View>

      {goal.targetDate ? (
        <View style={styles.dateRow}>
          <Ionicons name="calendar" size={14} color={Colors.textSecondary} />
          <Text variant="caption" color={Colors.textSecondary}>
            {formatDate(goal.targetDate)}
          </Text>
          {daysRemaining !== undefined ? (
            <>
              <View style={styles.dot} />
              <Text variant="caption" color={Colors.primary} weight="semibold">
                {daysRemaining} dias restantes
              </Text>
            </>
          ) : null}
        </View>
      ) : null}

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text variant="caption" color={Colors.textSecondary} uppercase tracking="wider">
            Progresso da semana
          </Text>
          <Text variant="bodyMedium" color={Colors.primary}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
        <ProgressBar value={progress} color={Colors.primary} height={8} />
        <View style={styles.kmRow}>
          <Text variant="caption" color={Colors.textSecondary}>
            {currentDistance.toFixed(1)} km
          </Text>
          <Text variant="caption" color={Colors.textTertiary}>
            Meta: {targetKm} km
          </Text>
        </View>
      </View>

      {projection ? (
        <View style={styles.projection}>
          <Ionicons name="trending-up" size={14} color={Colors.primary} />
          <Text variant="caption" color={Colors.textPrimary} weight="medium">
            {projection}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalTitle: {
    marginTop: 4,
    fontSize: 30,
    lineHeight: 32,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
  },
  progressSection: {
    marginTop: Spacing.xl,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  kmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  projection: {
    marginTop: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
});
