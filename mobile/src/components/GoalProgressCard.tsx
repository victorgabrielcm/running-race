import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/theme';
import { Text } from './ui/Text';
import { ProgressBar } from './ui/ProgressBar';
import type { UserGoal } from '@/types';

interface Props {
  goal: UserGoal;
  currentWeek?: number;
  totalWeeks?: number;
  daysRemaining?: number;
  feasibility?: {
    verdict: 'feasible' | 'tight' | 'risky' | 'impossible';
    reason?: string;
  };
  projection?: string;
}

const verdictLabel: Record<NonNullable<Props['feasibility']>['verdict'], string> = {
  feasible: 'NO PRAZO',
  tight: 'APERTADO',
  risky: 'ARRISCADO',
  impossible: 'INVIÁVEL',
};

const verdictColor: Record<NonNullable<Props['feasibility']>['verdict'], string> = {
  feasible: Colors.primary,
  tight: Colors.tertiary,
  risky: Colors.secondary,
  impossible: Colors.secondary,
};

export function GoalProgressCard({
  goal,
  currentWeek,
  totalWeeks,
  daysRemaining,
  feasibility,
  projection,
}: Props) {
  const hasPlan = !!(currentWeek && totalWeeks);
  const planProgress = hasPlan ? (currentWeek! - 1) / totalWeeks! : 0;

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(204, 255, 0, 0.08)', 'rgba(204, 255, 0, 0)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
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

      {feasibility ? (
        <View style={[styles.verdictBadge, { borderColor: verdictColor[feasibility.verdict] + '60' }]}>
          <View style={[styles.verdictDot, { backgroundColor: verdictColor[feasibility.verdict] }]} />
          <Text variant="label" color={verdictColor[feasibility.verdict]} tracking="wider">
            {verdictLabel[feasibility.verdict]}
          </Text>
          {feasibility.reason ? (
            <Text variant="caption" color={Colors.textSecondary} style={{ flex: 1 }} numberOfLines={2}>
              {feasibility.reason}
            </Text>
          ) : null}
        </View>
      ) : null}

      {hasPlan ? (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text variant="caption" color={Colors.textSecondary} uppercase tracking="wider">
              Progresso do plano
            </Text>
            <Text variant="bodyMedium" color={Colors.primary}>
              {Math.round(planProgress * 100)}%
            </Text>
          </View>
          <ProgressBar value={planProgress} color={Colors.primary} height={8} />
          <View style={styles.kmRow}>
            <Text variant="caption" color={Colors.textSecondary}>
              Semana {currentWeek} de {totalWeeks}
            </Text>
          </View>
        </View>
      ) : null}

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
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  verdictDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
