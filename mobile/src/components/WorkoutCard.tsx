import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Spacing, Radius, Shadow } from '@/theme';
import { Text } from './ui/Text';
import type { Workout, WorkoutType } from '@/types';

interface Props {
  workout: Workout;
  variant?: 'today' | 'compact' | 'full';
  onPress?: () => void;
}

const typeConfig: Record<
  WorkoutType,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  easy_run: { label: 'Corrida leve', color: Colors.zone2, icon: 'walk' },
  long_run: { label: 'Longão', color: Colors.tertiary, icon: 'infinite' },
  tempo: { label: 'Tempo', color: Colors.secondary, icon: 'flash' },
  interval: { label: 'Intervalado', color: Colors.secondary, icon: 'pulse' },
  fartlek: { label: 'Fartlek', color: Colors.primary, icon: 'shuffle' },
  recovery: { label: 'Regenerativo', color: Colors.zone1, icon: 'leaf' },
  race_pace: { label: 'Pace de prova', color: Colors.secondary, icon: 'trophy' },
  strength: { label: 'Força', color: Colors.textPrimary, icon: 'barbell' },
  mobility: { label: 'Mobilidade', color: Colors.zone1, icon: 'body' },
  cross_training: { label: 'Cross-training', color: Colors.textSecondary, icon: 'bicycle' },
  rest: { label: 'Descanso', color: Colors.textTertiary, icon: 'bed' },
};

export function WorkoutCard({ workout, variant = 'today', onPress }: Props) {
  const router = useRouter();
  const cfg = typeConfig[workout.type];
  const isToday = variant === 'today';

  const content = (
    <View style={[styles.card, isToday && styles.today]}>
      {isToday ? (
        <LinearGradient
          colors={Gradients.primarySoft}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: cfg.color + '22' }]}>
          <Ionicons name={cfg.icon} size={14} color={cfg.color} />
          <Text
            variant="label"
            color={cfg.color}
            tracking="wider"
            style={{ marginLeft: 6 }}
          >
            {cfg.label}
          </Text>
        </View>
        {workout.completed ? (
          <View style={styles.completed}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
          </View>
        ) : null}
      </View>

      <Text variant="h2" color={Colors.textPrimary} style={styles.title}>
        {workout.title}
      </Text>

      {workout.description ? (
        <Text variant="body" color={Colors.textSecondary} style={styles.desc}>
          {workout.description}
        </Text>
      ) : null}

      <View style={styles.stats}>
        {workout.targetDistance ? (
          <Stat
            icon="map-outline"
            label="Distância"
            value={`${workout.targetDistance} KM`}
          />
        ) : null}
        {workout.targetPace ? (
          <Stat icon="speedometer-outline" label="Pace alvo" value={workout.targetPace} />
        ) : null}
        {workout.targetDuration ? (
          <Stat
            icon="time-outline"
            label="Duração"
            value={`${workout.targetDuration} MIN`}
          />
        ) : null}
      </View>

      {isToday && !workout.completed ? (
        <Pressable
          onPress={() => router.push('/run')}
          style={({ pressed }) => [
            styles.startBtn,
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text
            variant="label"
            color={Colors.textInverse}
            tracking="widest"
          >
            INICIAR TREINO
          </Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.textInverse} />
        </Pressable>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        {content}
      </Pressable>
    );
  }
  return content;
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={statStyles.container}>
      <Ionicons name={icon} size={14} color={Colors.textSecondary} />
      <View>
        <Text variant="label" color={Colors.textTertiary} tracking="wider">
          {label}
        </Text>
        <Text variant="bodyMedium" color={Colors.textPrimary}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 100,
  },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  today: {
    borderColor: Colors.primary + '40',
    ...Shadow.glow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  completed: {
    // no styles
  },
  title: {
    marginTop: Spacing.base,
  },
  desc: {
    marginTop: Spacing.sm,
  },
  stats: {
    marginTop: Spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  startBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
