import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Spacing, Radius } from '@/theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useRunStore } from '@/stores/runStore';
import {
  requestLocationPermissions,
  probeGpsSignal,
  startTracking,
} from '@/services/locationService';

const modes = [
  { id: 'free', title: 'LIVRE', desc: 'Sem meta, só correr', icon: 'flash' as const },
  {
    id: 'workout',
    title: 'TREINO DO DIA',
    desc: 'Tempo Run · 8 km · 4:20/km',
    icon: 'fitness' as const,
  },
  {
    id: 'distance',
    title: 'META DE KM',
    desc: 'Escolha a distância',
    icon: 'map' as const,
  },
  {
    id: 'time',
    title: 'META DE TEMPO',
    desc: 'Escolha a duração',
    icon: 'time' as const,
  },
];

export default function PreRunScreen() {
  const router = useRouter();
  const prepare = useRunStore((s) => s.prepare);
  const start = useRunStore((s) => s.start);
  const [signal, setSignal] = useState<'searching' | 'weak' | 'strong' | 'lost'>(
    'searching',
  );
  const [permission, setPermission] = useState<'granted' | 'denied' | 'limited' | null>(
    null,
  );
  const [mode, setMode] = useState<string>('free');

  useEffect(() => {
    (async () => {
      prepare();
      const perm = await requestLocationPermissions();
      setPermission(perm);
      if (perm !== 'denied') {
        const loc = await probeGpsSignal();
        if (loc?.coords.accuracy != null && loc.coords.accuracy <= 10) {
          setSignal('strong');
        } else if (loc) {
          setSignal('weak');
        } else {
          setSignal('lost');
        }
      }
    })();
  }, [prepare]);

  const handleStart = async () => {
    if (permission === 'denied') return;
    start();
    await startTracking();
    router.replace('/run/active');
  };

  const signalConfig = {
    searching: { label: 'PROCURANDO', color: Colors.textSecondary, bars: 0 },
    weak: { label: 'SINAL FRACO', color: Colors.secondary, bars: 2 },
    strong: { label: 'SINAL FORTE', color: Colors.primary, bars: 3 },
    lost: { label: 'SEM SINAL', color: Colors.error, bars: 0 },
  }[signal];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background, '#0F0F08', Colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </Pressable>
          <Text variant="label" color={Colors.primary} tracking="widest">
            INICIAR CORRIDA
          </Text>
          <View style={styles.closeBtn} />
        </View>

        <Animated.View entering={FadeIn.duration(600)} style={styles.gpsSection}>
          <View style={styles.gpsCircle}>
            <View style={[styles.gpsPulse, { borderColor: signalConfig.color + '40' }]} />
            <View style={[styles.gpsInner, { borderColor: signalConfig.color }]}>
              <Ionicons name="locate" size={36} color={signalConfig.color} />
            </View>
          </View>
          <Text
            variant="label"
            color={signalConfig.color}
            tracking="widest"
            style={{ marginTop: Spacing.base }}
          >
            {signalConfig.label}
          </Text>
          <View style={styles.bars}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: 4 + i * 4,
                    backgroundColor:
                      i <= signalConfig.bars ? signalConfig.color : Colors.border,
                  },
                ]}
              />
            ))}
          </View>
        </Animated.View>

        <View style={styles.modes}>
          <Text
            variant="label"
            color={Colors.textSecondary}
            tracking="wider"
            style={{ marginBottom: Spacing.md }}
          >
            TIPO DE TREINO
          </Text>
          {modes.map((m, i) => {
            const active = mode === m.id;
            return (
              <Animated.View
                key={m.id}
                entering={FadeInDown.duration(400).delay(100 + i * 60)}
              >
                <Pressable
                  onPress={() => setMode(m.id)}
                  style={[styles.modeCard, active && styles.modeActive]}
                >
                  <View style={[styles.modeIcon, active && styles.modeIconActive]}>
                    <Ionicons
                      name={m.icon}
                      size={18}
                      color={active ? Colors.textInverse : Colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      variant="bodyMedium"
                      color={active ? Colors.textInverse : Colors.textPrimary}
                      tracking="wide"
                    >
                      {m.title}
                    </Text>
                    <Text
                      variant="caption"
                      color={active ? Colors.textInverse : Colors.textSecondary}
                    >
                      {m.desc}
                    </Text>
                  </View>
                  {active ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={Colors.textInverse}
                    />
                  ) : null}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {permission === 'denied' ? (
          <View style={styles.warnCard}>
            <Ionicons name="warning" size={18} color={Colors.error} />
            <Text variant="caption" color={Colors.textPrimary} style={{ flex: 1 }}>
              Permissão de localização negada. Ative em Ajustes &gt; Vincere &gt;
              Localização.
            </Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Button
            label="Iniciar corrida"
            size="lg"
            fullWidth
            disabled={permission === 'denied' || signal === 'searching'}
            onPress={handleStart}
            leftIcon={<Ionicons name="play" size={18} color={Colors.textInverse} />}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.base,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  gpsSection: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  gpsCircle: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsPulse: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  gpsInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: Spacing.sm,
    height: 20,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
  modes: {
    flex: 1,
    paddingHorizontal: Spacing.screen,
    gap: Spacing.sm,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.xs,
  },
  modeActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  warnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.screen,
    marginBottom: Spacing.md,
    padding: Spacing.base,
    backgroundColor: Colors.error + '15',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error + '40',
  },
  footer: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
});
