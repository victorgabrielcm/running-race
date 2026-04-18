import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { Colors, Spacing, Radius } from '@/theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useRunStore } from '@/stores/runStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { healthService } from '@/services/healthService';
import { notificationService } from '@/services/notificationService';
import { formatDistance, formatPace, formatTime } from '@/utils/format';

export default function SummaryScreen() {
  const router = useRouter();
  const {
    distanceM,
    elapsedSec,
    avgPaceSecPerKm,
    elevationGain,
    splits,
    startedAt,
    reset,
  } = useRunStore();

  const { healthSyncEnabled, autoSyncAfterRun } = useSettingsStore();
  const [healthSyncing, setHealthSyncing] = useState(false);
  const [healthSynced, setHealthSynced] = useState(false);

  const bestSplit = splits.reduce<typeof splits[number] | null>(
    (best, s) => (!best || s.pace < best.pace ? s : best),
    null,
  );

  const handleDone = async () => {
    // If auto-sync is on and not yet synced, do it silently before leaving
    if (autoSyncAfterRun && healthSyncEnabled && !healthSynced) {
      await syncToHealth(true);
    }
    // Post-run notification
    if (distanceM > 100) {
      await notificationService.showRunCompleteNotification(
        distanceM / 1000,
        formatPace(avgPaceSecPerKm)
      );
    }
    reset();
    router.replace('/(tabs)');
  };

  const handleUploadStrava = () => {
    Alert.alert(
      'Em breve!',
      'O upload direto para o Strava está chegando na próxima atualização. Por enquanto, seu treino fica salvo no VINCERE e você pode importar pelo Strava Connect.',
      [{ text: 'Entendido' }]
    );
  };

  async function syncToHealth(silent = false) {
    setHealthSyncing(true);
    try {
      const now = new Date();
      const startTime =
        startedAt != null
          ? new Date(startedAt)
          : new Date(now.getTime() - elapsedSec * 1000);
      await healthService.syncWorkout({
        startTime,
        endTime: now,
        distanceMeters: distanceM,
        durationSeconds: elapsedSec,
        avgPaceSecPerKm,
        elevationGain,
        splits,
      });
      setHealthSynced(true);
      if (!silent) {
        Alert.alert(
          `Salvo no ${healthService.getPlatformName()}`,
          'Distância, tempo e calorias foram sincronizados.',
          [{ text: 'OK' }]
        );
      }
    } catch (err: any) {
      if (!silent) {
        Alert.alert(
          'Erro ao sincronizar',
          err?.message ?? 'Não foi possível salvar no app de saúde.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setHealthSyncing(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary + '25', 'transparent']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
            <View style={styles.celebrationIcon}>
              <Ionicons name="trophy" size={32} color={Colors.primary} />
            </View>
            <Text variant="label" color={Colors.primary} tracking="widest">
              TREINO CONCLUÍDO
            </Text>
            <Text variant="display" color={Colors.textPrimary} style={styles.title}>
              Mais um{'\n'}km no bolso.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <View style={styles.heroCard}>
              <Text variant="label" color={Colors.textSecondary} tracking="widest">
                DISTÂNCIA FINAL
              </Text>
              <View style={styles.heroValueRow}>
                <Text style={styles.heroValue}>
                  {formatDistance(distanceM / 1000)}
                </Text>
                <Text variant="h2" color={Colors.textSecondary} style={{ marginBottom: 14 }}>
                  km
                </Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <View style={styles.metricsGrid}>
              <StatCell
                label="TEMPO"
                value={formatTime(elapsedSec)}
                color={Colors.textPrimary}
              />
              <StatCell
                label="PACE MÉDIO"
                value={formatPace(avgPaceSecPerKm)}
                unit="/km"
                color={Colors.primary}
              />
              <StatCell
                label="ELEVAÇÃO"
                value={`${Math.round(elevationGain)}`}
                unit="m"
                color={Colors.textPrimary}
              />
              <StatCell
                label="MELHOR KM"
                value={bestSplit ? formatPace(bestSplit.pace) : '—'}
                unit={bestSplit ? `km ${bestSplit.km}` : ''}
                color={Colors.tertiary}
              />
            </View>
          </Animated.View>

          {/* Splits */}
          {splits.length > 0 ? (
            <Animated.View entering={FadeInDown.duration(500).delay(400)}>
              <Text
                variant="label"
                color={Colors.textSecondary}
                tracking="wider"
                style={styles.sectionLabel}
              >
                PARCIAIS POR KM
              </Text>
              <View style={styles.splitsCard}>
                {splits.map((s) => {
                  const rel = bestSplit ? s.pace - bestSplit.pace : 0;
                  const width = Math.min(100, (s.pace / (bestSplit?.pace ?? 1)) * 100);
                  return (
                    <View key={s.km} style={styles.splitRow}>
                      <Text
                        variant="bodyMedium"
                        color={Colors.textSecondary}
                        style={{ width: 50 }}
                      >
                        KM {s.km}
                      </Text>
                      <View style={styles.splitBar}>
                        <View
                          style={[
                            styles.splitFill,
                            {
                              width: `${width}%`,
                              backgroundColor:
                                s === bestSplit ? Colors.primary : Colors.textTertiary,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        variant="bodyMedium"
                        color={Colors.textPrimary}
                        style={{ width: 64, textAlign: 'right' }}
                      >
                        {formatPace(s.pace)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          ) : null}

          {/* AI coach prompt */}
          <Animated.View entering={FadeInDown.duration(500).delay(500)}>
            <Pressable style={styles.aiCard}>
              <View style={styles.aiIcon}>
                <Ionicons name="sparkles" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={Colors.textPrimary}>
                  Pedir análise da IA
                </Text>
                <Text variant="caption" color={Colors.textSecondary}>
                  Claude vai avaliar esse treino e ajustar o plano.
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
            </Pressable>
          </Animated.View>

          <View style={{ height: 120 }} />
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Enviar para o Strava"
            variant="outlined"
            size="md"
            fullWidth
            onPress={handleUploadStrava}
            leftIcon={<Ionicons name="fitness" size={16} color={Colors.strava} />}
          />

          {/* Apple Health / Google Health button — visible when sync is enabled */}
          {healthSyncEnabled && !healthSynced && (
            <Button
              label={
                healthSyncing
                  ? `Salvando...`
                  : `Salvar no ${healthService.getPlatformName()}`
              }
              variant="outlined"
              size="md"
              fullWidth
              disabled={healthSyncing}
              onPress={() => syncToHealth(false)}
              leftIcon={
                <Ionicons
                  name={Platform.OS === 'ios' ? 'heart' : 'fitness'}
                  size={16}
                  color="#FF375F"
                />
              }
            />
          )}

          {healthSynced && (
            <View style={styles.healthSyncedRow}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text variant="caption" color={Colors.primary}>
                Salvo no {healthService.getPlatformName()}
              </Text>
            </View>
          )}

          <Button
            label="Salvar e concluir"
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleDone}
            rightIcon={<Ionicons name="checkmark" size={18} color={Colors.textInverse} />}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function StatCell({
  label,
  value,
  unit,
  color = Colors.textPrimary,
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <View style={styles.statCell}>
      <Text variant="label" color={Colors.textSecondary} tracking="wider">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
        <Text variant="h1" color={color}>
          {value}
        </Text>
        {unit ? (
          <Text variant="caption" color={Colors.textSecondary}>
            {unit}
          </Text>
        ) : null}
      </View>
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
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  celebrationIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  title: {
    textAlign: 'center',
    fontSize: 36,
    lineHeight: 40,
    marginTop: Spacing.xs,
  },
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: Spacing.sm,
  },
  heroValue: {
    color: Colors.primary,
    fontSize: 88,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
    lineHeight: 90,
    letterSpacing: -3,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  sectionLabel: {
    marginBottom: Spacing.md,
  },
  splitsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: Spacing.md,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  splitBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  splitFill: { height: '100%', borderRadius: 3 },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
  },
  healthSyncedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.xs,
  },
});
