from datetime import datetime
from fastapi import APIRouter, HTTPException

from app.models.schemas import NutritionDay, Meal, MealSuggestion

router = APIRouter()


@router.get("/today", response_model=NutritionDay)
async def today():
    """
    Returns today's nutrition plan. In production this is computed from:
    - Today's workout (carb/calorie load)
    - Athlete's weight & goal
    - Recent training stress
    """
    today_iso = datetime.utcnow().date().isoformat()
    return NutritionDay(
        date=today_iso,
        trainingLoad="moderate",
        calories=2850,
        carbs=420,
        protein=130,
        fat=80,
        hydration=3.2,
        meals=[
            Meal(
                time="07:00",
                name="Café da manhã",
                calories=620,
                carbs=90,
                protein=28,
                fat=18,
                foods=["Aveia com banana", "Ovos mexidos", "Café preto"],
            ),
            Meal(
                time="10:30",
                name="Lanche pré-treino",
                calories=280,
                carbs=55,
                protein=8,
                fat=4,
                foods=["Banana", "Tâmaras", "Pasta de amendoim"],
            ),
            Meal(
                time="13:00",
                name="Almoço",
                calories=820,
                carbs=110,
                protein=40,
                fat=22,
                foods=["Arroz integral", "Frango grelhado", "Salada verde", "Batata doce"],
            ),
            Meal(
                time="16:30",
                name="Lanche pós-treino",
                calories=420,
                carbs=60,
                protein=30,
                fat=10,
                foods=["Shake de whey", "Aveia", "Mel", "Frutas vermelhas"],
            ),
            Meal(
                time="20:00",
                name="Jantar",
                calories=710,
                carbs=95,
                protein=35,
                fat=22,
                foods=["Macarrão integral", "Molho com carne", "Legumes"],
            ),
        ],
        preRun=MealSuggestion(
            timing="90 min antes",
            description="Carboidratos de digestão lenta + dose de cafeína.",
            foods=["Aveia", "1 banana", "Café"],
            notes="Evite gorduras e fibras pesadas. Hidrate-se com 500ml de água.",
        ),
        duringRun=MealSuggestion(
            timing="A cada 35-45 min",
            description="Carboidratos de rápida absorção.",
            foods=["Gel 25g carbo", "150ml isotônico"],
            notes="Alterne gel e isotônico em corridas > 90min.",
        ),
        postRun=MealSuggestion(
            timing="Até 30 min após",
            description="Janela anabólica — reponha glicogênio e acelere recuperação.",
            foods=["Whey 30g", "Banana", "Tâmaras"],
            notes="Proporção 3:1 carbo:proteína. Reidrate com 150% do peso perdido.",
        ),
    )
