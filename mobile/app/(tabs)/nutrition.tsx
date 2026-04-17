import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Colors, Spacing, Radius } from '@/theme';
import { Text } from '@/components/ui/Text';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { mockNutritionDay } from '@/mock/data';

export default function NutritionScreen() {
  const day = mockNutritionDay;
  const [tab, setTab] = useState<'plan' | 'timing'>('plan');

  const macros = [
    { label: 'CARBO', value: day.carbs, color: Colors.primary, unit: 'g' },
    { label: 'PROTEÍNA', value: day.protein, color: Colors.secondary, unit: 'g' },
    { label: 'GORDURA', value: day.fat, color: Colors.tertiary, unit: 'g' },
  ];

  const loadConfig = {
    rest: { label: 'DESCANSO', color: Colors.zone1 },
    light: { label: 'LEVE', color: Colors.zone2 },
    moderate: { label: 'MODERADO', color: Colors.primary },
    hard: { label: 'PESADO', color: Colors.secondary },
    long_run: { label: 'LONGÃO', color: Colors.tertiary },
  }[day.trainingLoad];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)}>
          <Text variant="label" color={Colors.primary} tracking="wider">
            NUTRIÇÃO INTELIGENTE
          </Text>
          <Text variant="display" color={Colors.textPrimary} style={styles.title}>
            Come como quem{'\n'}vai vencer.
          </Text>
        </Animated.View>

        {/* Demo data notice */}
        <Animated.View entering={FadeIn.duration(400).delay(100)} style={styles.demoBanner}>
          <Ionicons name="sparkles" size={16} color={Colors.tertiary} />
          <Text variant="caption" color={Colors.tertiary} style={{ flex: 1 }}>
            Plano de exemplo baseado em carga moderada. Em breve: cardápio personalizado pelo Coach IA com base nos seus treinos reais.
          </Text>
        </Animated.View>

        {/* Load badge + calories */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text variant="label" color={Colors.textSecondary} tracking="wider">
              CARGA DE HOJE
            </Text>
            <View style={[styles.loadBadge, { borderColor: loadConfig.color + '50' }]}>
              <View style={[styles.loadDot, { backgroundColor: loadConfig.color }]} />
              <Text variant="label" color={loadConfig.color} tracking="wider">
                {loadConfig.label}
              </Text>
            </View>
          </View>
          <View style={styles.heroValueRow}>
            <Text variant="metricLarge" color={Colors.textPrimary}>
              {day.calories}
            </Text>
            <Text variant="h3" color={Colors.textSecondary} style={styles.heroUnit}>
              kcal
            </Text>
          </View>
          <View style={styles.macros}>
            {macros.map((m) => (
              <View key={m.label} style={styles.macro}>
                <View style={styles.macroHeader}>
                  <Text variant="label" color={Colors.textSecondary} tracking="wider">
                    {m.label}
                  </Text>
                  <Text variant="bodyMedium" color={Colors.textPrimary}>
                    {m.value}{m.unit}
                  </Text>
                </View>
                <View style={styles.macroBar}>
                  <View style={[styles.macroFill, { backgroundColor: m.color, width: '70%' }]} />
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab('plan')}
            style={[styles.tab, tab === 'plan' && styles.tabActive]}
          >
            <Text
              variant="label"
              color={tab === 'plan' ? Colors.textInverse : Colors.textSecondary}
              tracking="wider"
            >
              CARDÁPIO
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('timing')}
            style={[styles.tab, tab === 'timing' && styles.tabActive]}
          >
            <Text
              variant="label"
              color={tab === 'timing' ? Colors.textInverse : Colors.textSecondary}
              tracking="wider"
            >
              TIMING DO TREINO
            </Text>
          </Pressable>
        </View>

        {tab === 'plan' ? (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: Spacing.md }}>
            {day.meals.map((meal, i) => (
              <View key={meal.name} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <Text variant="label" color={Colors.primary} tracking="wider">
                    {meal.time}
                  </Text>
                  <Text variant="caption" color={Colors.textSecondary}>
                    {meal.calories} kcal · C{meal.carbs}g · P{meal.protein}g · G{meal.fat}g
                  </Text>
                </View>
                <Text variant="h3" color={Colors.textPrimary} style={{ marginTop: 4 }}>
                  {meal.name}
                </Text>
                <View style={styles.foods}>
                  {meal.foods.map((food) => (
                    <View key={food} style={styles.foodChip}>
                      <Text variant="caption" color={Colors.textSecondary}>
                        {food}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(400)} style={{ gap: Spacing.md }}>
            {day.preRun ? (
              <TimingCard
                phase="PRÉ-TREINO"
                color={Colors.primary}
                icon="time"
                suggestion={day.preRun}
              />
            ) : null}
            {day.duringRun ? (
              <TimingCard
                phase="DURANTE"
                color={Colors.secondary}
                icon="water"
                suggestion={day.duringRun}
              />
            ) : null}
            {day.postRun ? (
              <TimingCard
                phase="PÓS-TREINO"
                color={Colors.tertiary}
                icon="flash"
                suggestion={day.postRun}
              />
            ) : null}
          </Animated.View>
        )}

        {/* Hydration */}
        <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.hydrationCard}>
          <View style={styles.hydrationHeader}>
            <View style={styles.hydrationLeft}>
              <Ionicons name="water" size={20} color={Colors.zone1} />
              <Text variant="label" color={Colors.textSecondary} tracking="wider">
                HIDRATAÇÃO
              </Text>
            </View>
            <Text variant="metric" color={Colors.textPrimary}>
              {day.hydration}
              <Text variant="body" color={Colors.textSecondary}>
                {' '}/ 4L
              </Text>
            </Text>
          </View>
          <View style={{ marginTop: Spacing.md }}>
            <ProgressBar value={day.hydration / 4} color={Colors.zone1} height={6} />
          </View>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function TimingCard({
  phase,
  color,
  icon,
  suggestion,
}: {
  phase: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  suggestion: { timing: string; description: string; foods: string[]; notes: string };
}) {
  return (
    <View style={[styles.timingCard, { borderColor: color + '30' }]}>
      <View style={styles.timingHeader}>
        <View style={[styles.timingIcon, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <View>
          <Text variant="label" color={color} tracking="wider">
            {phase}
          </Text>
          <Text variant="caption" color={Colors.textSecondary}>
            {suggestion.timing}
          </Text>
        </View>
      </View>
      <Text variant="body" color={Colors.textPrimary} style={{ marginTop: Spacing.md }}>
        {suggestion.description}
      </Text>
      <View style={styles.foodsRow}>
        {suggestion.foods.map((food) => (
          <View key={food} style={[styles.foodChip, { borderColor: color + '40' }]}>
            <Text variant="caption" color={Colors.textPrimary}>
              {food}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="caption" color={Colors.textSecondary} style={{ marginTop: Spacing.md }}>
        {suggestion.notes}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.tertiary + '15',
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.tertiary + '30',
  },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.base,
    gap: Spacing.xl,
  },
  title: { marginTop: 4, fontSize: 32, lineHeight: 36 },
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  loadDot: { width: 6, height: 6, borderRadius: 3 },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  heroUnit: { marginBottom: 8 },
  macros: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  macro: {},
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  macroBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  mealCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.md,
  },
  foodChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  timingCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
  },
  timingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  timingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.md,
  },
  hydrationCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.zone1 + '30',
  },
  hydrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hydrationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
