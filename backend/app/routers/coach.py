from fastapi import APIRouter, Header, HTTPException

from app.models.schemas import (
    CoachChatRequest,
    CoachMessage,
    CoachInsight,
    AnalyzeActivityRequest,
)
from app.services.claude_service import claude_service
from app.services.strava_service import strava_service

router = APIRouter()


def _extract_token(authorization: str | None) -> str | None:
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1]
    return None


@router.post("/chat", response_model=CoachMessage)
async def chat(req: CoachChatRequest):
    try:
        return await claude_service.chat(req.message, req.history, req.context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insight/daily", response_model=CoachInsight)
async def daily_insight(authorization: str = Header(None)):
    token = _extract_token(authorization)
    recent = []
    if token:
        try:
            recent = await strava_service.fetch_activities(token, per_page=20)
        except Exception:
            recent = []
    return await claude_service.daily_insight(recent, goal=None)


@router.post("/activity/analyze", response_model=CoachInsight)
async def analyze_activity(
    req: AnalyzeActivityRequest, authorization: str = Header(None)
):
    token = _extract_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing access token")
    try:
        detail = await strava_service.fetch_activity(token, req.activity_id)
        # Build a lightweight insight prompt from the detail
        prompt_ctx = {
            "activity": {
                "name": detail.get("name"),
                "distance_km": round(detail.get("distance", 0) / 1000, 2),
                "pace_sec_per_km": round(detail.get("moving_time", 0) / max(1, detail.get("distance", 1) / 1000)),
                "avg_hr": detail.get("average_heartrate"),
                "suffer": detail.get("suffer_score"),
                "elevation": detail.get("total_elevation_gain"),
                "cadence": detail.get("average_cadence"),
            }
        }
        msg = await claude_service.chat(
            "Analise esse treino e me dê o insight mais importante.",
            history=[],
            context=prompt_ctx,
        )
        return CoachInsight(
            id=msg.id,
            type="tip",
            title="Análise do treino",
            body=msg.content,
            timestamp=msg.timestamp,
            read=False,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
