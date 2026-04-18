from fastapi import APIRouter, Header, HTTPException

from app.models.schemas import GeneratePlanRequest, TrainingPlan
from app.services.claude_service import claude_service
from app.services.strava_service import strava_service

router = APIRouter()


def _extract_token(authorization: str | None) -> str | None:
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1]
    return None


@router.post("/plan/generate", response_model=TrainingPlan)
async def generate_plan(req: GeneratePlanRequest, authorization: str = Header(None)):
    token = _extract_token(authorization)
    recent = []
    if token:
        try:
            # Pull a full window so ACWR + feasibility + PRs use real history
            recent = await strava_service.fetch_full_history(token)
        except Exception:
            recent = []
    days_per_week = len(req.training_days) if req.training_days else 5
    try:
        return await claude_service.generate_plan(
            goal=req.goal,
            fitness_level=req.fitness_level or "intermediate",
            days_per_week=days_per_week,
            recent_activities=recent,
            training_days=req.training_days,
            long_run_day=req.long_run_day,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/plan/adjust", response_model=TrainingPlan)
async def adjust_plan(req: GeneratePlanRequest, authorization: str = Header(None)):
    """Re-generates the plan using only the last ~2 weeks of Strava activity,
    so the coach can course-correct based on very recent performance."""
    token = _extract_token(authorization)
    recent = []
    if token:
        try:
            recent = await strava_service.fetch_activities(token, per_page=30)
        except Exception:
            recent = []
    days_per_week = len(req.training_days) if req.training_days else 5
    try:
        return await claude_service.generate_plan(
            goal=req.goal,
            fitness_level=req.fitness_level or "intermediate",
            days_per_week=days_per_week,
            recent_activities=recent,
            training_days=req.training_days,
            long_run_day=req.long_run_day,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
