from datetime import datetime
from typing import Literal, Optional, List
from pydantic import BaseModel, Field


# ─── Strava ─────────────────────────────────────────────────────────────────

class StravaAthlete(BaseModel):
    id: int
    firstname: str
    lastname: str
    profile: str = ""
    profile_medium: str = ""
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    sex: Optional[str] = None
    weight: Optional[float] = None
    ftp: Optional[int] = None
    measurement_preference: str = "meters"
    date_preference: str = ""


class StravaTokens(BaseModel):
    access_token: str
    refresh_token: str
    expires_at: int
    athlete: StravaAthlete


class StravaExchangeRequest(BaseModel):
    code: str
    redirect_uri: str


class StravaRefreshRequest(BaseModel):
    refresh_token: str


class StravaActivity(BaseModel):
    id: int
    name: str
    distance: float
    moving_time: int
    elapsed_time: int
    total_elevation_gain: float
    type: str
    sport_type: str
    start_date: str
    start_date_local: str
    average_speed: float
    max_speed: float
    average_heartrate: Optional[float] = None
    max_heartrate: Optional[float] = None
    suffer_score: Optional[float] = None
    average_cadence: Optional[float] = None
    has_heartrate: bool = False


# ─── Goals / User ───────────────────────────────────────────────────────────

GoalType = Literal["5k", "10k", "21k", "42k", "Ultra", "Pace", "Mobility", "Weight"]


class UserGoal(BaseModel):
    id: str
    type: GoalType
    targetDate: Optional[str] = None
    targetPace: Optional[int] = None
    targetDistance: Optional[float] = None
    raceName: Optional[str] = None
    currentBest: Optional[int] = None
    isActive: bool = True
    createdAt: str


# ─── Training ───────────────────────────────────────────────────────────────

WorkoutType = Literal[
    "easy_run", "long_run", "tempo", "interval", "fartlek", "recovery",
    "race_pace", "strength", "mobility", "cross_training", "rest",
]


class WorkoutZone(BaseModel):
    zone: int
    duration: int
    label: str


class Workout(BaseModel):
    id: str
    type: WorkoutType
    title: str
    description: str
    date: str
    targetDistance: Optional[float] = None
    targetPace: Optional[str] = None
    targetDuration: Optional[int] = None
    targetHeartRate: Optional[dict] = None
    zones: Optional[List[WorkoutZone]] = None
    completed: bool = False
    stravaActivityId: Optional[int] = None
    notes: Optional[str] = None


class TrainingWeek(BaseModel):
    weekNumber: int
    startDate: str
    endDate: str
    phase: Literal["base", "build", "peak", "taper", "recovery"]
    totalKm: float
    workouts: List[Workout]


class TrainingPlan(BaseModel):
    id: str
    goalType: GoalType
    totalWeeks: int
    currentWeek: int
    startDate: str
    raceDate: Optional[str] = None
    weeks: List[TrainingWeek]
    aiGenerated: bool = True
    lastUpdated: str


class GeneratePlanRequest(BaseModel):
    goal: UserGoal


# ─── Coach ──────────────────────────────────────────────────────────────────

class CoachMessage(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    timestamp: str
    context: Optional[str] = None


class CoachChatRequest(BaseModel):
    message: str
    history: List[CoachMessage] = []
    context: Optional[dict] = None


class CoachInsight(BaseModel):
    id: str
    type: Literal["warning", "tip", "achievement", "adjustment"]
    title: str
    body: str
    action: Optional[str] = None
    actionRoute: Optional[str] = None
    timestamp: str
    read: bool = False


class AnalyzeActivityRequest(BaseModel):
    activity_id: int


# ─── Nutrition ──────────────────────────────────────────────────────────────

TrainingLoad = Literal["rest", "light", "moderate", "hard", "long_run"]


class Meal(BaseModel):
    time: str
    name: str
    calories: int
    carbs: int
    protein: int
    fat: int
    foods: List[str]


class MealSuggestion(BaseModel):
    timing: str
    description: str
    foods: List[str]
    notes: str


class NutritionDay(BaseModel):
    date: str
    trainingLoad: TrainingLoad
    calories: int
    carbs: int
    protein: int
    fat: int
    hydration: float
    meals: List[Meal]
    preRun: Optional[MealSuggestion] = None
    duringRun: Optional[MealSuggestion] = None
    postRun: Optional[MealSuggestion] = None
