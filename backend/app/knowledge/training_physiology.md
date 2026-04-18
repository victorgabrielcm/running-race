# Manual de Lógica — Treinamento e Fisiologia

Base de conhecimento técnica para geração de planos e análise de performance.

## 1. Pilares do Treinamento e Fisiologia

A prescrição de carga baseia-se na sincronização entre carga externa (ritmo/volume) e resposta fisiológica interna (FC).

### A. Zonas de Intensidade (Método Karvonen — FC de Reserva)

Fórmula: `FC Alvo = ((FC Máx − FC Repouso) × %Intensidade) + FC Repouso`

| Zona | % FCR      | Aplicação                                          | % VO2Max   |
|------|------------|----------------------------------------------------|------------|
| Z1   | 50 – 60%   | Recuperação ativa, remoção de resíduos             | < 59%      |
| Z2   | 60 – 70%   | Base aeróbica, oxidação de gordura                 | 59 – 74%   |
| Z3   | 70 – 80%   | Limiar aeróbico / Ritmo de Maratona                | 75 – 84%   |
| Z4   | 80 – 90%   | Limiar anaeróbico / Tolerância ao lactato          | 83 – 88%   |
| Z5   | 90 – 100%  | Potência aeróbica máxima (VO2Max)                  | 95 – 100%  |

### B. Padrões de Treino (Classificação Daniels/VDOT)

| Tipo          | Volume Semanal | %VO2Max     | Objetivo                                             |
|---------------|----------------|-------------|------------------------------------------------------|
| Easy (E)      | Base do volume | 59 – 74%    | Miocárdio, capilarização, resistência a lesões       |
| Marathon (M)  | < 20%          | 75 – 84%    | Ritmo de prova, economia de combustível              |
| Threshold (T) | ~10%           | 83 – 88%    | Remoção de lactato                                   |
| Interval (I)  | ~8%            | 95 – 100%   | Potência aeróbica (VO2Max)                           |
| Repetition (R)| ~5%            | > 100%      | Velocidade, potência anaeróbica, economia            |

### C. Eficiência Mecânica (BI-Check)

- **Cadência ideal:** 170 – 185 spm
- **Oscilação vertical:** 6.0 – 9.0 cm (acima de 10 cm = desperdício energético)
- **Tempo de contato (GCT):** 200 – 250 ms
- **Pisada:** Médio-pé (midfoot) — melhor economia e menor risco de lesão

#### Correções neuromusculares
- Cadência < 165 spm → metrônomo em +5% da cadência atual
- GCT > 300 ms → drills pliométricos (pogo hops, corda)
- Oscilação > 10 cm → leve inclinação para frente a partir dos tornozelos

## 2. Periodização e Progressão

### A. Regras de Progressão
- **Aumento de volume:** ~10%/semana em condições padrão. Atletas experientes podem ir a 1.25× em fases iniciais com intensidade baixa.
- **Distribuição de intensidade (piramidal):** 80% em Z1–Z2, 20% em Z3–Z5.
- **Limite de sessão longa:** não exceder 2h30 em treinos longos (L).

### B. ACWR — Acute:Chronic Workload Ratio (Gestão de Risco)

Carga aguda (7 dias) / Carga crônica (28 dias):

| ACWR         | Status         | Ação                                              |
|--------------|----------------|---------------------------------------------------|
| < 0.80       | Subtreinamento | Aumentar volume gradual (≤10%/semana)             |
| 0.80 – 1.30  | Sweet Spot     | Manter progressão planejada                       |
| 1.31 – 1.50  | Cuidado        | Congelar volume; manter carga estável             |
| > 1.50       | Perigo         | Reduzir 20 – 30% no volume imediatamente          |

### C. Protocolo de Tapering (Semana de Prova)

Objetivo: reduzir fadiga mantendo prontidão neuromuscular.

- **10–14 dias antes:** início da redução sistemática
- **7–10 dias antes:** reduzir quilometragem semanal total em 20–30%
- **4–6 dias antes:** reduzir volume em 50%; 1–2 sessões de polimento com intervalos curtos no ritmo da prova
- **48h antes:** descanso total ou trote leve (15–20 min) com 2–3 strides de ativação

## 3. Lógica de Ajuste Dinâmico (Feedback Loop)

### Tratamento de desvios e sessões perdidas
- **1–2 dias inativo:** retomar plano original sem tentar compensar volume perdido.
- **3–7 dias inativo:** redistribuir 50–75% do volume perdido nas próximas 4–6 semanas.
- **> 10 dias inativo:** reduzir volume e intensidade (decaimento de ~10%/semana). Reiniciar fase de base.

### Ajustes por feedback
- **Queda de performance (>5% mais lento):** reduzir intensidade da próxima sessão de qualidade em 1 nível.
- **Cansaço extremo (RPE >8 em treino Z2):** converter próximo treino em Z1 ou descanso total.
- **Overperformance (>5% mais rápido que planejado por 3 sessões):** recalibrar VDOT e zonas de ritmo.

## 4. Avaliação de Viabilidade de Meta

Ao receber uma meta do usuário (distância + data), o sistema deve avaliar:

1. **Semanas disponíveis** até a data-alvo.
2. **Semanas mínimas recomendadas** por tipo de prova e nível:

| Prova    | Iniciante | Intermediário | Avançado |
|----------|-----------|---------------|----------|
| 5k       | 8 sem     | 6 sem         | 4 sem    |
| 10k      | 12 sem    | 8 sem         | 6 sem    |
| 21k      | 16 sem    | 12 sem        | 10 sem   |
| 42k      | 24 sem    | 18 sem        | 16 sem   |
| Ultra    | 24+ sem   | 20 sem        | 16 sem   |

3. **Veredito:**
   - `feasible` — tempo >= mínimo recomendado
   - `tight` — tempo 70–100% do mínimo; possível com disciplina e sem erros
   - `risky` — tempo 40–70% do mínimo; alto risco de lesão ou não completar
   - `impossible` — tempo < 40% do mínimo; recomendar meta alternativa

4. **Meta alternativa:** se `risky` ou `impossible`, sugerir distância menor ou prorrogar data.

5. **Volume inicial:** basear no volume semanal atual do usuário (últimos 28 dias). Nunca prescrever aumento >10% na primeira semana.
