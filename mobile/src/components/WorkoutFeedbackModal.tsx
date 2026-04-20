import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radius, Spacing } from '@/theme';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import type { Workout, WorkoutFeedback, WorkoutFelt } from '@/types';

interface Props {
  visible: boolean;
  workout: Workout | null;
  onClose: () => void;
  onSubmit: (feedback: WorkoutFeedback) => void;
}

const FELT_OPTIONS: {
  value: WorkoutFelt;
  label: string;
  desc: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'easy',       label: 'LEVE',       desc: 'Podia ter feito mais.',          color: Colors.zone1,  icon: 'happy' },
  { value: 'moderate',   label: 'NO PONTO',   desc: 'Saiu como o plano previa.',      color: Colors.zone2,  icon: 'checkmark-circle' },
  { value: 'hard',       label: 'DIFÍCIL',    desc: 'Exigiu muito, mas completei.',   color: Colors.tertiary, icon: 'flame' },
  { value: 'very_hard',  label: 'NO LIMITE',  desc: 'Quase não consegui terminar.',   color: Colors.secondary, icon: 'warning' },
];

export function WorkoutFeedbackModal({ visible, workout, onClose, onSubmit }: Props) {
  const [felt, setFelt] = useState<WorkoutFelt | null>(null);
  const [rpe, setRpe] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const reset = () => {
    setFelt(null);
    setRpe(null);
    setNote('');
  };

  const handleSubmit = () => {
    if (!felt) return;
    onSubmit({
      felt,
      rpe: rpe ?? undefined,
      note: note.trim() || undefined,
      reportedAt: new Date().toISOString(),
    });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={handleClose} transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="label" color={Colors.primary} tracking="wider">
                COMO FOI?
              </Text>
              <Text variant="h2" color={Colors.textPrimary} numberOfLines={1}>
                {workout?.title ?? 'Treino'}
              </Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </Pressable>
          </View>

          <Text variant="caption" color={Colors.textSecondary} style={{ marginBottom: Spacing.md }}>
            Isso alimenta a IA pra calibrar a carga da próxima semana.
          </Text>

          <View style={styles.feltList}>
            {FELT_OPTIONS.map((opt) => {
              const active = felt === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setFelt(opt.value)}
                  style={[
                    styles.feltRow,
                    active && { borderColor: opt.color, backgroundColor: opt.color + '18' },
                  ]}
                >
                  <View style={[styles.feltIcon, { backgroundColor: opt.color + '22' }]}>
                    <Ionicons name={opt.icon} size={18} color={opt.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" color={active ? opt.color : Colors.textPrimary}>
                      {opt.label}
                    </Text>
                    <Text variant="caption" color={Colors.textSecondary}>
                      {opt.desc}
                    </Text>
                  </View>
                  {active ? <Ionicons name="checkmark" size={18} color={opt.color} /> : null}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.rpeSection}>
            <Text variant="label" color={Colors.textSecondary} tracking="wider">
              RPE (OPCIONAL · 1-10)
            </Text>
            <View style={styles.rpeRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                const active = rpe === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setRpe(active ? null : n)}
                    style={[styles.rpeChip, active && styles.rpeChipActive]}
                  >
                    <Text
                      variant="label"
                      color={active ? Colors.textInverse : Colors.textPrimary}
                    >
                      {n}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Alguma observação (opcional)..."
            placeholderTextColor={Colors.textTertiary}
            style={styles.noteInput}
            multiline
          />

          <Button
            label="Salvar feedback"
            variant="primary"
            size="lg"
            fullWidth
            disabled={!felt}
            onPress={handleSubmit}
            rightIcon={<Ionicons name="checkmark" size={18} color={Colors.textInverse} />}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  handle: {
    width: 44,
    height: 4,
    backgroundColor: Colors.borderSubtle,
    borderRadius: 2,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  feltList: { gap: 8 },
  feltRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    borderRadius: Radius.xl,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  feltIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeSection: { gap: 8, marginTop: 4 },
  rpeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rpeChip: {
    flex: 1,
    minWidth: 28,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  rpeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  noteInput: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    color: Colors.textPrimary,
    fontSize: 15,
    minHeight: 64,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
});
