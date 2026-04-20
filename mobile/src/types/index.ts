// ─── Strava ─────────────────────────────────────────────────────────────────

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string; // avatar URL
  profile_medium: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  weight: number;
  ftp: number | null;
  measurement_preference: 'meters' | 'feet';
  date_preference: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  type: string; // 'Run', 'Ride', etc.
  sport_type: string;
  start_date: string;
  start_date_local: string;
  average_speed: number; // m/s
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  suffer_score?: number;
  average_cadence?: number;
  average_watts?: number;
  kilojoules?: number;
  map?: {
    id: string;
    summary_polyline: string;
  };
  workout_type?: number;
  has_heartrate: boolean;
  perceived_exertion?: number;
}

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: StravaAthlete;
}

// ─── User & Goals ────────────────────────────────────────────────────────────

export type GoalDistance = '5k' | '10k' | '21k' | '42k' | 'Ultra';
export type GoalType = GoalDistance | 'Pace' | 'Mobility' | 'Weight';

export interface UserGoal {
  id: string;
  type: GoalType;
  targetDate?: string; // ISO date
  targetPace?: number; // seconds per km
  targetDistance?: number; // meters
  raceName?: string;
  currentBest?: number; // seconds (for pace goals)
  isActive: boolean;
  createdAt: string;
}

export interface UserProfile {
  stravaId: number;
  name: string;
  avatar: string;
  city?: string;
  weight?: number; // kg
  height?: number; // cm
  age?: number;
  weeklyGoalKm?: number;
  trainingDaysPerWeek?: number;
  /** Weekdays the athlete is willing to train. 0=Mon, 1=Tue, ..., 6=Sun. */
  trainingDays?: number[];
  /** Preferred weekday for the weekly long run (0=Mon..6=Sun). Usually weekend. */
  longRunDay?: number;
  mainGoal: UserGoal;
  secondaryGoals?: UserGoal[];
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  onboarded: boolean;
}

// ─── Training ────────────────────────────────────────────────────────────────

export type WorkoutType =
  | 'easy_run'
  | 'long_run'
  | 'tempo'
  | 'interval'
  | 'fartlek'
  | 'recovery'
  | 'race_pace'
  | 'strength'
  | 'mobility'
  | 'cross_training'
  | 'rest';

/** User-reported subjective feedback for a completed workout.
 *  Feeds the adaptive progression system — next week's volume/intensity is
 *  bucketed based on how the athlete actually FELT vs what the plan asked. */
export type WorkoutFelt = 'easy' | 'moderate' | 'hard' | 'very_hard';

export interface WorkoutFeedback {
  felt: WorkoutFelt;
  rpe?: number;          // 1-10 (optional — slider in UI)
  note?: string;
  reportedAt: string;    // ISO timestamp
}

export interface Workout {
  id: string;
  type: WorkoutType;
  title: string;
  description: string;
  date: string; // ISO date
  targetDistance?: number; // km
  targetPace?: string; // "5:30/km"
  targetDuration?: number; // minutes
  targetHeartRate?: { min: number; max: number }; // bpm
  zones?: WorkoutZone[];
  completed: boolean;
  stravaActivityId?: number;
  notes?: string;
  rpe?: number; // legacy — migrate readers to feedback.rpe
  feedback?: WorkoutFeedback;
}

export interface WorkoutZone {
  zone: 1 | 2 | 3 | 4 | 5;
  duration: number; // minutes
  label: string;
}

export interface TrainingWeek {
  weekNumber: number;
  startDate: string;
  endDate: string;
  phase: 'base' | 'build' | 'peak' | 'taper' | 'recovery';
  totalKm: number;
  workouts: Workout[];
}

export interface TrainingPlan {
  id: string;
  goalType: GoalType;
  totalWeeks: number;
  currentWeek: number;
  startDate: string;
  raceDate?: string;
  weeks: TrainingWeek[];
  aiGenerated: boolean;
  lastUpdated: string;
}

// ─── Nutrition ───────────────────────────────────────────────────────────────

export type TrainingLoad = 'rest' | 'light' | 'moderate' | 'hard' | 'long_run';

export interface NutritionDay {
  date: string;
  trainingLoad: TrainingLoad;
  calories: number;
  carbs: number; // grams
  protein: number;
  fat: number;
  hydration: number; // liters
  meals: Meal[];
  preRun?: MealSuggestion;
  duringRun?: MealSuggestion;
  postRun?: MealSuggestion;
}

/** A nutrient slot with multiple interchangeable food options.
 *  The UI renders the category label + grams + chips for each option so the user
 *  can pick whichever they have/like without having to leave the app. */
export interface FoodCategory {
  category: string; // "Carboidrato complexo"
  grams?: number;   // 60
  options: string[]; // ["aveia", "tapioca", "batata-doce", ...]
}

export interface Meal {
  time: string;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  items: FoodCategory[];
}

export interface MealSuggestion {
  timing: string;
  description: string;
  items: FoodCategory[];
  notes: string;
}

// ─── Analytics / Progress ────────────────────────────────────────────────────

export interface WeeklyStats {
  week: string; // "W1", "W2", etc.
  startDate: string;
  distance: number; // km
  duration: number; // minutes
  elevation: number; // meters
  runs: number;
  avgPace: number; // seconds/km
  avgHeartRate?: number;
  load: number; // arbitrary training load score
}

export interface PerformanceRecord {
  distance: string; // "5k", "10k", etc.
  time: number; // seconds
  pace: number; // seconds/km
  date: string;
  stravaActivityId?: number;
}

export interface FitnessMetrics {
  vo2max?: number; // estimated
  ctl: number; // Chronic Training Load
  atl: number; // Acute Training Load
  tsb: number; // Training Stress Balance (Form)
  rampRate: number; // weekly increase %
}

// ─── AI Coach ────────────────────────────────────────────────────────────────

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: 'training' | 'nutrition' | 'recovery' | 'race_prep' | 'general';
}

export interface CoachInsight {
  id: string;
  type: 'warning' | 'tip' | 'achievement' | 'adjustment';
  title: string;
  body: string;
  action?: string;
  actionRoute?: string;
  timestamp: string;
  read: boolean;
}

// ─── App State ───────────────────────────────────────────────────────────────

export interface AppState {
  isLoading: boolean;
  isAuthenticated: boolean;
  stravaConnected: boolean;
  lastSyncAt?: string;
}
