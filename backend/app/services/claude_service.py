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
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import List, Optional

import httpx
from anthropic import AsyncAnthropic
from app.config import settings
from app.models.schemas import (
    CoachMessage,
    CoachInsight,
    FoodCategory,
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


WEEKDAY_NAMES_PT = [
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
    "domingo",
]


def _format_weekday(idx: Optional[int]) -> str:
    if idx is None or idx < 0 or idx > 6:
        return "domingo (default)"
    return WEEKDAY_NAMES_PT[idx]


def _format_training_days(days: Optional[List[int]], count: int) -> str:
    if not days:
        return f"qualquer {count} dias da semana"
    valid = sorted([d for d in days if 0 <= d <= 6])
    if not valid:
        return f"qualquer {count} dias da semana"
    return ", ".join(WEEKDAY_NAMES_PT[d] for d in valid)


# ─── Adaptive progression ──────────────────────────────────────────────────
#
# Replaces the rigid "always +10%" rule with a bucket-based approach that looks
# at how the athlete actually FELT during last week. Buckets:
#
#   hold          : 0% (or -5% if very stressed)  — body asking for recovery
#   conservative  : +3 to +7%                     — normal progression, safe
#   standard      : +8 to +12%                    — athlete cruising, safe to push
#   aggressive    : +13 to +20%                   — thriving, clear capacity for more
#
# Signals:
#   - % of workouts completed
#   - Distribution of "felt" feedback (easy / moderate / hard / very_hard)
#   - Average RPE (if reported)
#
# We intentionally DON'T use HR alone — it's noisy. Subjective feedback + objective
# completion rate together is what the sports-science literature recommends.

def _compute_progression_bucket(prior_week: Optional[List[dict]]) -> dict:
    """Returns: {bucket: str, min_pct: int, max_pct: int, summary: str}"""
    if not prior_week:
        return {
            "bucket": "conservative",
            "min_pct": 3,
            "max_pct": 8,
            "summary": "Sem dados da semana anterior — começando conservador.",
        }

    non_rest = [w for w in prior_week if w.get("type") != "rest"]
    total = len(non_rest) or 1
    completed = [w for w in non_rest if w.get("completed") or w.get("feedback")]
    completion_pct = int(100 * len(completed) / total)

    feedbacks = [w.get("feedback") for w in non_rest if w.get("feedback")]
    felt_counts = {"easy": 0, "moderate": 0, "hard": 0, "very_hard": 0}
    rpe_vals: List[int] = []
    for f in feedbacks:
        felt = (f or {}).get("felt")
        if felt in felt_counts:
            felt_counts[felt] += 1
        rpe = (f or {}).get("rpe")
        if isinstance(rpe, (int, float)):
            rpe_vals.append(int(rpe))
    avg_rpe = sum(rpe_vals) / len(rpe_vals) if rpe_vals else None

    # Bucket decision — simple rule tree
    if completion_pct < 60:
        bucket = "hold"
        min_pct, max_pct = -5, 0
        summary = f"Apenas {completion_pct}% dos treinos concluídos — semana de recuperação."
    elif felt_counts["very_hard"] >= 2 or (avg_rpe and avg_rpe >= 8):
        bucket = "hold"
        min_pct, max_pct = 0, 0
        summary = "Muitos treinos no limite — manter volume e refinar qualidade."
    elif felt_counts["hard"] >= 3 or (avg_rpe and avg_rpe >= 7):
        bucket = "conservative"
        min_pct, max_pct = 3, 7
        summary = "Semana pesada porém sustentável — progressão gentil."
    elif felt_counts["easy"] >= 3 and felt_counts["very_hard"] == 0:
        bucket = "aggressive"
        min_pct, max_pct = 13, 20
        summary = "Semana confortável com margem clara — pode acelerar."
    elif completion_pct >= 85 and (avg_rpe is None or avg_rpe <= 6):
        bucket = "standard"
        min_pct, max_pct = 8, 12
        summary = "Plano cumprido no ponto — progressão padrão."
    else:
        bucket = "conservative"
        min_pct, max_pct = 3, 7
        summary = "Sinais mistos — progressão gentil por segurança."

    return {
        "bucket": bucket,
        "min_pct": min_pct,
        "max_pct": max_pct,
        "summary": summary,
        "completion_pct": completion_pct,
        "avg_rpe": round(avg_rpe, 1) if avg_rpe else None,
    }


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
        temperature: float = 0.6,
    ) -> str:
        if self.provider == "groq":
            return await self._groq_chat(system, messages, max_tokens, temperature)
        if self.provider == "anthropic":
            return await self._anthropic_chat(system, messages, max_tokens, temperature)
        raise RuntimeError(
            "No AI provider configured. Set GROQ_API_KEY or ANTHROPIC_API_KEY in backend/.env"
        )

    async def _anthropic_chat(
        self, system: str, messages: list[dict], max_tokens: int, temperature: float
    ) -> str:
        if not self._anthropic:
            raise RuntimeError("ANTHROPIC_API_KEY not set")
        resp = await self._anthropic.messages.create(
            model=settings.claude_model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
            temperature=temperature,
        )
        return "".join(
            b.text for b in resp.content if getattr(b, "type", "") == "text"
        )

    async def _groq_chat(
        self, system: str, messages: list[dict], max_tokens: int, temperature: float
    ) -> str:
        if not self._groq_key:
            raise RuntimeError("GROQ_API_KEY not set")
        oai_messages = [{"role": "system", "content": system}] + messages
        async with httpx.AsyncClient(timeout=90) as client:
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
                    "temperature": temperature,
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
        training_days: Optional[List[int]] = None,
        long_run_day: Optional[int] = None,
        prior_week: Optional[List[dict]] = None,
    ) -> TrainingPlan:
        weeks_available = self._weeks_until(goal.targetDate) if goal.targetDate else 16
        summary = self._summarize_activities(recent_activities)
        weekly_load = self._weekly_load(recent_activities)
        progression = _compute_progression_bucket(prior_week)

        # Plans ALWAYS start on the next Monday. Never schedule workouts in the
        # past — runs that already happened are pulled from Strava history and
        # shown as completed, not as plan items.
        today = datetime.utcnow().date()
        days_until_plan_week2_start = (7 - today.weekday()) % 7
        if days_until_plan_week2_start == 0:
            days_until_plan_week2_start = 7  # today is Monday → plan starts NEXT Monday
        plan_start = today + timedelta(days=days_until_plan_week2_start)
        plan_week2_start = plan_start + timedelta(days=7)

        schema = {
            "goalType": goal.type,
            "totalWeeks": weeks_available,
            "currentWeek": 1,
            "feasibility": {
                "verdict": "feasible | tight | risky | impossible",
                "reason": "string (1-2 sentences, in pt-BR)",
                "alternative": "string (only if risky/impossible)",
            },
            "weeks": [
                {
                    "weekNumber": 1,
                    "startDate": plan_start.isoformat(),
                    "endDate": (plan_start + timedelta(days=6)).isoformat(),
                    "phase": "base|build|peak|taper|recovery",
                    "totalKm": 30.0,
                    "workouts": [
                        {
                            "id": "w1_mon",
                            "type": "easy_run",
                            "title": "string",
                            "description": "string (aquecimento + principal + volta calma)",
                            "date": plan_start.isoformat(),
                            "targetDistance": 8.0,
                            "targetPace": "5:30",
                            "targetDuration": 45,
                        }
                    ],
                }
            ],
        }

        prompt = f"""Meta do atleta: {goal.type} em {goal.targetDate or 'data não definida'}.
Nível declarado: {fitness_level}. Dias disponíveis/semana: {days_per_week}.
Semanas totais até a meta: {weeks_available}.
Hoje: {today.isoformat()}. Próxima segunda (início do plano): {plan_start.isoformat()}. Semana seguinte: {plan_week2_start.isoformat()}.

Histórico recente (Strava):
{summary}

Carga atual:
- Volume médio semanal (últimas 4 semanas): {weekly_load['chronic']:.1f} km
- Volume últimos 7 dias: {weekly_load['acute']:.1f} km
- ACWR: {weekly_load['acwr']:.2f}

INSTRUÇÕES (CUMPRA TODAS):
1. Retorne EXATAMENTE 2 SEMANAS no array "weeks":
   - weeks[0]: primeira semana, startDate={plan_start.isoformat()}, endDate=domingo dessa semana
   - weeks[1]: segunda semana, startDate={plan_week2_start.isoformat()}, endDate=domingo dessa semana
   NUNCA inclua datas anteriores a {plan_start.isoformat()}. Planos sempre começam
   na próxima segunda-feira — passado é puxado do histórico do Strava, não do plano.
2. Cada semana tem EXATAMENTE 7 workouts, UM POR DIA, datas consecutivas de
   segunda a domingo. Sem pular dia. Dias sem treino usam type="rest" (não omitir).
3. PROGRESSÃO ADAPTATIVA baseada no feedback da semana anterior:
   Bucket atual: {progression['bucket'].upper()} ({progression['min_pct']}% a {progression['max_pct']}%).
   Motivo: {progression['summary']}
   Use essa faixa PARA A PROGRESSÃO DA SEMANA 2 sobre a semana 1 — NÃO aplique
   mais a regra rígida de 10%. A IA deve sentir a cadência do atleta.

   Volume semana 1: baseline = {max(8, weekly_load['chronic']):.0f} km
   (volume médio das últimas 4 semanas, ajustado).
   Volume semana 2: semana 1 × (1 + valor dentro da faixa {progression['min_pct']}-{progression['max_pct']}%).
   Se o bucket for "hold" com valor negativo, é semana de descarga (deload).
4. DIAS DISPONÍVEIS PRO TREINO: {_format_training_days(training_days, days_per_week)}.
   Nos dias FORA dessa lista, o workout OBRIGATORIAMENTE tem type="rest" ou "mobility".
   Nos dias disponíveis, aloque os {days_per_week} treinos de corrida/qualidade.
5. DIA PREFERIDO DO LONGÃO: {_format_weekday(long_run_day)}. Aloque o long_run nesse dia.
6. Periodização — como ainda faltam {weeks_available} semanas:
   - Se >= 12 semanas: ambas as semanas = phase "base" (foco Z2).
   - Se 8-11 semanas: weeks[0]="base", weeks[1]="build".
   - Se 4-7 semanas: ambas "build" ou "peak".
   - Se <= 3 semanas antes da prova: "taper".
7. Long run (longão) máximo 2h30 de duração.
8. Avalie feasibility usando a tabela de semanas mínimas da base:
   5k iniciante=8 / 10k=12 / 21k=16 / 42k=24 / Ultra=24+ (intermediário reduz ~30%).
   Se {weeks_available} < o mínimo recomendado, verdict="risky" ou "impossible"
   e preencha "alternative" com distância menor ou data estendida.
9. Paces realistas baseados no histórico. NÃO invente números muito mais rápidos.
10. IDs únicos por workout (ex: "w1_seg_easy", "w2_dom_long").

Schema (títulos/descrições em pt-BR):
{json.dumps(schema, indent=2, ensure_ascii=False)}

RETORNE APENAS O JSON, começando com {{ e terminando com }}."""

        text = await self._chat_raw(
            PLAN_SYSTEM,
            [{"role": "user", "content": prompt}],
            max_tokens=8192,
            temperature=0.3,
        )
        text = _strip_code_fences(text)

        try:
            data = json.loads(text)
        except json.JSONDecodeError as err:
            print(f"[plan] JSON parse failed: {err}. First 300 chars: {text[:300]!r}")
            return self._fallback_plan(goal, weeks_available, days_per_week, plan_start, weekly_load['chronic'])

        now = datetime.utcnow().isoformat()
        try:
            weeks = [TrainingWeek(**w) for w in data.get("weeks", [])]
        except Exception as err:
            print(f"[plan] TrainingWeek validation failed: {err}. Falling back.")
            return self._fallback_plan(goal, weeks_available, days_per_week, plan_start, weekly_load['chronic'])

        if not weeks:
            return self._fallback_plan(goal, weeks_available, days_per_week, plan_start, weekly_load['chronic'])

        return TrainingPlan(
            id=f"plan_{uuid.uuid4().hex[:10]}",
            goalType=goal.type,
            totalWeeks=weeks_available,
            currentWeek=1,
            startDate=plan_start.isoformat(),
            raceDate=goal.targetDate,
            weeks=weeks,
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
                    "time": "07:00",
                    "name": "Café da manhã",
                    "calories": 600,
                    "carbs": 80,
                    "protein": 30,
                    "fat": 15,
                    "items": [
                        {
                            "category": "Carboidrato complexo",
                            "grams": 60,
                            "options": ["aveia em flocos", "tapioca", "pão integral", "batata-doce"],
                        },
                        {
                            "category": "Proteína magra",
                            "grams": 30,
                            "options": ["claras de ovo", "iogurte grego desnatado", "whey isolate", "queijo cottage"],
                        },
                        {
                            "category": "Gordura boa",
                            "grams": 12,
                            "options": ["pasta de amendoim", "castanhas", "abacate", "chia"],
                        },
                    ],
                }
            ],
            "preRun": {
                "timing": "90 min antes",
                "description": "string",
                "items": [
                    {
                        "category": "CHO de absorção média",
                        "grams": 80,
                        "options": ["aveia + banana", "pão branco com mel", "tapioca com mel"],
                    }
                ],
                "notes": "string",
            },
            "duringRun": {
                "timing": "A cada 45 min",
                "description": "string",
                "items": [
                    {
                        "category": "CHO rápido",
                        "grams": 30,
                        "options": ["gel de carboidrato", "banana madura", "goma energética"],
                    }
                ],
                "notes": "string",
            },
            "postRun": {
                "timing": "Até 30 min após",
                "description": "string",
                "items": [
                    {
                        "category": "CHO + PRO (3:1)",
                        "grams": None,
                        "options": ["whey + suco de uva", "arroz branco + frango", "iogurte + mel + granola"],
                    }
                ],
                "notes": "string",
            },
        }

        workout_detail = (
            f"{workout_type} — {workout_distance_km or '?'} km / "
            f"{workout_duration_min or '?'} min"
        )

        prompt = f"""Data: {date_iso}
Peso do atleta: {weight_kg} kg
Treino de hoje: {workout_detail}
Carga classificada: {load}

INSTRUÇÕES:
1. Siga EXATAMENTE as g/kg da tabela da base de conhecimento para carga "{load}".
2. Cada refeição ("meal") tem um array "items". Cada item é uma CATEGORIA de
   alimento (carboidrato complexo / proteína magra / gordura boa / etc) com 3-5
   opções interchangeable. O usuário pode escolher qualquer uma.
   NUNCA coloque só um alimento como opção — sempre 3-5 alternativas da mesma família.
3. Use alimentos brasileiros comuns, fáceis de achar em mercado.
4. 4-5 refeições: café, lanche manhã (opcional), almoço, lanche tarde, jantar.
5. Se carga = "rest" ou "light": omita preRun, duringRun, postRun (null).
6. Se carga = "moderate", "hard" ou "long_run": preencha os 3 com opções reais.
7. Hidratação em litros (2.5 base, 3.5+ para long_run).

Schema (use os valores calculados em gramas/kg × peso, categorias como no exemplo):
{json.dumps(schema, indent=2, ensure_ascii=False)}

RETORNE APENAS O JSON, começando com {{ e terminando com }}."""

        text = await self._chat_raw(
            NUTRITION_SYSTEM,
            [{"role": "user", "content": prompt}],
            max_tokens=4096,
            temperature=0.4,
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

    def _fallback_plan(
        self,
        goal: UserGoal,
        weeks_available: int,
        days_per_week: int = 5,
        plan_start: Optional[date] = None,
        current_volume_km: float = 30.0,
    ) -> TrainingPlan:
        """Rule-based fallback: 2 reasonable base-phase weeks derived from current volume.
        Used when the LLM returns invalid JSON or empty weeks — still better than empty UI."""
        from app.models.schemas import Workout  # avoid circular import at module load

        now = datetime.utcnow().isoformat()
        if plan_start is None:
            _today = datetime.utcnow().date()
            _gap = (7 - _today.weekday()) % 7
            plan_start = _today + timedelta(days=_gap or 7)
        base_km = max(20.0, min(70.0, current_volume_km * 1.05 if current_volume_km > 0 else 30.0))

        # Default 7-day template for {days_per_week} runs
        # Pattern for 5 running days: easy / easy / tempo / rest / easy / long / mobility
        patterns = {
            3: ["easy_run", "rest", "tempo", "rest", "easy_run", "long_run", "rest"],
            4: ["easy_run", "rest", "tempo", "easy_run", "rest", "long_run", "mobility"],
            5: ["easy_run", "easy_run", "tempo", "rest", "easy_run", "long_run", "mobility"],
            6: ["easy_run", "easy_run", "tempo", "easy_run", "strength", "long_run", "mobility"],
        }
        pattern = patterns.get(days_per_week, patterns[5])

        titles = {
            "easy_run": "Corrida leve",
            "tempo": "Tempo run",
            "long_run": "Longão",
            "interval": "Intervalado",
            "strength": "Força",
            "mobility": "Mobilidade",
            "rest": "Descanso",
        }
        descriptions = {
            "easy_run": "Ritmo conversacional em Z2. Cadência alta, pace confortável.",
            "tempo": "15 min aquecimento · 25-30 min em pace de limiar · 10 min volta calma.",
            "long_run": "Longão em Z2 aeróbico. Teste hidratação e nutrição na corrida.",
            "strength": "Treino de força funcional: agachamento, stiff, core. 40 min.",
            "mobility": "Mobilidade geral 20-30 min, foco em quadril, tornozelo e torácica.",
            "rest": "Descanso total ou caminhada leve 20 min.",
        }

        def week_for(start: date, week_num: int, total_km: float, phase: str) -> TrainingWeek:
            workouts = []
            # Distribute volume across running-type workouts
            run_days = [p for p in pattern if p in {"easy_run", "tempo", "long_run", "interval"}]
            long_share = 0.35 if "long_run" in pattern else 0
            other_share = (1 - long_share) / max(1, len(run_days) - (1 if long_share else 0))

            for i, w_type in enumerate(pattern):
                d = start + timedelta(days=i)
                dist = None
                duration = None
                pace = None
                if w_type == "long_run":
                    dist = round(total_km * long_share, 1)
                    pace = "5:45"
                    duration = int(dist * 6)
                elif w_type in {"easy_run", "tempo", "interval"}:
                    dist = round(total_km * other_share, 1)
                    pace = "5:10" if w_type == "tempo" else "5:30"
                    duration = int(dist * 5.5)
                elif w_type == "strength":
                    duration = 45
                elif w_type == "mobility":
                    duration = 25
                workouts.append(
                    Workout(
                        id=f"w{week_num}_{d.strftime('%a').lower()}",
                        type=w_type,  # type: ignore
                        title=titles[w_type],
                        description=descriptions[w_type],
                        date=d.isoformat(),
                        targetDistance=dist,
                        targetPace=pace,
                        targetDuration=duration,
                        completed=False,
                    )
                )
            return TrainingWeek(
                weekNumber=week_num,
                startDate=start.isoformat(),
                endDate=(start + timedelta(days=6)).isoformat(),
                phase=phase,  # type: ignore
                totalKm=round(total_km, 1),
                workouts=workouts,
            )

        weeks = [
            week_for(plan_start, 1, base_km, "base"),
            week_for(plan_start + timedelta(days=7), 2, round(base_km * 1.1, 1), "base"),
        ]

        return TrainingPlan(
            id=f"plan_{uuid.uuid4().hex[:10]}",
            goalType=goal.type,
            totalWeeks=weeks_available,
            currentWeek=1,
            startDate=plan_start.isoformat(),
            raceDate=goal.targetDate,
            weeks=weeks,
            aiGenerated=False,
            lastUpdated=now,
        )

    def _fallback_nutrition(self, date_iso: str, load: str, weight_kg: float) -> NutritionDay:
        """Rule-based nutrition when the LLM fails — basic meals with food families."""
        carbs_per_kg = {"rest": 4, "light": 4, "moderate": 6, "hard": 8, "long_run": 9}[load]
        protein_per_kg = 1.8 if load in {"hard", "long_run"} else 1.6
        fat_per_kg = 1.2 if load in {"hard", "long_run"} else 1.0

        carbs = int(weight_kg * carbs_per_kg)
        protein = int(weight_kg * protein_per_kg)
        fat = int(weight_kg * fat_per_kg)
        calories = carbs * 4 + protein * 4 + fat * 9

        # Split across 4 meals (25% / 15% / 35% / 25%)
        splits = [0.25, 0.15, 0.35, 0.25]
        meal_names = [
            ("07:00", "Café da manhã"),
            ("10:30", "Lanche da manhã"),
            ("13:00", "Almoço"),
            ("19:30", "Jantar"),
        ]

        cat_carb_complex = FoodCategory(
            category="Carboidrato complexo",
            options=["aveia em flocos", "pão integral", "tapioca", "batata-doce cozida", "arroz integral"],
        )
        cat_carb_simple = FoodCategory(
            category="Carboidrato simples",
            options=["banana madura", "mel", "tâmaras", "suco de uva integral"],
        )
        cat_prot = FoodCategory(
            category="Proteína magra",
            options=["claras de ovo", "iogurte grego desnatado", "whey isolate", "queijo cottage", "peito de frango grelhado"],
        )
        cat_fat = FoodCategory(
            category="Gordura boa",
            options=["pasta de amendoim", "castanha-do-pará", "abacate", "chia", "azeite extra-virgem"],
        )
        cat_fiber = FoodCategory(
            category="Fibras e micronutrientes",
            options=["salada verde", "brócolis", "tomate", "cenoura ralada"],
        )

        meals = []
        for i, (time, name) in enumerate(meal_names):
            share = splits[i]
            meal_items = [cat_carb_complex, cat_prot, cat_fat]
            if i in (2, 3):  # almoço e jantar ganham fibras
                meal_items = [cat_carb_complex, cat_prot, cat_fiber, cat_fat]
            meals.append(
                Meal(
                    time=time,
                    name=name,
                    calories=int(calories * share),
                    carbs=int(carbs * share),
                    protein=int(protein * share),
                    fat=int(fat * share),
                    items=[
                        FoodCategory(
                            category=c.category,
                            grams=round((carbs if "Carboidrato" in c.category else protein if "Proteína" in c.category else fat if "Gordura" in c.category else 0) * share),
                            options=c.options,
                        )
                        for c in meal_items
                    ],
                )
            )

        pre_run = None
        during_run = None
        post_run = None
        if load in {"moderate", "hard", "long_run"}:
            pre_run = MealSuggestion(
                timing="60-90 min antes",
                description="Carboidrato de absorção média + pouca proteína. Sem gordura ou fibra pesada.",
                items=[
                    FoodCategory(
                        category="CHO de absorção média",
                        grams=int(weight_kg * 1),
                        options=["aveia com banana", "pão branco com mel", "tapioca com mel"],
                    ),
                ],
                notes="Hidrate com 400-500ml de água até 30min antes.",
            )
            if load in {"hard", "long_run"}:
                during_run = MealSuggestion(
                    timing="A cada 35-45 min",
                    description="Carboidrato de rápida absorção + eletrólitos.",
                    items=[
                        FoodCategory(
                            category="CHO rápido",
                            grams=30,
                            options=["gel de carboidrato 25g", "banana madura", "goma energética"],
                        ),
                        FoodCategory(
                            category="Eletrólitos",
                            options=["isotônico 250ml", "cápsula de sal + água", "tablete efervescente de eletrólitos"],
                        ),
                    ],
                    notes="Alterne gel e isotônico em corridas > 90min.",
                )
            post_run = MealSuggestion(
                timing="Até 30 min após",
                description="Janela anabólica — 3:1 CHO:PRO pra repor glicogênio.",
                items=[
                    FoodCategory(
                        category="CHO + PRO (3:1)",
                        grams=None,
                        options=["whey isolate + suco de uva", "arroz branco + frango", "iogurte + mel + granola"],
                    ),
                ],
                notes="Reidrate com 150% do peso perdido (pesar antes e depois).",
            )

        return NutritionDay(
            date=date_iso,
            trainingLoad=load,  # type: ignore
            calories=calories,
            carbs=carbs,
            protein=protein,
            fat=fat,
            hydration=3.5 if load in {"hard", "long_run"} else 2.5,
            meals=meals,
            preRun=pre_run,
            duringRun=during_run,
            postRun=post_run,
        )


# Backwards-compat export: routers import `claude_service`
claude_service = AIService()
