import api from './api';
import type {
  CoachMessage,
  CoachInsight,
  TrainingPlan,
  UserGoal,
  NutritionDay,
  WorkoutType,
} from '@/types';

/** Stream-less coach chat — returns Claude's full response */
export async function sendCoachMessage(
  message: string,
  history: CoachMessage[],
  context?: { goal?: UserGoal; weekSummary?: string },
): Promise<CoachMessage> {
  const { data } = await api.post<CoachMessage>('/coach/chat', {
    message,
    history,
    context,
  });
  return data;
}

/** Daily AI insight based on last 7 days of activity */
export async function fetchDailyInsight(): Promise<CoachInsight> {
  const { data } = await api.get<CoachInsight>('/coach/insight/daily');
  return data;
}

export interface PlanGenContext {
  goal: UserGoal;
  training_days?: number[]; // 0=Mon..6=Sun
  long_run_day?: number;
  fitness_level?: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  /** Completed workouts from the prior week with user feedback — lets the
   *  backend compute adaptive progression instead of a flat +10%. */
  prior_week?: Array<{
    id: string;
    type: string;
    completed?: boolean;
    feedback?: { felt: string; rpe?: number } | null;
  }>;
}

/** Generate a personalized training plan based on user goal + Strava history */
export async function generateTrainingPlan(
  ctxOrGoal: UserGoal | PlanGenContext,
): Promise<TrainingPlan> {
  const body = 'goal' in ctxOrGoal ? ctxOrGoal : { goal: ctxOrGoal };
  const { data } = await api.post<TrainingPlan>('/training/plan/generate', body);
  return data;
}

/** Adjust this week's plan based on last ~2 weeks of training */
export async function adjustWeek(
  ctxOrGoal: UserGoal | PlanGenContext,
): Promise<TrainingPlan> {
  const body = 'goal' in ctxOrGoal ? ctxOrGoal : { goal: ctxOrGoal };
  const { data } = await api.post<TrainingPlan>('/training/plan/adjust', body);
  return data;
}

/** Nutrition plan for today based on today's workout */
export async function fetchNutritionToday(params?: {
  workout_type?: WorkoutType;
  workout_distance_km?: number;
  workout_duration_min?: number;
  weight_kg?: number;
}): Promise<NutritionDay> {
  const { data } = await api.post<NutritionDay>('/nutrition/today', params ?? {});
  return data;
}

/** Analyze a specific activity — returns AI-generated insights */
export async function analyzeActivity(activityId: number): Promise<CoachInsight> {
  const { data } = await api.post<CoachInsight>('/coach/activity/analyze', {
    activity_id: activityId,
  });
  return data;
}
