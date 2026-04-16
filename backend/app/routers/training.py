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
            recent = await strava_service.fetch_activities(token, per_page=30)
        except Exception:
            recent = []
    try:
        return await claude_service.generate_plan(
            goal=req.goal,
            fitness_level="intermediate",
            days_per_week=5,
            recent_activities=recent,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/plan/adjust", response_model=TrainingPlan)
async def adjust_plan(authorization: str = Header(None)):
    """Re-runs plan generation with the latest 7 days of Strava data applied."""
    token = _extract_token(authorization)
    recent = []
    if token:
        try:
            recent = await strava_service.fetch_activities(token, per_page=15)
        except Exception:
            recent = []
    raise HTTPException(
        status_code=501,
        detail="Plan adjustment requires persisted user state. Implement DB layer.",
    )
