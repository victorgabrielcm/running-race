from typing import Optional
from fastapi import APIRouter, Header, HTTPException

from app.services.strava_service import strava_service
from app.models.schemas import StravaActivity

router = APIRouter()


def _extract_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing access token")
    return authorization.split(" ", 1)[1]


@router.get("/activities", response_model=list[StravaActivity])
async def list_activities(
    authorization: str = Header(None),
    after: Optional[int] = None,
):
    token = _extract_token(authorization)
    try:
        return await strava_service.fetch_activities(token, after=after)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activities/{activity_id}")
async def activity_detail(activity_id: int, authorization: str = Header(None)):
    token = _extract_token(authorization)
    try:
        return await strava_service.fetch_activity(token, activity_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
