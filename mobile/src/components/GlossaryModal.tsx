import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/theme';
import { Text } from './ui/Text';

/** Plain-language definitions for the running jargon used across the app.
 *  Kept small and pt-BR; updated as we add more terms. */
const TERMS: { term: string; short: string; body: string; color?: string }[] = [
  {
    term: 'Z1 — Recuperação',
    short: '50-60% FCR',
    body:
      'Caminhada rápida ou trote muito leve. Conversa tranquila. Serve pra remover resíduos metabólicos no dia seguinte ao treino pesado.',
    color: Colors.zone1,
  },
  {
    term: 'Z2 — Base aeróbica',
    short: '60-70% FCR',
    body:
      'O pace conversacional: dá pra falar frases completas. É onde você constrói motor aeróbico e queima gordura. ~80% dos treinos moram aqui.',
    color: Colors.zone2,
  },
  {
    term: 'Z3 — Ritmo de maratona',
    short: '70-80% FCR',
    body:
      'Já dá pra falar, mas entrecortado. Pace confortavelmente difícil. Melhora o limiar aeróbico e a economia de corrida.',
    color: Colors.primary,
  },
  {
    term: 'Z4 — Limiar anaeróbico',
    short: '80-90% FCR',
    body:
      'Pace de 5k a 10k. "Comfortably hard". É onde você treina tolerância ao lactato — sustenta ritmo forte sem travar.',
    color: Colors.secondary,
  },
  {
    term: 'Z5 — VO2 Max',
    short: '90-100% FCR',
    body:
      'Esforço máximo: só dá conta de frases curtas. Intervalos de 2-5 min. Melhora potência aeróbica pura.',
    color: Colors.secondary,
  },
  {
    term: 'Corrida leve (Easy)',
    short: 'Z2 — base do volume',
    body:
      'Rodagem em pace conversacional. Constrói a base aeróbica e a resistência muscular. Se você não consegue conversar, está rápido demais.',
  },
  {
    term: 'Tempo run',
    short: 'Z3-Z4 — limiar',
    body:
      '15 min aquecimento · 20-40 min em ritmo de limiar · 10 min volta calma. Ensina o corpo a limpar lactato mais rápido.',
  },
  {
    term: 'Intervalado',
    short: 'Z4-Z5 — potência',
    body:
      'Tiros fortes com recuperação no meio. Exemplo: 6 × 800m em ritmo de 5k com 2 min de trote entre. Trabalha VO2 max.',
  },
  {
    term: 'Fartlek',
    short: 'Z3-Z5 — variado',
    body:
      'Brincadeira com ritmos: alterna trechos rápidos e lentos sem rigor cronométrico. Bom pra desenvolver "marchas".',
  },
  {
    term: 'Longão',
    short: 'Z2 — resistência',
    body:
      'O treino longo da semana (90 min a 2h30). Serve pra ensinar o corpo a usar gordura como combustível e testar nutrição/hidratação.',
  },
  {
    term: 'Regenerativo',
    short: 'Z1 — recuperação ativa',
    body:
      'Corrida beeem tranquila (6-8 km) no dia após treino intenso. Acelera recuperação sem adicionar fadiga.',
  },
  {
    term: 'Cadência',
    short: 'Alvo 170-185 spm',
    body:
      'Passos por minuto. Cadência baixa = passada longa = mais impacto. Cadência alta = mais eficiência e menos lesão.',
  },
  {
    term: 'ACWR',
    short: 'Acute:Chronic Ratio',
    body:
      'Carga aguda (7d) ÷ carga crônica (28d). Entre 0.8 e 1.3 é o "sweet spot". Acima de 1.5 é zona de lesão — volume sobe rápido demais.',
  },
  {
    term: 'Taper',
    short: 'Polimento pré-prova',
    body:
      'Redução sistemática de volume nas 2 semanas antes da prova. Mantém intensidade curta, mas diminui km totais em 30-50%. Objetivo: chegar descansado.',
  },
  {
    term: 'Pace',
    short: 'min:seg / km',
    body:
      'Tempo que você leva pra correr 1 km. Pace 5:00 = 5 min por km. Pace menor = mais rápido.',
  },
  {
    term: 'FCR — FC de Reserva',
    short: 'Karvonen',
    body:
      'Base usada pra calcular zonas: FC Máx − FC Repouso. Mais preciso que usar %FCmax direto, porque considera sua condição basal.',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function GlossaryModal({ visible, onClose }: Props) {
  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="label" color={Colors.primary} tracking="wider">
                GLOSSÁRIO
              </Text>
              <Text variant="h2" color={Colors.textPrimary}>
                O que significa cada coisa
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: Spacing.xxl, gap: Spacing.md }}
            showsVerticalScrollIndicator={false}
          >
            {TERMS.map((t) => (
              <View
                key={t.term}
                style={[
                  styles.termCard,
                  t.color ? { borderColor: t.color + '50' } : null,
                ]}
              >
                <View style={styles.termHeader}>
                  <Text variant="bodyMedium" color={Colors.textPrimary}>
                    {t.term}
                  </Text>
                  <Text variant="label" color={t.color ?? Colors.textSecondary} tracking="wider">
                    {t.short}
                  </Text>
                </View>
                <Text variant="body" color={Colors.textSecondary} style={{ marginTop: Spacing.sm, lineHeight: 22 }}>
                  {t.body}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function GlossaryButton({ style }: { style?: any }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.triggerBtn, style]}
        hitSlop={8}
      >
        <Ionicons name="help-circle-outline" size={16} color={Colors.textSecondary} />
        <Text variant="label" color={Colors.textSecondary} tracking="wider">
          GLOSSÁRIO
        </Text>
      </Pressable>
      <GlossaryModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    height: '85%',
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
  },
  handle: {
    width: 44,
    height: 4,
    backgroundColor: Colors.borderSubtle,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
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
  termCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  termHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: Colors.card,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
});
