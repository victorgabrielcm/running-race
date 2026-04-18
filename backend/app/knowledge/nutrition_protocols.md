# Manual de Lógica — Nutrição e Suplementação

Base de conhecimento técnica para geração de planos nutricionais diários.

## 1. Escalonamento de Macros (g por kg de peso corporal)

A ingestão é variável dependente da intensidade do treino do dia.

| Cenário        | Treino                 | CHO         | PRO          | FAT       |
|----------------|------------------------|-------------|--------------|-----------|
| Dia Leve       | Descanso / Z1 / Z2     | 3 – 5 g/kg  | 1.6 g/kg     | ~1.0 g/kg |
| Dia Moderado   | Z3 / Tempo run         | 5 – 7 g/kg  | 1.6 g/kg     | ~1.2 g/kg |
| Dia Intenso    | Z4 – Z5 / Longão       | 7 – 10 g/kg | 1.8 – 2.0 g/kg | ~1.5 g/kg |

Calorias: CHO = 4 kcal/g, PRO = 4 kcal/g, FAT = 9 kcal/g.

## 2. Catálogo de Referência

### CHO Complexos (lenta absorção)
- Aveia, batata-doce, arroz integral, quinoa, grão-de-bico

### CHO Simples (rápida absorção / baixo resíduo)
- Mel, banana madura, arroz branco, massa branca, gel de carboidrato

### Proteínas de alta qualidade
- Whey isolate, claras de ovo, peito de frango, iogurte grego desnatado, tilápia/peixe branco

### Substituições equivalentes

| Original         | Opção 1          | Opção 2              | Racional                    |
|------------------|------------------|----------------------|-----------------------------|
| Batata-doce      | Mandioca cozida  | Aveia em flocos      | CHO Complexo                |
| Arroz branco     | Massa branca     | Pão de forma branco  | CHO Simples / Baixo Resíduo |
| Frango grelhado  | Tilápia          | Clara de ovo         | PRO Magra                   |

## 3. Protocolo de Timing

| Janela       | Tempo              | Meta                              | Sugestão Prática                          |
|--------------|--------------------|-----------------------------------|-------------------------------------------|
| Pré-Treino   | 90 – 120 min antes | 1–4 g/kg CHO + 0.3 g/kg PRO       | Panqueca de aveia com mel e banana        |
| Intra-Treino | A cada 45 min      | 30 – 90 g CHO/hora                | 1–2 géis de CHO + 250 ml água             |
| Pós-Treino   | Até 60 min após    | 1.2 g/kg CHO + 0.4 g/kg PRO       | Whey + suco de uva OU arroz + frango      |

### Estratégias por duração
- **< 60 min:** apenas água se bem hidratado.
- **60 – 90 min:** 30 – 60 g CHO/hora.
- **> 90 min:** 60 – 90 g CHO/hora (mistura glicose:frutose 2:1 ou 1:0.8).

## 4. Hidratação e Eletrólitos

Base: taxa de sudorese ~1 L/hora (individual: `Peso Pré − Peso Pós + Fluidos ingeridos`).

- **Sódio (Na+):** 300 – 700 mg/hora (até 1500 mg/L para "Salty Sweaters")
- **Potássio (K+):** 150 – 300 mg/hora
- **Magnésio (Mg++):** 50 – 100 mg pós-treino (relaxamento muscular)

## 5. Carbo-loading (Supercompensação)

Destinado a provas > 90 minutos (Meia e Maratona).

- **Janela:** 36 – 48h pré-largada
- **Alvo:** 10 – 12 g CHO/kg/dia
- **Regra de baixo resíduo:** eliminar fibras (vegetais crus, cascas) e gorduras para evitar desconforto GI
- **Fator água:** cada grama de glicogênio armazena 3 g de água → ganho esperado de 1–2 kg

## 6. Matriz de Decisão Diária (Sincronização Treino ↔ Dieta)

Regra de ouro: **o dia da dieta é ditado pelo treino do dia.**

```
IF workout = long_run OR workout.zone IN (Z4, Z5)  THEN
    macros = HIGH_CARB (7–10 g/kg CHO)
    alert  = "Intra-workout fuel necessário"
    hydration = protocolo completo de eletrólitos

ELIF workout = tempo OR workout.zone = Z3          THEN
    macros = MODERATE (5–7 g/kg CHO)

ELIF workout IN (recovery, easy_run)               THEN
    macros = LIGHT (3–5 g/kg CHO)

ELSE (rest / mobility)                             THEN
    macros = LOW_CARB (3–5 g/kg CHO)
    foco em PRO + FAT para recuperação
END
```

## 7. Saída para o App

Ao gerar o plano nutricional do dia, o sistema deve retornar:
- Calorias totais estimadas
- Macros em gramas (CHO, PRO, FAT)
- Carga de treino do dia: `rest | light | moderate | hard | long_run`
- 3–5 refeições com horário, nome, macros e lista de alimentos
- Sugestões pré, intra e pós-treino (se o dia tiver treino)
- Alvo de hidratação em litros
