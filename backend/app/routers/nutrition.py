from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Body, Header

from app.models.schemas import NutritionDay
from app.services.claude_service import claude_service
from app.services.strava_service import strava_service


router = APIRouter()


def _extract_token(authorization: Optional[str]) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1]
    return None


@router.post("/today", response_model=NutritionDay)
async def today(
    payload: dict = Body(default_factory=dict),
    authorization: Optional[str] = Header(default=None),
):
    """
    Generates today's nutrition plan based on:
    - Today's scheduled workout (workout_type + distance + duration)
    - Athlete's weight (kg)
    - Training load bucket from workout type

    Body (optional):
      { "workout_type": "tempo", "workout_distance_km": 10, "workout_duration_min": 48, "weight_kg": 75 }

    If weight_kg is omitted and a valid Strava token is provided, the Strava
    profile weight is used. Defaults to 70kg if nothing is available.
    """
    today_iso = datetime.utcnow().date().isoformat()

    weight_kg = payload.get("weight_kg")
    if not weight_kg:
        token = _extract_token(authorization)
        if token:
            try:
                profile = await strava_service.fetch_athlete(token)
                if profile.get("weight"):
                    weight_kg = float(profile["weight"])
            except Exception:
                pass
    weight_kg = float(weight_kg or 70)

    workout_type = payload.get("workout_type", "easy_run")
    workout_distance_km = payload.get("workout_distance_km")
    workout_duration_min = payload.get("workout_duration_min")

    return await claude_service.generate_nutrition_day(
        date_iso=today_iso,
        weight_kg=weight_kg,
        workout_type=workout_type,
        workout_distance_km=workout_distance_km,
        workout_duration_min=workout_duration_min,
    )


# Legacy GET kept for backwards compat — returns nutrition assuming a moderate
# training day and default 70kg athlete. New clients should POST with context.
@router.get("/today", response_model=NutritionDay)
async def today_default():
    today_iso = datetime.utcnow().date().isoformat()
    return await claude_service.generate_nutrition_day(
        date_iso=today_iso,
        weight_kg=70,
        workout_type="easy_run",
    )
