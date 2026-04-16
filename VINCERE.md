# VINCERE — Running Coach App

> Every kilometer is a conquest.

Aplicativo mobile nativo (iOS + Android) de coaching de corrida, com IA Claude, sincronização Strava e plano que se adapta a cada treino.

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Mobile | React Native + Expo (SDK 52) |
| Navigation | Expo Router v4 (file-based) |
| UI | Design system custom + Space Grotesk + Inter |
| Animations | React Native Reanimated 3 |
| Charts | react-native-chart-kit |
| State | Zustand |
| Backend | FastAPI (Python 3.12) |
| AI | Claude Sonnet 4.5 (Anthropic) |
| Auth | Strava OAuth 2.0 |
| Infra | PostgreSQL + Redis + Docker |

---

## Estrutura

```
running-race/
├── mobile/              ← App React Native (Expo)
│   ├── app/             ← Rotas (file-based)
│   │   ├── (auth)/      ← Onboarding: Strava OAuth → meta → nível
│   │   └── (tabs)/      ← Home, Plano, Coach, Nutrição, Evolução
│   └── src/
│       ├── components/  ← UI reutilizável
│       ├── services/    ← Strava API, Backend, Coach
│       ├── stores/      ← Zustand (auth, training)
│       ├── theme/       ← Design system VINCERE
│       ├── mock/        ← Dados de dev
│       └── utils/       ← formatters
│
├── backend/             ← FastAPI + Claude + Strava
│   ├── app/
│   │   ├── routers/     ← /auth, /strava, /training, /coach, /nutrition
│   │   └── services/    ← claude_service, strava_service
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## Rodando localmente

### Backend

```bash
cd backend
cp .env.example .env
# Edite .env com sua STRAVA_CLIENT_SECRET e ANTHROPIC_API_KEY
docker-compose up -d
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Mobile

```bash
cd mobile
npm install
npx expo start
# Escaneie o QR code no celular (Expo Go)
# Ou rode em simulador: `i` (iOS) / `a` (Android)
```

---

## Publicação (App Store / Play Store)

Usamos EAS (Expo Application Services):

```bash
npm install -g eas-cli
eas login
eas build:configure

# iOS (TestFlight)
eas build --platform ios --profile preview
eas submit --platform ios

# Android (Internal Testing)
eas build --platform android --profile preview
eas submit --platform android
```

**Pré-requisitos:**
- Apple Developer Account (US$99/ano)
- Google Play Developer (US$25 único)
- Ícones: 1024×1024 PNG em `mobile/assets/icon.png`

---

## Identidade visual

- **Nome:** VINCERE
- **Tagline:** _Every kilometer is a conquest._
- **Cores principais:**
  - Primary: `#CCFF00` (lime elétrico)
  - Secondary: `#FF5722` (laranja intensidade)
  - Tertiary: `#C4AB04` (mostarda — PRs)
  - Background: `#0A0A0A`
- **Fontes:** Space Grotesk (display) + Inter (body)

---

## Features

### MVP (v1.0)
- [x] Onboarding + Strava OAuth
- [x] Dashboard com volume semanal + último treino
- [x] Plano de treino com fases (base/build/peak/taper)
- [x] Coach IA — chat com Claude
- [x] Nutrição diária baseada em carga
- [x] Evolução com gráficos + PRs
- [x] Insights automáticos do Coach IA
- [x] **GPS tracking in-app** (corrida nativa com background)
- [x] Tela de corrida ativa (distância, tempo, pace atual, pace médio, elevação)
- [x] Parciais automáticas por km
- [x] Resumo pós-treino

### Próximas fases
- [ ] Upload de treino do VINCERE para o Strava
- [ ] Mapa da rota (MapView com polyline)
- [ ] Áudio coach (avisos a cada km, pace alvo)
- [ ] Notificações push (lembretes de treino, insights)
- [ ] Apple Health / Google Fit sync
- [ ] Integração Garmin / Polar
- [ ] Análise de biomecânica (câmera)
- [ ] Comunidade + grupos de treino

---

## Telas

1. **Onboarding** — Login via Strava, escolha de meta, nível
2. **Home** — Volume semanal, último treino, insight IA, treino de hoje, métricas
3. **Plano** — Calendário semanal, workouts detalhados, ajuste via IA
4. **Coach** — Chat com Claude especializado em corrida
5. **Nutrição** — Cardápio + timing do treino (pré/durante/pós)
6. **Evolução** — Gráficos, recordes, CTL/ATL/TSB, projeção da meta

---

## Créditos

Desenvolvido para Victor Gabriel. Design baseado no projeto _Vincere Velocity_ (Google Stitch).
