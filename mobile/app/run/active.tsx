import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Colors, Spacing, Radius } from '@/theme';
import { Text } from '@/components/ui/Text';
import { useRunStore } from '@/stores/runStore';
import { stopTracking } from '@/services/locationService';
import { formatDistance, formatPace, formatTime } from '@/utils/format';

export default function ActiveRunScreen() {
  useKeepAwake(); // screen stays on during the run

  const router = useRouter();
  const {
    status,
    distanceM,
    elapsedSec,
    currentPaceSecPerKm,
    avgPaceSecPerKm,
    elevationGain,
    splits,
    gpsSignal,
    pause,
    resume,
    stop,
    tick,
  } = useRunStore();

  // Tick every 250ms to keep elapsed + average pace live
  useEffect(() => {
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [tick]);

  const handlePauseResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (status === 'running') pause();
    else if (status === 'paused') resume();
  };

  const handleStop = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    stop();
    await stopTracking();
    router.replace('/run/summary');
  };

  const signalColor =
    gpsSignal === 'strong' ? Colors.primary
      : gpsSignal === 'weak' ? Colors.secondary
      : Colors.error;

  const isPaused = status === 'paused';

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.signalRow}>
            <View style={[styles.signalDot, { backgroundColor: signalColor }]} />
            <Text variant="label" color={signalColor} tracking="wider">
              GPS {gpsSignal.toUpperCase()}
            </Text>
          </View>
          {isPaused ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.pausedBadge}
            >
              <Ionicons name="pause-circle" size={14} color={Colors.secondary} />
              <Text variant="label" color={Colors.secondary} tracking="wider">
                PAUSADO
              </Text>
            </Animated.View>
          ) : (
            <Text variant="label" color={Colors.primary} tracking="wider">
              ● GRAVANDO
            </Text>
          )}
        </View>

        {/* Hero metric — distance */}
        <View style={styles.hero}>
          <Text variant="label" color={Colors.textSecondary} tracking="widest">
            DISTÂNCIA
          </Text>
          <Text style={styles.heroValue}>
            {formatDistance(distanceM / 1000)}
          </Text>
          <Text variant="h3" color={Colors.textSecondary}>
            km
          </Text>
        </View>

        {/* Secondary metrics */}
        <View style={styles.secondaryRow}>
          <View style={styles.metric}>
            <Text variant="label" color={Colors.textSecondary} tracking="wider">
              TEMPO
            </Text>
            <Text style={styles.metricValue}>{formatTime(elapsedSec)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.metric}>
            <Text variant="label" color={Colors.textSecondary} tracking="wider">
              PACE ATUAL
            </Text>
            <Text style={styles.metricValue}>
              {formatPace(currentPaceSecPerKm)}
            </Text>
          </View>
        </View>

        <View style={styles.tertiaryRow}>
          <TertiaryStat
            label="PACE MÉDIO"
            value={formatPace(avgPaceSecPerKm)}
            unit="/km"
          />
          <TertiaryStat
            label="ELEVAÇÃO"
            value={`${Math.round(elevationGain)}`}
            unit="m"
          />
          <TertiaryStat
            label="KM"
            value={`${splits.length}`}
            unit="parciais"
          />
        </View>

        {/* Splits list — shows last 3 km */}
        {splits.length > 0 ? (
          <View style={styles.splits}>
            <Text
              variant="label"
              color={Colors.textSecondary}
              tracking="wider"
              style={{ marginBottom: Spacing.sm }}
            >
              PARCIAIS
            </Text>
            {splits.slice(-3).reverse().map((s) => (
              <View key={s.km} style={styles.splitRow}>
                <Text variant="bodyMedium" color={Colors.textPrimary}>
                  KM {s.km}
                </Text>
                <Text variant="bodyMedium" color={Colors.primary}>
                  {formatPace(s.pace)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            onPress={handlePauseResume}
            style={[styles.ctrlBtn, styles.ctrlSecondary]}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={28}
              color={Colors.textPrimary}
            />
          </Pressable>

          <Pressable
            onLongPress={handleStop}
            delayLongPress={800}
            style={({ pressed }) => [
              styles.ctrlBtn,
              styles.ctrlStop,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <Ionicons name="stop" size={32} color={Colors.textInverse} />
          </Pressable>
        </View>

        <Text variant="caption" color={Colors.textTertiary} style={styles.hint}>
          Segure o botão vermelho por 1s para finalizar
        </Text>
      </SafeAreaView>
    </View>
  );
}

function TertiaryStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text variant="label" color={Colors.textTertiary} tracking="wider">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text variant="h2" color={Colors.textPrimary}>
          {value}
        </Text>
        <Text variant="caption" color={Colors.textSecondary}>
          {unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.base,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signalDot: { width: 8, height: 8, borderRadius: 4 },
  pausedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.secondary + '22',
  },
  hero: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  heroValue: {
    color: Colors.primary,
    fontSize: 120,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
    lineHeight: 130,
    letterSpacing: -4,
  },
  secondaryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screen,
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: {
    color: Colors.textPrimary,
    fontSize: 48,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    lineHeight: 52,
    letterSpacing: -1,
    marginTop: 6,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  tertiaryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.base,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.lg,
  },
  splits: {
    flex: 1,
    paddingHorizontal: Spacing.screen,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.lg,
  },
  ctrlBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlSecondary: {
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  ctrlStop: {
    backgroundColor: Colors.error,
  },
  hint: {
    textAlign: 'center',
    paddingBottom: Spacing.base,
  },
});
