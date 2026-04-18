import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors, Spacing, Radius } from '@/theme';
import { Text } from '@/components/ui/Text';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { notificationService } from '@/services/notificationService';
import { healthService } from '@/services/healthService';

export default function SettingsScreen() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const {
    notificationsEnabled,
    reminderHour,
    reminderMinute,
    healthSyncEnabled,
    autoSyncAfterRun,
    setNotificationsEnabled,
    setHealthSyncEnabled,
    setAutoSyncAfterRun,
  } = useSettingsStore();

  const [togglingNotif, setTogglingNotif] = useState(false);
  const [togglingHealth, setTogglingHealth] = useState(false);

  // ─── Notifications toggle ─────────────────────────────────────────────────

  async function handleNotificationsToggle(value: boolean) {
    if (togglingNotif) return;
    setTogglingNotif(true);
    try {
      if (value) {
        const granted = await notificationService.requestPermission();
        if (!granted) {
          Alert.alert(
            'Permissão negada',
            'Habilite as notificações nas Configurações do dispositivo para receber lembretes de treino.',
            [{ text: 'OK' }]
          );
          return;
        }
        await setNotificationsEnabled(true);
        await notificationService.scheduleDailyReminder(reminderHour, reminderMinute);
        await notificationService.registerWithBackend();
      } else {
        await setNotificationsEnabled(false);
        await notificationService.cancelAll();
      }
    } finally {
      setTogglingNotif(false);
    }
  }

  // ─── Health sync toggle ───────────────────────────────────────────────────

  async function handleHealthToggle(value: boolean) {
    if (togglingHealth) return;
    setTogglingHealth(true);
    try {
      if (value) {
        // Warn that dev build is required
        Alert.alert(
          `Sync com ${healthService.getPlatformName()}`,
          `Para sincronizar treinos com o ${healthService.getPlatformName()} é necessário instalar o app via build de desenvolvimento (não Expo Go).\n\nDeseja ativar assim mesmo?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Ativar',
              onPress: async () => {
                await setHealthSyncEnabled(true);
              },
            },
          ]
        );
      } else {
        await setHealthSyncEnabled(false);
        await setAutoSyncAfterRun(false);
      }
    } finally {
      setTogglingHealth(false);
    }
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  function handleLogout() {
    Alert.alert('Sair', 'Deseja desconectar do VINCERE?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await notificationService.cancelAll();
          await logout();
        },
      },
    ]);
  }

  // ─── Reminder time display ────────────────────────────────────────────────

  const reminderDisplay = `${String(reminderHour).padStart(2, '0')}:${String(reminderMinute).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </Pressable>
          <Text variant="h3" color={Colors.textPrimary}>
            Configurações
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── Notifications ─────────────────────────────────────────────── */}
          <SectionHeader label="NOTIFICAÇÕES" />

          <SettingRow
            icon="notifications"
            iconColor={Colors.primary}
            title="Lembretes de treino"
            subtitle="Notificação diária no horário configurado"
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                thumbColor={notificationsEnabled ? Colors.primary : Colors.textTertiary}
                disabled={togglingNotif}
              />
            }
          />

          {notificationsEnabled && (
            <SettingRow
              icon="time-outline"
              iconColor={Colors.textSecondary}
              title="Horário do lembrete"
              subtitle="Toque para alterar"
              right={
                <Text variant="bodyMedium" color={Colors.primary}>
                  {reminderDisplay}
                </Text>
              }
            />
          )}

          <SettingRow
            icon="sparkles"
            iconColor={Colors.tertiary}
            title="Insights do Coach IA"
            subtitle="Receba análises automáticas após cada treino"
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                thumbColor={notificationsEnabled ? Colors.primary : Colors.textTertiary}
                disabled={togglingNotif}
              />
            }
          />

          {/* ── Health Sync ────────────────────────────────────────────────── */}
          <SectionHeader label={`SYNC — ${healthService.getPlatformName().toUpperCase()}`} />

          <SettingRow
            icon={Platform.OS === 'ios' ? 'heart' : 'fitness'}
            iconColor="#FF375F"
            title={`Sync com ${healthService.getPlatformName()}`}
            subtitle="Salva distância, tempo e calorias automaticamente"
            right={
              <Switch
                value={healthSyncEnabled}
                onValueChange={handleHealthToggle}
                trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                thumbColor={healthSyncEnabled ? Colors.primary : Colors.textTertiary}
                disabled={togglingHealth}
              />
            }
          />

          {healthSyncEnabled && (
            <SettingRow
              icon="flash-outline"
              iconColor={Colors.textSecondary}
              title="Sync automático após corrida"
              subtitle="Sem precisar confirmar na tela de resumo"
              right={
                <Switch
                  value={autoSyncAfterRun}
                  onValueChange={setAutoSyncAfterRun}
                  trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                  thumbColor={autoSyncAfterRun ? Colors.primary : Colors.textTertiary}
                />
              }
            />
          )}

          {healthSyncEnabled && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
              <Text variant="caption" color={Colors.textSecondary} style={{ flex: 1 }}>
                Requer build de desenvolvimento. No Expo Go, o sync não estará disponível.
              </Text>
            </View>
          )}

          {/* ── Strava ────────────────────────────────────────────────────── */}
          <SectionHeader label="STRAVA" />

          <SettingRow
            icon="fitness"
            iconColor={Colors.strava}
            title="Conta conectada"
            subtitle="Atividades sincronizadas automaticamente"
            right={
              <View style={styles.connectedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                <Text variant="label" color={Colors.primary} tracking="wider">
                  ATIVO
                </Text>
              </View>
            }
          />

          {/* ── Account ───────────────────────────────────────────────────── */}
          <SectionHeader label="CONTA" />

          <Pressable
            style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}
            onPress={handleLogout}
          >
            <View style={[styles.iconWrap, { backgroundColor: Colors.secondary + '20' }]}>
              <Ionicons name="log-out-outline" size={18} color={Colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" color={Colors.secondary}>
                Sair
              </Text>
              <Text variant="caption" color={Colors.textTertiary}>
                Desconecta do Strava e limpa os dados locais
              </Text>
            </View>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <Text
      variant="label"
      color={Colors.textTertiary}
      tracking="widest"
      style={styles.sectionHeader}
    >
      {label}
    </Text>
  );
}

function SettingRow({
  icon,
  iconColor,
  title,
  subtitle,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" color={Colors.textPrimary}>
          {title}
        </Text>
        <Text variant="caption" color={Colors.textTertiary}>
          {subtitle}
        </Text>
      </View>
      {right}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.base,
    gap: Spacing.sm,
  },
  sectionHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
});
