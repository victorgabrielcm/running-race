import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/theme';
import { Text } from './ui/Text';
import type { StravaActivity } from '@/types';
import { formatPace, formatDistance, formatDuration } from '@/utils/format';

interface Props {
  activity: StravaActivity;
  onPress?: () => void;
}

export function ActivityRow({ activity, onPress }: Props) {
  const distanceKm = activity.distance / 1000;
  const paceSecondsPerKm = activity.moving_time / distanceKm;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="walk" size={20} color={Colors.primary} />
      </View>

      <View style={styles.middle}>
        <Text variant="bodyMedium" color={Colors.textPrimary} numberOfLines={1}>
          {activity.name}
        </Text>
        <View style={styles.metaRow}>
          <Text variant="caption" color={Colors.textSecondary}>
            {formatRelativeDate(activity.start_date_local)}
          </Text>
          <View style={styles.dot} />
          <Text variant="caption" color={Colors.textSecondary}>
            {formatDuration(activity.moving_time)}
          </Text>
          {activity.average_heartrate ? (
            <>
              <View style={styles.dot} />
              <Text variant="caption" color={Colors.secondary}>
                {Math.round(activity.average_heartrate)} bpm
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        <Text variant="bodyMedium" color={Colors.primary}>
          {formatDistance(distanceKm)}
        </Text>
        <Text variant="caption" color={Colors.textSecondary}>
          {formatPace(paceSecondsPerKm)} /km
        </Text>
      </View>
    </Pressable>
  );
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  dot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.textTertiary,
  },
  right: {
    alignItems: 'flex-end',
  },
});
