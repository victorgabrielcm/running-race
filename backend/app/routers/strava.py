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
    full: bool = False,
):
    """
    Fetch the athlete's runs.

    - `full=true`: fetches up to ~600 runs (6 months typical). Use on first
      login or for PR computation. Slower (3-6s) but necessary for accurate
      21k/42k/ultra records.
    - Otherwise: last ~100 runs only (default, faster).
    """
    token = _extract_token(authorization)
    try:
        if full:
            return await strava_service.fetch_full_history(token)
        return await strava_service.fetch_activities(token, after=after, per_page=100, max_pages=1)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activities/{activity_id}")
async def activity_detail(activity_id: int, authorization: str = Header(None)):
    token = _extract_token(authorization)
    try:
        return await strava_service.fetch_activity(token, activity_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
