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

/** Generate a personalized training plan based on user goal + Strava history */
export async function generateTrainingPlan(goal: UserGoal): Promise<TrainingPlan> {
  const { data } = await api.post<TrainingPlan>('/training/plan/generate', { goal });
  return data;
}

/** Adjust this week's plan based on last ~2 weeks of training */
export async function adjustWeek(goal: UserGoal): Promise<TrainingPlan> {
  const { data } = await api.post<TrainingPlan>('/training/plan/adjust', { goal });
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
