import httpx
from typing import List, Optional
from app.config import settings
from app.models.schemas import StravaTokens, StravaActivity, StravaAthlete

STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token"
STRAVA_API_BASE = "https://www.strava.com/api/v3"


class StravaService:
    """Thin wrapper around Strava's OAuth + REST API."""

    def __init__(self) -> None:
        self.client_id = settings.strava_client_id
        self.client_secret = settings.strava_client_secret

    async def exchange_code(self, code: str, redirect_uri: str) -> StravaTokens:
        """Exchanges an OAuth authorization code for tokens + athlete profile."""
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post(
                STRAVA_TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
            )
            r.raise_for_status()
            data = r.json()
            return StravaTokens(
                access_token=data["access_token"],
                refresh_token=data["refresh_token"],
                expires_at=data["expires_at"],
                athlete=StravaAthlete(**data["athlete"]),
            )

    async def refresh_token(self, refresh_token: str) -> StravaTokens:
        """Uses a refresh_token to obtain a new access_token."""
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post(
                STRAVA_TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            r.raise_for_status()
            data = r.json()
            # Strava's refresh response omits the athlete — fetch it separately
            athlete = await self._fetch_athlete(data["access_token"])
            return StravaTokens(
                access_token=data["access_token"],
                refresh_token=data["refresh_token"],
                expires_at=data["expires_at"],
                athlete=athlete,
            )

    async def _fetch_athlete(self, access_token: str) -> StravaAthlete:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(
                f"{STRAVA_API_BASE}/athlete",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            r.raise_for_status()
            return StravaAthlete(**r.json())

    # Public wrapper
    async def fetch_athlete(self, access_token: str) -> dict:
        athlete = await self._fetch_athlete(access_token)
        return athlete.model_dump()

    async def fetch_activities(
        self,
        access_token: str,
        after: Optional[int] = None,
        per_page: int = 100,
        max_pages: int = 1,
    ) -> List[StravaActivity]:
        """Fetches the athlete's recent activities (default 100, max 200 per page).

        max_pages > 1 paginates older activities. Each page costs one Strava API
        call; Strava's rate limit is 100 req/15min so 3-4 pages is safe."""
        all_runs: List[StravaActivity] = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for page in range(1, max_pages + 1):
                params: dict = {"per_page": min(per_page, 200), "page": page}
                if after:
                    params["after"] = after
                r = await client.get(
                    f"{STRAVA_API_BASE}/athlete/activities",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params=params,
                )
                r.raise_for_status()
                raw = r.json()
                runs = [
                    StravaActivity(**a) for a in raw if a.get("type") in ("Run", "TrailRun")
                ]
                all_runs.extend(runs)
                if len(raw) < params["per_page"]:
                    break  # last page
        return all_runs

    async def fetch_full_history(self, access_token: str) -> List[StravaActivity]:
        """Fetches up to ~600 runs (6 pages × 100) — covers several months of training.

        Used once on login and for PR/analytics computations that need long history."""
        return await self.fetch_activities(access_token, per_page=100, max_pages=6)

    async def fetch_activity(self, access_token: str, activity_id: int) -> dict:
        """Full detail for a single activity, including laps + streams."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.get(
                f"{STRAVA_API_BASE}/activities/{activity_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"include_all_efforts": "true"},
            )
            r.raise_for_status()
            return r.json()


strava_service = StravaService()
