from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    StravaTokens,
    StravaExchangeRequest,
    StravaRefreshRequest,
)
from app.services.strava_service import strava_service

router = APIRouter()


@router.post("/strava/exchange", response_model=StravaTokens)
async def exchange_strava_code(payload: StravaExchangeRequest):
    try:
        return await strava_service.exchange_code(payload.code, payload.redirect_uri)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Strava exchange failed: {e}")


@router.post("/strava/refresh", response_model=StravaTokens)
async def refresh_strava_token(payload: StravaRefreshRequest):
    try:
        return await strava_service.refresh_token(payload.refresh_token)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Strava refresh failed: {e}")
