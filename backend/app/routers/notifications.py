"""
Push notification device token registration + delivery via Expo Push API.

Devices register their Expo Push Token here.
The backend can then send remote notifications (e.g. daily AI insights)
using the Expo Push Notification Service — no APNs/FCM credentials needed.
"""

from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# In-memory store for tokens (replace with DB in production)
_device_tokens: dict[str, str] = {}  # token → platform


# ─── Schemas ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    token: str
    platform: str  # "ios" | "android"


class PushPayload(BaseModel):
    title: str
    body: str
    screen: str = "/(tabs)"
    token: str | None = None  # if None, broadcast to all registered devices


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/register", summary="Register an Expo Push Token")
async def register_token(req: RegisterRequest):
    """
    Called by the mobile app after permission is granted.
    Stores the Expo Push Token so the backend can send remote notifications.
    """
    if not req.token.startswith("ExponentPushToken["):
        raise HTTPException(status_code=400, detail="Invalid Expo push token format.")

    _device_tokens[req.token] = req.platform
    return {"registered": True, "platform": req.platform}


@router.post("/send", summary="Send a push notification (internal)")
async def send_notification(payload: PushPayload):
    """
    Internal endpoint — send a push notification to one device (or all).
    In production, protect this with an API key or service-to-service auth.
    """
    targets = (
        [payload.token]
        if payload.token
        else list(_device_tokens.keys())
    )

    if not targets:
        return {"sent": 0, "detail": "No registered devices."}

    messages = [
        {
            "to": token,
            "title": payload.title,
            "body": payload.body,
            "sound": "default",
            "data": {"screen": payload.screen},
            "channelId": "vincere",
        }
        for token in targets
    ]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://exp.host/--/api/v2/push/send",
            json=messages,
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            timeout=10.0,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Expo push API error.")

    return {"sent": len(targets), "response": resp.json()}


@router.get("/tokens", summary="List registered tokens (debug)")
async def list_tokens():
    """Debug endpoint — remove or protect in production."""
    return {"count": len(_device_tokens), "tokens": list(_device_tokens.keys())}
