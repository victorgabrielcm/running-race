"""
AI service — the brain of Vincere.

Supports two providers via AI_PROVIDER env var:
- `groq`      → Llama 3.3 70B (grátis, OpenAI-compatible API)
- `anthropic` → Claude (pago)

Loads a Portuguese knowledge base from app/knowledge/*.md at startup and
injects the relevant doc into each system prompt (plan uses training; nutrition
uses nutrition; coach chat uses both; daily insight uses training).

Exports `claude_service` for backwards compat; it's provider-agnostic.
"""

from __future__ import annotations
import json
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import httpx
from anthropic import AsyncAnthropic
from app.config import settings
from app.models.schemas import (
    CoachMessage,
    CoachInsight,
    Meal,
    MealSuggestion,
    NutritionDay,
    StravaActivity,
    UserGoal,
    TrainingPlan,
    TrainingWeek,
)

# ─── Knowledge base ────────────────────────────────────────────────────────────

KB_DIR = Path(__file__).resolve().parent.parent / "knowledge"


def _load_kb(filename: str) -> str:
    path = KB_DIR / filename
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


KB_TRAINING = _load_kb("training_physiology.md")
KB_NUTRITION = _load_kb("nutrition_protocols.md")


# ─── System prompts (inject KB) ────────────────────────────────────────────────

COACH_SYSTEM = f"""You are Vincere Coach — an elite, hyper-focused running coach.

You have access to the following internal knowledge base. ALWAYS apply these
rules when prescribing training, analyzing performance, or suggesting nutrition.

<KB_TRAINING>
{KB_TRAINING}
</KB_TRAINING>

<KB_NUTRITION>
{KB_NUTRITION}
</KB_NUTRITION>

Rules:
- Respond in Brazilian Portuguese (pt-BR) unless the user writes in English.
- Be specific, data-driven, and decisive. Reference the athlete's real numbers.
- When recommending paces, use MM:SS/km format.
- When suggesting workouts, include structure (warmup / main / cooldown).
- Keep responses under 180 words unless the user asks for detail.
- Never give generic motivational fluff — focus on actionable insight.
- Cross-reference training load with nutrition when relevant.
"""

PLAN_SYSTEM = f"""You are an elite running coach designing a training plan.

Use this knowledge base strictly — it defines zones, ACWR, periodization,
tapering and goal-feasibility rules:

<KB_TRAINING>
{KB_TRAINING}
</KB_TRAINING>

You MUST:
1. Assess whether the goal is feasible in the remaining weeks (use the
   "Avaliação de Viabilidade de Meta" table).
2. Respect ACWR: never prescribe >10% weekly volume increase.
3. Apply piramidal distribution: 80% Z1-Z2, 20% Z3-Z5.
4. Use the athlete's recent volume as baseline for Week 1.
5. Pick the phase for each week (base / build / peak / taper / recovery).

Output ONLY valid JSON matching the schema. No markdown, no code fences.
Start with {{ and end with }}. All titles/descriptions in Brazilian Portuguese.
"""

INSIGHT_SYSTEM = f"""You are Vincere Coach analyzing the last 7 days of training.

Apply this knowledge base:

<KB_TRAINING>
{KB_TRAINING}
</KB_TRAINING>

Output exactly one concise insight as JSON:
{{"type": "tip|warning|achievement|adjustment", "title": "...", "body": "...", "action": "optional CTA"}}.

Title ≤ 60 chars. Body ≤ 160 chars. In Brazilian Portuguese.
No markdown, no code fences. Start response with {{ and end with }}.
"""

NUTRITION_SYSTEM = f"""You are a sports nutritionist for runners.

Apply this knowledge base strictly (macros g/kg, timing, electrolytes):

<KB_NUTRITION>
{KB_NUTRITION}
</KB_NUTRITION>

You receive today's workout and the athlete's weight. Return a complete
nutrition plan for the day. Cross-reference training load with macros per
Section 6 (Matriz de Decisão Diária).

Output ONLY valid JSON. No markdown. In Brazilian Portuguese.
"""


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _strip_code_fences(text: str) -> str:
    """LLMs often wrap JSON in ```json ... ``` despite instructions to the contrary."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _workout_to_load(workout_type: str) -> str:
    """Map workout type to training load bucket."""
    mapping = {
        "rest": "rest",
        "mobility": "rest",
        "recovery": "light",
        "easy_run": "light",
        "strength": "moderate",
        "cross_training": "moderate",
        "tempo": "moderate",
        "fartlek": "moderate",
        "race_pace": "hard",
        "interval": "hard",
        "long_run": "long_run",
    }
    return mapping.get(workout_type, "moderate")


# ─── AIService ─────────────────────────────────────────────────────────────────

class AIService:
    def __init__(self) -> None:
        self.provider = settings.ai_provider.lower()
        self._anthropic: Optional[AsyncAnthropic] = None
        if settings.anthropic_api_key:
            self._anthropic = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self._groq_key = settings.groq_api_key
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
            "No AI provider configured. Set GROQ_API_KEY or ANTHROPIC_API_KEY in backend/.env"
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
                    "temperature": 0.6,
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
        weekly_load = self._weekly_load(recent_activities)
        prompt = (
            f"Últimos 7 dias:\n{summary}\n\n"
            f"Carga aguda estimada: {weekly_load['acute']:.1f} km (7d).\n"
            f"Carga crônica estimada: {weekly_load['chronic']:.1f} km/sem (28d).\n"
            f"ACWR: {weekly_load['acwr']:.2f}\n\n"
            f"Meta: {goal.model_dump() if goal else 'condicionamento geral'}\n\n"
            "Com base no ACWR + volume, gere UM insight acionável."
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
        weeks_available = self._weeks_until(goal.targetDate) if goal.targetDate else 16
        summary = self._summarize_activities(recent_activities)
        weekly_load = self._weekly_load(recent_activities)

        schema = {
            "goalType": goal.type,
            "totalWeeks": weeks_available,
            "currentWeek": 1,
            "feasibility": {
                "verdict": "feasible | tight | risky | impossible",
                "reason": "string (1-2 sentences, in pt-BR)",
                "alternative": "string (only if risky/impossible — distância menor ou data estendida)",
            },
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
                    "description": "string (warmup + main + cooldown)",
                    "date": "YYYY-MM-DD",
                    "targetDistance": 10.0,
                    "targetPace": "5:20",
                    "targetDuration": 45,
                },
            },
        }

        prompt = f"""Meta do atleta: {goal.type} em {goal.targetDate or 'data não definida'}.
Nível declarado: {fitness_level}. Dias disponíveis/semana: {days_per_week}.
Semanas disponíveis até a meta: {weeks_available}.

Histórico recente (Strava últimos 7d):
{summary}

Carga atual:
- Volume médio semanal (últimas 4 semanas): {weekly_load['chronic']:.1f} km
- Volume últimos 7 dias: {weekly_load['acute']:.1f} km
- ACWR atual: {weekly_load['acwr']:.2f}

INSTRUÇÕES OBRIGATÓRIAS:
1. Analise se {weeks_available} semanas são suficientes para a meta {goal.type}
   comparando com a tabela de "Semanas mínimas recomendadas" da base.
2. Preencha o campo "feasibility" com o veredito e, se risky/impossible, uma
   alternativa concreta (distância menor OU data estendida).
3. Baseline Semana 1 = no máximo volume atual ({weekly_load['chronic']:.1f} km) +10%.
4. Progressão semanal ≤10% (respeitar ACWR).
5. Periodização: primeiras semanas = base (Z2 dominante). Build adiciona Z3/Z4.
   Peak = maior volume. Taper nas últimas 2 semanas antes da prova.
6. Retorne as PRÓXIMAS 4 SEMANAS (semana atual + 3 seguintes), com data real
   começando na próxima segunda-feira.
7. Cada semana deve ter {days_per_week} treinos + 1 dia de mobilidade/força + resto descanso.
8. Long run máximo 2h30 de duração.

Schema (títulos/descrições em pt-BR):
{json.dumps(schema, indent=2, ensure_ascii=False)}
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
            return self._fallback_plan(goal, weeks_available)

        now = datetime.utcnow().isoformat()
        return TrainingPlan(
            id=f"plan_{uuid.uuid4().hex[:10]}",
            goalType=goal.type,
            totalWeeks=weeks_available,
            currentWeek=1,
            startDate=now.split("T")[0],
            raceDate=goal.targetDate,
            weeks=[TrainingWeek(**w) for w in data.get("weeks", [])],
            aiGenerated=True,
            lastUpdated=now,
        )

    # ─── Nutrition (day) ──────────────────────────────────────────────────

    async def generate_nutrition_day(
        self,
        date_iso: str,
        weight_kg: float,
        workout_type: str,
        workout_distance_km: Optional[float] = None,
        workout_duration_min: Optional[int] = None,
    ) -> NutritionDay:
        load = _workout_to_load(workout_type)

        schema = {
            "date": date_iso,
            "trainingLoad": "rest|light|moderate|hard|long_run",
            "calories": 2500,
            "carbs": 350,
            "protein": 120,
            "fat": 70,
            "hydration": 2.5,
            "meals": [
                {
                    "time": "HH:MM",
                    "name": "string",
                    "calories": 600,
                    "carbs": 80,
                    "protein": 30,
                    "fat": 15,
                    "foods": ["string", "..."],
                }
            ],
            "preRun": {
                "timing": "string",
                "description": "string",
                "foods": ["..."],
                "notes": "string",
            },
            "duringRun": {"timing": "string", "description": "string", "foods": ["..."], "notes": "string"},
            "postRun": {"timing": "string", "description": "string", "foods": ["..."], "notes": "string"},
        }

        workout_detail = (
            f"{workout_type} — {workout_distance_km or '?'} km / "
            f"{workout_duration_min or '?'} min"
        )

        prompt = f"""Data: {date_iso}
Peso do atleta: {weight_kg} kg
Treino de hoje: {workout_detail}
Carga classificada: {load}

Gere o plano nutricional do dia seguindo EXATAMENTE as g/kg da tabela para
carga "{load}". Se for rest/light, omita preRun/intraRun/postRun. Se for
long_run/hard, preencha TODOS os 3 com quantidades reais de carboidrato por hora.

Schema (use os valores calculados em gramas/kg × peso):
{json.dumps(schema, indent=2, ensure_ascii=False)}
"""

        text = await self._chat_raw(
            NUTRITION_SYSTEM,
            [{"role": "user", "content": prompt}],
            max_tokens=2048,
        )
        text = _strip_code_fences(text)

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            return self._fallback_nutrition(date_iso, load, weight_kg)

        try:
            return NutritionDay(
                date=data.get("date", date_iso),
                trainingLoad=data.get("trainingLoad", load),
                calories=int(data.get("calories", 0)),
                carbs=int(data.get("carbs", 0)),
                protein=int(data.get("protein", 0)),
                fat=int(data.get("fat", 0)),
                hydration=float(data.get("hydration", 2.5)),
                meals=[Meal(**m) for m in data.get("meals", [])],
                preRun=MealSuggestion(**data["preRun"]) if data.get("preRun") else None,
                duringRun=MealSuggestion(**data["duringRun"]) if data.get("duringRun") else None,
                postRun=MealSuggestion(**data["postRun"]) if data.get("postRun") else None,
            )
        except Exception:
            return self._fallback_nutrition(date_iso, load, weight_kg)

    # ─── Helpers ──────────────────────────────────────────────────────────

    def _summarize_activities(self, activities: List[StravaActivity]) -> str:
        if not activities:
            return "Sem atividades recentes."
        lines = []
        for a in activities[:10]:
            km = round(a.distance / 1000, 1)
            pace_sec = round(a.moving_time / km) if km > 0 else 0
            pace_min = pace_sec // 60
            pace_rem = pace_sec % 60
            hr = f"{round(a.average_heartrate)} bpm" if a.average_heartrate else "sem FC"
            lines.append(
                f"- {a.start_date_local[:10]}: {a.name} · {km}km · "
                f"{pace_min}:{pace_rem:02d}/km · {hr}"
            )
        return "\n".join(lines)

    def _weekly_load(self, activities: List[StravaActivity]) -> dict:
        """Compute acute (7d), chronic (28d) load in km and ACWR."""
        if not activities:
            return {"acute": 0.0, "chronic": 0.0, "acwr": 0.0}

        now = datetime.utcnow()
        km_7d = 0.0
        km_28d = 0.0
        for a in activities:
            try:
                when = datetime.fromisoformat(a.start_date.replace("Z", "+00:00"))
            except Exception:
                continue
            delta_days = (now - when.replace(tzinfo=None)).days
            km = a.distance / 1000
            if delta_days <= 7:
                km_7d += km
            if delta_days <= 28:
                km_28d += km
        chronic_weekly = km_28d / 4.0 if km_28d else 0.0
        acwr = (km_7d / chronic_weekly) if chronic_weekly > 0 else 0.0
        return {"acute": km_7d, "chronic": chronic_weekly, "acwr": acwr}

    def _weeks_until(self, iso_date: str) -> int:
        target = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
        delta = (target.replace(tzinfo=None) - datetime.utcnow()).days
        return max(4, min(52, delta // 7))

    def _fallback_plan(self, goal: UserGoal, weeks: int) -> TrainingPlan:
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

    def _fallback_nutrition(self, date_iso: str, load: str, weight_kg: float) -> NutritionDay:
        """Rule-based nutrition when the LLM fails — still better than static mock."""
        carbs_per_kg = {"rest": 4, "light": 4, "moderate": 6, "hard": 8, "long_run": 9}[load]
        protein_per_kg = 1.8 if load in {"hard", "long_run"} else 1.6
        fat_per_kg = 1.2 if load in {"hard", "long_run"} else 1.0

        carbs = int(weight_kg * carbs_per_kg)
        protein = int(weight_kg * protein_per_kg)
        fat = int(weight_kg * fat_per_kg)
        calories = carbs * 4 + protein * 4 + fat * 9

        return NutritionDay(
            date=date_iso,
            trainingLoad=load,  # type: ignore
            calories=calories,
            carbs=carbs,
            protein=protein,
            fat=fat,
            hydration=3.0 if load in {"hard", "long_run"} else 2.5,
            meals=[],
            preRun=None,
            duringRun=None,
            postRun=None,
        )


# Backwards-compat export: routers import `claude_service`
claude_service = AIService()
