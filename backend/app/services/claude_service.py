"""
AI service — the brain of Vincere.

Supports two providers via AI_PROVIDER env var:
- `groq`      → Llama 3.3 70B (grátis, OpenAI-compatible API)
- `anthropic` → Claude (pago)

Exports `claude_service` for backwards compat; it's provider-agnostic.
"""

from __future__ import annotations
import json
import re
import uuid
from datetime import datetime
from typing import List, Optional

import httpx
from anthropic import AsyncAnthropic
from app.config import settings
from app.models.schemas import (
    CoachMessage,
    CoachInsight,
    StravaActivity,
    UserGoal,
    TrainingPlan,
    TrainingWeek,
)


COACH_SYSTEM = """You are Vincere Coach — an elite, hyper-focused running coach.
Your knowledge base combines exercise physiology, sports nutrition, biomechanics,
and the latest research on endurance training (Jack Daniels, Pete Pfitzinger,
Steve Magness, Luke Humphrey).

Always:
- Respond in Brazilian Portuguese (pt-BR) unless the user writes in English.
- Be specific, data-driven, and decisive. Reference the athlete's real numbers.
- When recommending paces, use MM:SS/km format.
- When suggesting workouts, include structure (warmup / main / cooldown).
- Keep responses under 180 words unless the user asks for detail.
- Never give generic motivational fluff — focus on actionable insight.

Your voice is that of a no-nonsense coach who genuinely cares about the athlete's
progress toward their specific goal.
"""

PLAN_SYSTEM = """You are an elite running coach designing a training plan.
Output ONLY valid JSON matching the schema provided. No markdown, no commentary,
no code fences. Start your response with { and end with }.
"""

INSIGHT_SYSTEM = """You are Vincere Coach analyzing the last 7 days of training.
Output exactly one concise insight as JSON: {"type": "tip|warning|achievement|adjustment",
"title": "...", "body": "...", "action": "optional CTA"}.
Title ≤ 60 chars. Body ≤ 160 chars. In Brazilian Portuguese.
No markdown, no code fences. Start response with { and end with }.
"""


def _strip_code_fences(text: str) -> str:
    """LLMs often wrap JSON in ```json ... ``` despite instructions to the contrary."""
    text = text.strip()
    if text.startswith("```"):
        # remove opening fence (```json or ```)
        text = re.sub(r"^```(?:json)?\s*", "", text)
        # remove closing fence
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


class AIService:
    def __init__(self) -> None:
        self.provider = settings.ai_provider.lower()
        # Anthropic
        self._anthropic: Optional[AsyncAnthropic] = None
        if settings.anthropic_api_key:
            self._anthropic = AsyncAnthropic(api_key=settings.anthropic_api_key)
        # Groq
        self._groq_key = settings.groq_api_key
        # Auto-fallback: if groq is configured but no key, try anthropic
        if self.provider == "groq" and not self._groq_key and self._anthropic:
            self.provider = "anthropic"
        if self.provider == "anthropic" and not self._anthropic and self._groq_key:
            self.provider = "groq"

    # ─── Provider dispatch ────────────────────────────────────────────────

    async def _chat_raw(
        self,
        system: str,
        messages: list[dict],
        max_tokens: int = 1024,
    ) -> str:
        if self.provider == "groq":
            return await self._groq_chat(system, messages, max_tokens)
        if self.provider == "anthropic":
            return await self._anthropic_chat(system, messages, max_tokens)
        raise RuntimeError(
            f"No AI provider configured. Set GROQ_API_KEY or ANTHROPIC_API_KEY in backend/.env"
        )

    async def _anthropic_chat(
        self, system: str, messages: list[dict], max_tokens: int
    ) -> str:
        if not self._anthropic:
            raise RuntimeError("ANTHROPIC_API_KEY not set")
        resp = await self._anthropic.messages.create(
            model=settings.claude_model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        )
        return "".join(
            b.text for b in resp.content if getattr(b, "type", "") == "text"
        )

    async def _groq_chat(
        self, system: str, messages: list[dict], max_tokens: int
    ) -> str:
        if not self._groq_key:
            raise RuntimeError("GROQ_API_KEY not set")
        oai_messages = [{"role": "system", "content": system}] + messages
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self._groq_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.groq_model,
                    "messages": oai_messages,
                    "max_tokens": max_tokens,
                    "temperature": 0.7,
                },
            )
            r.raise_for_status()
            data = r.json()
            return data["choices"][0]["message"]["content"]

    # ─── Chat ────────────────────────────────────────────────────────────

    async def chat(
        self,
        message: str,
        history: List[CoachMessage],
        context: Optional[dict] = None,
    ) -> CoachMessage:
        messages = []
        for h in history[-20:]:
            messages.append({"role": h.role, "content": h.content})
        messages.append({"role": "user", "content": message})

        system = COACH_SYSTEM
        if context:
            system += f"\n\nATHLETE CONTEXT:\n{json.dumps(context, default=str, ensure_ascii=False)}"

        text = await self._chat_raw(system, messages, max_tokens=1024)
        return CoachMessage(
            id=f"a_{uuid.uuid4().hex[:12]}",
            role="assistant",
            content=text.strip(),
            timestamp=datetime.utcnow().isoformat(),
            context="training",
        )

    # ─── Daily insight ───────────────────────────────────────────────────

    async def daily_insight(
        self,
        recent_activities: List[StravaActivity],
        goal: Optional[UserGoal] = None,
    ) -> CoachInsight:
        summary = self._summarize_activities(recent_activities)
        prompt = (
            f"Last 7 days:\n{summary}\n\n"
            f"Goal: {goal.model_dump() if goal else 'general fitness'}\n\n"
            "Generate ONE insight."
        )

        text = await self._chat_raw(
            INSIGHT_SYSTEM,
            [{"role": "user", "content": prompt}],
            max_tokens=512,
        )
        text = _strip_code_fences(text)

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            data = {
                "type": "tip",
                "title": "Continue consistente",
                "body": "Não consegui analisar com detalhes agora, mas seu histórico mostra progresso.",
            }

        return CoachInsight(
            id=f"ins_{uuid.uuid4().hex[:10]}",
            type=data.get("type", "tip"),
            title=data["title"],
            body=data["body"],
            action=data.get("action"),
            timestamp=datetime.utcnow().isoformat(),
            read=False,
        )

    # ─── Training plan generation ────────────────────────────────────────

    async def generate_plan(
        self,
        goal: UserGoal,
        fitness_level: str,
        days_per_week: int,
        recent_activities: List[StravaActivity],
    ) -> TrainingPlan:
        target_weeks = self._weeks_until(goal.targetDate) if goal.targetDate else 16
        summary = self._summarize_activities(recent_activities)

        schema = {
            "goalType": goal.type,
            "totalWeeks": target_weeks,
            "currentWeek": 1,
            "weeks[]": {
                "weekNumber": 1,
                "startDate": "YYYY-MM-DD",
                "endDate": "YYYY-MM-DD",
                "phase": "base|build|peak|taper|recovery",
                "totalKm": 35.0,
                "workouts[]": {
                    "id": "string",
                    "type": "easy_run|long_run|tempo|interval|fartlek|recovery|race_pace|strength|mobility|rest",
                    "title": "string",
                    "description": "string (include warmup + main + cooldown)",
                    "date": "YYYY-MM-DD",
                    "targetDistance": 10.0,
                    "targetPace": "5:20",
                    "targetDuration": 45,
                },
            },
        }

        prompt = f"""Generate a {target_weeks}-week plan for goal {goal.type}.
Level: {fitness_level}. {days_per_week} training days/week.

Recent performance (Strava last 7d):
{summary}

Return only the first 4 weeks (current + 3 ahead). Use periodization:
- Weeks 1-2: base aerobic building (Z2 emphasis).
- Week 3: quality intro (tempo or fartlek).
- Week 4: long run peaks.

Schema (Brazilian Portuguese titles/descriptions):
{json.dumps(schema, indent=2)}
"""

        text = await self._chat_raw(
            PLAN_SYSTEM,
            [{"role": "user", "content": prompt}],
            max_tokens=4096,
        )
        text = _strip_code_fences(text)

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            return self._fallback_plan(goal, target_weeks)

        now = datetime.utcnow().isoformat()
        return TrainingPlan(
            id=f"plan_{uuid.uuid4().hex[:10]}",
            goalType=goal.type,
            totalWeeks=target_weeks,
            currentWeek=1,
            startDate=now.split("T")[0],
            raceDate=goal.targetDate,
            weeks=[TrainingWeek(**w) for w in data.get("weeks", [])],
            aiGenerated=True,
            lastUpdated=now,
        )

    # ─── Helpers ──────────────────────────────────────────────────────────

    def _summarize_activities(self, activities: List[StravaActivity]) -> str:
        if not activities:
            return "No recent activities."
        lines = []
        for a in activities[:10]:
            km = round(a.distance / 1000, 1)
            pace_sec = round(a.moving_time / km) if km > 0 else 0
            pace_min = pace_sec // 60
            pace_rem = pace_sec % 60
            hr = f"{round(a.average_heartrate)} bpm" if a.average_heartrate else "no HR"
            lines.append(
                f"- {a.start_date_local[:10]}: {a.name} · {km}km · "
                f"{pace_min}:{pace_rem:02d}/km · {hr}"
            )
        return "\n".join(lines)

    def _weeks_until(self, iso_date: str) -> int:
        target = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
        delta = (target - datetime.utcnow()).days
        return max(4, min(24, delta // 7))

    def _fallback_plan(self, goal: UserGoal, weeks: int) -> TrainingPlan:
        """Deterministic fallback when the LLM returns malformed JSON."""
        now = datetime.utcnow().isoformat()
        return TrainingPlan(
            id=f"plan_{uuid.uuid4().hex[:10]}",
            goalType=goal.type,
            totalWeeks=weeks,
            currentWeek=1,
            startDate=now.split("T")[0],
            raceDate=goal.targetDate,
            weeks=[],
            aiGenerated=False,
            lastUpdated=now,
        )


# Backwards-compat export: routers import `claude_service`
claude_service = AIService()
