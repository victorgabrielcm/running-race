import base64
import json
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
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


@router.get("/strava/callback", response_class=HTMLResponse)
async def strava_callback(request: Request):
    """OAuth callback landing page.

    Strava doesn't accept custom-scheme redirect URIs (`vincere://...`) — it
    requires a real HTTP host that matches the configured Callback Domain.
    We host this endpoint so the mobile app can pass
    `redirect_uri=<backend>/auth/strava/callback` and the Strava Callback
    Domain can simply be `localhost`.

    Flow:
      1. Strava redirects user here with ?code=...
      2. We exchange the code for tokens server-side (client_secret stays
         private)
      3. We render a page that deep-links to vincere://strava/callback
         with the tokens encoded in the URL, so the app picks them up.
    """
    params = dict(request.query_params)
    code = params.get("code")
    error = params.get("error")

    if error or not code:
        return HTMLResponse(
            f"<h1>Autorização negada</h1><p>{error or 'Código ausente'}</p>",
            status_code=400,
        )

    redirect_uri = str(request.url).split("?")[0]
    try:
        tokens = await strava_service.exchange_code(code, redirect_uri)
    except Exception as e:
        return HTMLResponse(
            f"<h1>Erro ao trocar o token</h1><p>{e}</p>",
            status_code=500,
        )

    payload = base64.urlsafe_b64encode(
        json.dumps(tokens.model_dump()).encode()
    ).decode()
    deep_link = f"vincere://strava/callback?data={payload}"

    return HTMLResponse(
        f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Conectando ao Vincere...</title>
  <style>
    body {{
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
      background: #0A0A0A;
      color: #FAFAFA;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 24px;
    }}
    h1 {{ font-size: 22px; letter-spacing: 2px; color: #CCFF00; margin: 0 0 12px; }}
    p {{ color: #A0A0A0; font-size: 15px; margin: 4px 0; }}
    a {{
      display: inline-block;
      margin-top: 24px;
      padding: 12px 24px;
      border-radius: 999px;
      background: #CCFF00;
      color: #000;
      text-decoration: none;
      font-weight: 600;
    }}
  </style>
</head>
<body>
  <div>
    <h1>VINCERE</h1>
    <p>Autorização concluída!</p>
    <p>Voltando ao aplicativo...</p>
    <a href="{deep_link}">Abrir no app</a>
  </div>
  <script>
    window.location.replace({json.dumps(deep_link)});
  </script>
</body>
</html>
""",
    )
