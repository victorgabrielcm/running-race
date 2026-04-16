from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, strava, training, coach, nutrition, notifications

app = FastAPI(
    title="Vincere API",
    version="1.0.0",
    description="Backend for the Vincere running training app. "
    "Handles Strava OAuth, AI coaching via Claude, and training plan generation.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(strava.router, prefix="/strava", tags=["strava"])
app.include_router(training.router, prefix="/training", tags=["training"])
app.include_router(coach.router, prefix="/coach", tags=["coach"])
app.include_router(nutrition.router, prefix="/nutrition", tags=["nutrition"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])


@app.get("/")
async def root():
    return {
        "app": "Vincere",
        "version": "1.0.0",
        "status": "ok",
        "tagline": "Every kilometer is a conquest.",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
