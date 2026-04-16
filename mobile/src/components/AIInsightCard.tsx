import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/theme';
import { Text } from './ui/Text';
import type { CoachInsight } from '@/types';

interface Props {
  insight: CoachInsight;
  onPress?: () => void;
}

const typeConfig = {
  warning: { color: Colors.secondary, icon: 'warning' as const, label: 'ATENÇÃO' },
  tip: { color: Colors.primary, icon: 'bulb' as const, label: 'INSIGHT' },
  achievement: { color: Colors.tertiary, icon: 'trophy' as const, label: 'CONQUISTA' },
  adjustment: { color: Colors.primary, icon: 'settings' as const, label: 'AJUSTE' },
};

export function AIInsightCard({ insight, onPress }: Props) {
  const cfg = typeConfig[insight.type];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.accentBar} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: cfg.color + '22' }]}>
            <Ionicons name={cfg.icon} size={16} color={cfg.color} />
          </View>
          <Text variant="label" color={cfg.color} tracking="wider">
            {cfg.label} · COACH IA
          </Text>
        </View>
        <Text variant="h3" color={Colors.textPrimary} style={styles.title}>
          {insight.title}
        </Text>
        <Text variant="body" color={Colors.textSecondary} style={styles.body}>
          {insight.body}
        </Text>
        {insight.action ? (
          <View style={styles.actionRow}>
            <Text variant="caption" color={Colors.primary} weight="semibold">
              {insight.action}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  accentBar: {
    width: 3,
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: Spacing.md,
  },
  body: {
    marginTop: Spacing.xs,
  },
  actionRow: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
