import type {
  StravaActivity,
  TrainingPlan,
  CoachInsight,
  WeeklyStats,
  NutritionDay,
  PerformanceRecord,
  CoachMessage,
} from '@/types';

/**
 * Development-only mock data. Replaced by real Strava + backend data
 * once the user authenticates.
 */

const dayMs = 86_400_000;
const today = new Date();
const iso = (offset: number) =>
  new Date(today.getTime() + offset * dayMs).toISOString();

/** Mock activity factory so we can generate ~6 weeks of realistic history */
function makeActivity(
  id: number,
  dayOffset: number,
  name: string,
  distanceKm: number,
  paceSecPerKm: number,
  hr: number,
  elevation: number,
): StravaActivity {
  const distance = Math.round(distanceKm * 1000);
  const moving = Math.round(distanceKm * paceSecPerKm);
  return {
    id,
    name,
    distance,
    moving_time: moving,
    elapsed_time: moving + 60,
    total_elevation_gain: elevation,
    type: 'Run',
    sport_type: 'Run',
    start_date: iso(dayOffset),
    start_date_local: iso(dayOffset),
    average_speed: distance / moving,
    max_speed: (distance / moving) * 1.45,
    average_heartrate: hr,
    max_heartrate: hr + 20,
    suffer_score: Math.round(distanceKm * 9),
    average_cadence: 86,
    has_heartrate: true,
  };
}

export const mockActivities: StravaActivity[] = [
  // Esta semana
  makeActivity(1001, -1, 'Tempo Run · longão matinal', 12.4, 285, 158, 84),
  makeActivity(1002, -3, 'Recovery Jog', 6.2, 365, 138, 32),
  makeActivity(1003, -5, 'Fartlek 8x1min', 9.1, 310, 162, 54),
  makeActivity(1004, -7, 'Longão de domingo', 18.5, 315, 152, 128),
  // Semana -2
  makeActivity(1005, -9, 'Easy Run pós-trabalho', 7.8, 340, 142, 45),
  makeActivity(1006, -10, 'Intervalados 6x800m', 10.2, 300, 168, 62),
  makeActivity(1007, -12, 'Corrida conversacional', 8.4, 355, 140, 38),
  makeActivity(1008, -14, 'Longão no parque', 20.1, 325, 150, 145),
  // Semana -3
  makeActivity(1009, -16, 'Recovery', 5.8, 380, 132, 28),
  makeActivity(1010, -17, 'Tempo progressivo', 11.0, 295, 160, 72),
  makeActivity(1011, -19, 'Easy run', 9.2, 345, 144, 52),
  makeActivity(1012, -21, 'Long run técnico', 17.8, 330, 148, 112),
  // Semana -4
  makeActivity(1013, -23, 'Jog leve', 5.5, 385, 130, 22),
  makeActivity(1014, -24, 'Fartlek livre', 9.8, 315, 158, 58),
  makeActivity(1015, -26, 'Easy + strides', 7.2, 355, 140, 42),
  makeActivity(1016, -28, 'Longão 2h', 19.2, 340, 146, 138),
  // Semana -5
  makeActivity(1017, -30, 'Tempo corte', 10.5, 298, 164, 68),
  makeActivity(1018, -31, 'Recovery', 6.0, 378, 134, 30),
  makeActivity(1019, -33, 'Corrida regenerativa', 8.0, 360, 142, 44),
  makeActivity(1020, -35, 'Longão primeira aclimatação', 16.4, 350, 144, 102),
  // Semana -6 (base)
  makeActivity(1021, -38, 'Easy base', 7.0, 365, 138, 40),
  makeActivity(1022, -40, 'Fartlek intro', 8.8, 335, 150, 52),
  makeActivity(1023, -42, 'Longão de base', 15.0, 360, 140, 88),
];

export const mockPlan: TrainingPlan = {
  id: 'plan_001',
  goalType: '42k',
  totalWeeks: 16,
  currentWeek: 6,
  startDate: iso(-35),
  raceDate: iso(70),
  aiGenerated: true,
  lastUpdated: iso(0),
  weeks: [
    {
      weekNumber: 6,
      startDate: iso(-1),
      endDate: iso(6),
      phase: 'build',
      totalKm: 52,
      workouts: [
        {
          id: 'w_today',
          type: 'tempo',
          title: 'Tempo Run · 8 km a 4:20/km',
          description:
            '2 km aquecimento · 6 km no pace de limiar · 2 km volta calma. Mantenha cadência alta (>85 spm).',
          date: iso(0),
          targetDistance: 10,
          targetPace: '4:20',
          targetDuration: 48,
          targetHeartRate: { min: 165, max: 175 },
          completed: false,
          zones: [
            { zone: 2, duration: 10, label: 'Aquecimento' },
            { zone: 4, duration: 30, label: 'Limiar' },
            { zone: 1, duration: 8, label: 'Volta calma' },
          ],
        },
        {
          id: 'w_thu',
          type: 'easy_run',
          title: 'Corrida leve · 6 km',
          description: 'Conversacional. Pace entre 5:30-5:50/km.',
          date: iso(2),
          targetDistance: 6,
          targetPace: '5:30',
          targetDuration: 35,
          completed: false,
        },
        {
          id: 'w_fri',
          type: 'strength',
          title: 'Força específica para corrida',
          description:
            'Agachamento, stiff, single-leg deadlift, core. 3x12 em cada. 40 min.',
          date: iso(3),
          targetDuration: 40,
          completed: false,
        },
        {
          id: 'w_sat',
          type: 'rest',
          title: 'Descanso ativo',
          description: 'Mobilidade 20min, foco em quadril e tornozelo.',
          date: iso(4),
          completed: false,
        },
        {
          id: 'w_sun',
          type: 'long_run',
          title: 'Longão · 22 km',
          description:
            '22 km em Z2 aeróbico. Teste sua estratégia de nutrição. Gel a cada 35min.',
          date: iso(5),
          targetDistance: 22,
          targetPace: '5:15',
          targetDuration: 115,
          targetHeartRate: { min: 145, max: 158 },
          completed: false,
        },
      ],
    },
  ],
};

export const mockInsight: CoachInsight = {
  id: 'insight_001',
  type: 'tip',
  title: 'Seu pace médio caiu 6s/km em 3 semanas',
  body: 'Análise dos últimos 4 longões mostra melhora consistente em Z2. Próxima semana podemos aumentar o longão para 24 km com segurança.',
  action: 'Ver ajuste do plano',
  timestamp: iso(0),
  read: false,
};

export const mockWeeklyStats: WeeklyStats = {
  week: 'W6',
  startDate: iso(-1),
  distance: 35,
  duration: 190,
  elevation: 220,
  runs: 3,
  avgPace: 315, // 5:15/km in seconds
  avgHeartRate: 152,
  load: 420,
};

export const mockNutritionDay: NutritionDay = {
  date: iso(0).split('T')[0],
  trainingLoad: 'moderate',
  calories: 2850,
  carbs: 420,
  protein: 130,
  fat: 80,
  hydration: 3.2,
  meals: [
    {
      time: '07:00',
      name: 'Café da manhã',
      calories: 620,
      carbs: 90,
      protein: 28,
      fat: 18,
      foods: ['Aveia com banana', 'Ovos mexidos', 'Café preto'],
    },
    {
      time: '10:30',
      name: 'Lanche pré-treino',
      calories: 280,
      carbs: 55,
      protein: 8,
      fat: 4,
      foods: ['Banana', 'Tâmaras', 'Pasta de amendoim'],
    },
    {
      time: '13:00',
      name: 'Almoço',
      calories: 820,
      carbs: 110,
      protein: 40,
      fat: 22,
      foods: ['Arroz integral', 'Frango grelhado', 'Salada verde', 'Batata doce'],
    },
    {
      time: '16:30',
      name: 'Lanche pós-treino',
      calories: 420,
      carbs: 60,
      protein: 30,
      fat: 10,
      foods: ['Shake de whey', 'Aveia', 'Mel', 'Frutas vermelhas'],
    },
    {
      time: '20:00',
      name: 'Jantar',
      calories: 710,
      carbs: 95,
      protein: 35,
      fat: 22,
      foods: ['Macarrão integral', 'Molho com carne', 'Legumes'],
    },
  ],
  preRun: {
    timing: '90 min antes',
    description: 'Carboidratos de digestão lenta + uma dose de cafeína.',
    foods: ['Aveia', '1 banana', 'Café'],
    notes: 'Evite gorduras e fibras pesadas. Hidrate-se com 500ml de água.',
  },
  duringRun: {
    timing: 'A cada 35-45 min',
    description: 'Carboidratos de rápida absorção.',
    foods: ['Gel 25g carbo', '150ml isotônico'],
    notes: 'Alterne gel e isotônico em corridas > 90min.',
  },
  postRun: {
    timing: 'Até 30 min após',
    description: 'Janela anabólica — repor glicogênio e acelerar recuperação.',
    foods: ['Whey 30g', 'Banana', 'Tâmaras'],
    notes: 'Proporção 3:1 carbo:proteína. Reidratar com 150% do peso perdido.',
  },
};

export const mockRecords: PerformanceRecord[] = [
  { distance: '1km', time: 245, pace: 245, date: iso(-14) },
  { distance: '5k', time: 1380, pace: 276, date: iso(-21) },
  { distance: '10k', time: 2880, pace: 288, date: iso(-42) },
  { distance: '21k', time: 6420, pace: 306, date: iso(-90) },
];

export const mockCoachMessages: CoachMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    content:
      'Oi! Analisei seus últimos 7 dias no Strava. Você completou 3 treinos e acumulou 35km com pace médio de 5:15/km — um progresso sólido 👏\n\nVamos conversar sobre o seu próximo longão?',
    timestamp: iso(0),
    context: 'training',
  },
];
