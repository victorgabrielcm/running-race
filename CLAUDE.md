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
- [x] Fetch de atividades reais do Strava
- [x] Histórico (`/activities`) com agrupamento mensal + totals
- [x] Coach IA (chat com Claude via backend)
- [x] Plano de treino (mock + geração via IA)
- [x] GPS tracking (run flow) — telas index/active/summary existem
- [x] Settings com notifications + health sync + logout
- [x] Demo mode (botão dev na tela de login)
- [x] "INICIAR TREINO" no WorkoutCard → /run
- [x] AIInsightCard no dashboard → aba Coach

### Pendente / Melhorias futuras
- [ ] Weekly Stats do dashboard baseados nos dados reais do Strava (atualmente mock)
- [ ] Gráficos de progresso na aba Progress (actualmente skeleton)
- [ ] Nutrição na aba Nutrition (actualmente mock)
- [ ] Mapa na tela de corrida ativa (run/active.tsx)
- [ ] Persistência do plano de treino no backend (agora só local)
- [ ] Push notifications funcionando em build de desenvolvimento

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

- `5599b9c` — Make goal/profile screens resilient to missing user
- `6bdd899` — Fix broken buttons across onboarding and dashboard
- `787f0b8` — Add backend OAuth callback + fix Strava redirect_uri
- `df35241` — Activity history screen + 23 mock activities
