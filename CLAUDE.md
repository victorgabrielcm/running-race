# VINCERE — Running Training App

## Projeto

App de treino de corrida com IA, conectado ao Strava. Stack:

- **Mobile**: React Native + Expo SDK 52, Expo Router v4, TypeScript
- **Backend**: FastAPI (Python), PostgreSQL, Redis, Docker Compose
- **IA**: Anthropic Claude (claude-sonnet-4-5) para coach e geração de plano

## Como rodar

### Backend
```bash
cd backend
cp .env.example .env          # preenche STRAVA_CLIENT_SECRET e ANTHROPIC_API_KEY
docker compose up             # sobe Postgres + Redis + FastAPI na porta 8000
```

### Mobile (iOS Simulator)
```bash
open -a Simulator              # abre o simulador ANTES
cd mobile
cp .env.example .env.local     # ou cria com EXPO_PUBLIC_API_URL=http://localhost:8000
npx expo start -c              # -c limpa cache
# aperta "i" no terminal
```

## Strava OAuth — como funciona

Strava não aceita custom schemes (`vincere://`) como redirect URI — só hosts HTTP.

**Fluxo atual:**
1. App abre `https://www.strava.com/oauth/mobile/authorize?redirect_uri=http://localhost:8000/auth/strava/callback&...`
2. Strava redireciona para `GET /auth/strava/callback?code=...` no backend
3. Backend troca o `code` por tokens (mantém `client_secret` seguro)
4. Backend redireciona para `vincere://strava/callback?data=<base64(tokens)>`
5. App (via `openAuthSessionAsync`) captura o deep link e decodifica os tokens

**Configuração Strava:**
- "Authorization Callback Domain" no painel Strava = `localhost`
- `STRAVA_CLIENT_SECRET` em `backend/.env`

## Estrutura dos arquivos principais

```
mobile/
  app/
    _layout.tsx            # root: hydrate auth, redirect logic
    (auth)/
      _layout.tsx
      index.tsx            # onboarding: Strava connect + demo mode
      goal.tsx             # step 1: escolha de meta
      profile.tsx          # step 2: nível + dias de treino
    (tabs)/
      index.tsx            # dashboard
      training.tsx         # plano semanal
      coach.tsx            # chat com IA
      nutrition.tsx        # nutrição
      progress.tsx         # gráficos
    activities.tsx         # histórico completo com agrupamento mensal
    settings.tsx           # configurações + logout
    run/
      index.tsx            # pré-corrida (GPS + modo)
      active.tsx           # corrida em andamento (cronômetro + mapa)
      summary.tsx          # resumo pós-corrida

  src/
    services/
      api.ts               # axios base (EXPO_PUBLIC_API_URL)
      strava.ts            # OAuth + fetch activities
      coach.ts             # sendCoachMessage, generateTrainingPlan
      locationService.ts   # GPS tracking + background task
      notificationService.ts
      healthService.ts
    stores/
      authStore.ts         # tokens + user (SecureStore)
      trainingStore.ts     # activities + plan
      runStore.ts          # estado da corrida ativa
      settingsStore.ts     # notif + health sync
    types/index.ts         # todas as interfaces TypeScript
    mock/data.ts           # 23 atividades fake + mockPlan + mockInsight
    components/
      WorkoutCard.tsx
      ActivityRow.tsx
      AIInsightCard.tsx
      StartRunFAB.tsx
      ui/Button.tsx, Text.tsx, ProgressBar.tsx

backend/
  app/
    main.py                # FastAPI app + CORS
    config.py              # pydantic-settings (lê .env)
    routers/
      auth.py              # POST /auth/strava/exchange, GET /auth/strava/callback
      strava.py            # GET /strava/activities, GET /strava/activities/{id}
      coach.py             # POST /coach/message, POST /coach/plan
    services/
      strava_service.py    # troca code, refresh token, fetch activities
    models/schemas.py      # Pydantic schemas
```

## Auth Store — lógica de redirecionamento

```ts
// _layout.tsx
isAuthenticated = !!tokens && !!user?.onboarded

// Fluxo:
// tokens=null               → /(auth)/index  (conectar Strava)
// tokens=set, onboarded=false → /(auth)/goal  → /(auth)/profile
// tokens=set, onboarded=true  → /(tabs)
```

## Estado atual do app

### Funcionando
- [x] Strava OAuth completo (connect → goal → profile → dashboard)
- [x] Fetch de histórico completo Strava (~6 meses, 600 runs, paginado)
- [x] Histórico (`/activities`) com agrupamento mensal + totals
- [x] Coach IA (chat via backend) com **Groq Llama 3.3 70B (grátis)** ou Claude
- [x] **Plano de treino gerado pela IA** com RAG (KB de fisiologia + nutrição)
  - Sempre começa na próxima segunda (nunca passado)
  - Respeita ACWR, viabilidade de meta, dias de treino do usuário
  - 2 semanas por vez (current + next), consistente (temp 0.3)
  - Gate de 6 dias pra não regenerar no impulso
- [x] **Nutrição real via IA** — macros g/kg por carga de treino do dia,
  **famílias de alimentos** (3-5 opções por categoria em vez de item fixo)
- [x] Training tab com navegação semanal + datas nos cards + glossário
- [x] Progress com PRs verticais (1km/5k/10k/21k/42k/Ultra) + gráficos reais
- [x] Dashboard com weekly stats reais + AI insight diária
- [x] Perfil com seletor de dias de treino (SEG-DOM) + dia do longão
- [x] GPS tracking (run flow) — telas index/active/summary existem
- [x] Settings com notifications + health sync + logout
- [x] "INICIAR TREINO" no WorkoutCard → /run

### Arquitetura de IA (RAG mínimo via prompt injection)

```
backend/app/
  knowledge/
    training_physiology.md   # zonas, VDOT, ACWR, tapering, tabela semanas mínimas
    nutrition_protocols.md   # macros g/kg, timing, carbo-loading, matriz treino↔dieta
  services/claude_service.py # AIService — dispatch Groq/Anthropic, injeta KB nos prompts
    COACH_SYSTEM    → KB_training + KB_nutrition (chat)
    PLAN_SYSTEM     → KB_training               (gera plano)
    INSIGHT_SYSTEM  → KB_training               (insight diário)
    NUTRITION_SYSTEM→ KB_nutrition              (cardápio do dia)
```

Provider por `AI_PROVIDER` env: `groq` (default, grátis) ou `anthropic`.
Se a key de um faltar, faz fallback pro outro.

### Pendente / Próximas iterações
- [ ] Múltiplos treinos por dia (corrida + musculação no mesmo dia)
- [ ] Relatório automático no fim da semana com próxima semana já gerada
- [ ] Persistência do plano no backend (DB) — agora é só local
- [ ] Ajuste dinâmico quando o user pula treino / faz performance muito acima/abaixo
- [ ] Mapa na tela de corrida ativa (run/active.tsx)
- [ ] Push notifications (precisa dev build, não roda em Expo Go)
- [ ] Vector search na KB quando passar de 20KB por doc

## Configuração do .env (backend)

```bash
# AI — pega key grátis em console.groq.com/keys
AI_PROVIDER=groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Anthropic (opcional, só se AI_PROVIDER=anthropic)
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-5

# Strava
STRAVA_CLIENT_ID=216298
STRAVA_CLIENT_SECRET=...

# Infra
DATABASE_URL=postgresql+asyncpg://vincere:vincere@db:5432/vincere
REDIS_URL=redis://redis:6379/0
```

## Branch de desenvolvimento

```
claude/running-training-app-AH33y
```

## Problemas conhecidos

### "Continuar" na tela de Goal não funciona
**Causa:** SecureStore tem tokens de uma sessão anterior, mas `user` é `null`.  
**Fix (já comitado):** `goal.tsx` e `profile.tsx` constroem o UserProfile a partir de `tokens.athlete` se `user` for null. Não depende mais que `user` exista.

### Simulador iOS — GPS
`probeGpsSignal()` pode demorar alguns segundos no simulador. O botão "Iniciar corrida" fica desabilitado até o probe terminar (resolve para `lost` → habilita).

## Commits recentes

- `f3419a1` — Histórico completo Strava + plano só na próxima segunda + dias de treino + glossário
- `a8dc453` — Fix plan gen truncado + nutrição com famílias de alimentos
- `6504120` — Progress: meta ≠ volume semanal + PRs como lista vertical
- `aeec8fd` — RAG básico + viabilidade de meta + nutrição cruzada treino↔dieta
- `8e5ea98` — Training: calendário sincronizado + navegação semanal + datas nos cards
- `8479db1` — Groq como provider grátis (default)
- `7756bb3` — Dashboard/progress/training com dados reais do Strava + IA
