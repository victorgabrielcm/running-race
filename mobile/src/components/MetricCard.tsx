import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/theme';
import { Card } from './ui/Card';
import { Text } from './ui/Text';

interface Props {
  label: string;
  value: string;
  unit?: string;
  accent?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  style?: ViewStyle;
}

export function MetricCard({
  label,
  value,
  unit,
  accent = Colors.primary,
  icon,
  trend,
  trendValue,
  style,
}: Props) {
  const trendColor =
    trend === 'up' ? Colors.primary : trend === 'down' ? Colors.secondary : Colors.textSecondary;
  const trendIcon: keyof typeof Ionicons.glyphMap =
    trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';

  return (
    <Card style={[styles.card, style]} padding="lg">
      <View style={styles.header}>
        <Text variant="label" color={Colors.textSecondary} tracking="wider">
          {label}
        </Text>
        {icon ? <Ionicons name={icon} size={16} color={accent} /> : null}
      </View>

      <View style={styles.valueRow}>
        <Text variant="metric" color={Colors.textPrimary}>
          {value}
        </Text>
        {unit ? (
          <Text
            variant="bodyMedium"
            color={Colors.textSecondary}
            style={styles.unit}
          >
            {unit}
          </Text>
        ) : null}
      </View>

      {trend && trendValue ? (
        <View style={styles.trendRow}>
          <Ionicons name={trendIcon} size={14} color={trendColor} />
          <Text variant="caption" color={trendColor} weight="semibold">
            {trendValue}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 140,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  unit: {
    marginBottom: 4,
  },
  trendRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
