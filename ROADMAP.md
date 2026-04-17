# VINCERE — Roadmap

> Status dos recursos planejados para o app.
> Use este documento para saber o que já está pronto, o que está em desenvolvimento e o que está no radar mas ainda não foi implementado.

---

## ✅ v1.0 — MVP (pronto)

### Autenticação
- [x] Login com Strava OAuth (via `expo-auth-session`)
- [x] Tokens persistidos no SecureStore do iOS/keychain Android
- [x] Logout com limpeza total dos dados locais
- [x] Modo Demo em desenvolvimento (bypass Strava para testar tudo)

### Onboarding
- [x] 3 etapas: conectar Strava → escolher meta → definir nível
- [x] 7 tipos de meta: 5k, 10k, 21k, 42k, Ultra, Pace, Mobility
- [x] 4 níveis de fitness (iniciante, intermediário, avançado, elite)
- [x] 3-6 dias de treino por semana

### Telas principais (5 abas)
- [x] **Home** — volume semanal, último treino, insight IA, próximo treino, métricas
- [x] **Plano** — calendário semanal, workouts detalhados
- [x] **Coach** — chat com Claude, quick actions, typing indicator
- [x] **Nutrição** — cardápio + timing pré/durante/pós treino (mockado por ora)
- [x] **Evolução** — gráficos, PRs, CTL/ATL/TSB

### GPS Tracking
- [x] Rastreamento em primeiro plano + segundo plano
- [x] Filtragem de outliers (precisão > 25m rejeitada)
- [x] Pace atual suavizado (janela de 20s)
- [x] Parciais automáticas por km
- [x] Pausa/retomada com anti-toque acidental (long-press 800ms)
- [x] Resumo pós-treino com splits e melhor km

### Integrações
- [x] Apple Health (iOS) — salvar treino
- [x] Google Health Connect (Android) — salvar treino
- [x] Push notifications (expo-notifications)
- [x] Lembrete diário de treino
- [x] Notificação pós-treino

### Backend
- [x] FastAPI com 6 routers (auth, strava, training, coach, nutrition, notifications)
- [x] Claude Sonnet 4.6 para Coach IA em pt-BR
- [x] Geração de plano via Claude (fallback determinístico se falhar)
- [x] PostgreSQL + Redis em Docker Compose

---

## 🚧 v1.1 — Lançamento escalável (próxima sprint)

### 🔴 Autenticação completa (crítico para App Store)

> **Problema atual:** só Strava. Apple Guideline 4.8 exige Sign in with Apple se tem qualquer login social.
> **Problema extra:** tokens só no celular — perdeu o celular, perdeu a conta.

- [ ] **Sign in with Apple** (obrigatório para iOS)
  - Lib: `expo-apple-authentication`
  - Botão na tela de onboarding
  - Backend valida o `identityToken` via Apple public key
- [ ] **Google Sign-In**
  - Lib: `@react-native-google-signin/google-signin`
  - Botão na tela de onboarding (abaixo do Apple)
- [ ] **Email + senha**
  - Tela separada de signup/login
  - Hash com `bcrypt` (passlib)
  - Verificação de email via magic link (opcional)
- [ ] **Strava vira "integração", não login**
  - Usuário cria conta Apple/Google/Email
  - Depois, no onboarding, convida a conectar Strava (opcional)
  - Usuário consegue usar o app sem Strava

### 🔴 Banco de dados de verdade

> **Problema atual:** Postgres existe no Docker mas sem nenhuma tabela. Tudo vive no SecureStore do celular.

- [ ] Criar models SQLAlchemy:
  - `users` (id, email, name, apple_id, google_id, password_hash, created_at, onboarded)
  - `strava_connections` (user_id, access_token, refresh_token, athlete_id, expires_at)
  - `activities` (user_id, type, distance, duration, pace, gps_points, source [vincere/strava])
  - `training_plans` (user_id, goal, weeks, phase, ai_generated, created_at)
  - `workouts` (plan_id, date, type, target_distance, completed, activity_id)
  - `coach_messages` (user_id, role, content, timestamp)
  - `push_tokens` (user_id, token, platform, updated_at)
  - `personal_records` (user_id, distance, time, date, activity_id)
- [ ] Migrations via Alembic
- [ ] JWT para sessão (já tem secret na config, falta implementar)
- [ ] Refresh token rotativo

### Sync entre dispositivos
- [ ] Ao logar em um novo celular, baixar tudo do backend
- [ ] Atividades do VINCERE sincam automaticamente
- [ ] Histórico do Coach preservado
- [ ] Settings seguem o usuário

### 🟡 Upload para Strava
- [ ] Backend endpoint `POST /strava/upload` convertendo GPS points → GPX
- [ ] Botão "Enviar para o Strava" na summary screen passa a funcionar
- [ ] Opção de upload automático nas configurações

### 🟡 Mapa da rota
- [ ] `MapView` (react-native-maps, já instalado)
- [ ] Polyline colorida por pace (rápido = lime, lento = laranja)
- [ ] Marcadores de km
- [ ] Heatmap de elevação (opcional)
- [ ] Compartilhar mapa como imagem

---

## 🔭 v1.2+ — Diferenciais competitivos

### Áudio Coach
- [ ] Avisos a cada km (tempo atual, pace)
- [ ] Alertas de pace-alvo ("acelere", "segura")
- [ ] Texto-para-voz em pt-BR
- [ ] Música ducking durante os avisos

### Análise de treino por IA
- [ ] Após cada treino, Claude gera análise automática
- [ ] Detecta overtraining, fadiga, progressão
- [ ] Ajusta plano da semana seguinte automaticamente
- [ ] Pergunta RPE (percepção de esforço) pós-treino

### Wearables
- [ ] Apple Watch app nativo (Wear OS depois)
- [ ] Controles básicos no pulso (start/pause/stop)
- [ ] Métricas em tempo real
- [ ] Heart rate ao vivo

### Garmin / Polar Connect
- [ ] Import via Garmin Connect API
- [ ] Import via Polar Flow API
- [ ] Alternativa pra quem não usa Strava

### Nutrição real (não mais mock)
- [ ] Cardápio personalizado gerado por Claude
- [ ] Baseado em volume semanal + metabolismo do usuário
- [ ] Dietas: onívoro, vegetariano, vegano, low-carb
- [ ] Integração com app de calorias (MyFitnessPal?)

### Social (decidir se entra)
- [ ] Seguir amigos que usam VINCERE
- [ ] Compartilhar treinos
- [ ] Desafios semanais entre amigos
- [ ] Leaderboards regionais por distância

### Provas e Eventos
- [ ] Calendário de provas no Brasil
- [ ] Inscrição direta (afiliado)
- [ ] Contagem regressiva + taper automático no plano
- [ ] Pós-prova: análise vs predição da IA

---

## 🛠️ Dívida técnica conhecida

### Alta prioridade
- [ ] **Empty states** em todas as telas (parcial — só Home tem)
- [ ] **Error boundaries** React Native para crashes não capturados
- [ ] **Retry automático** com backoff em todas as chamadas de API
- [ ] **Contraste WCAG AA** — `textTertiary` (#6B6B6B) está abaixo do 4.5:1
- [ ] **Nutrition tab** 100% mockada, precisa integrar com backend
- [ ] **Progress tab** gráficos com dados fixos, precisa integrar com store

### Média prioridade
- [ ] Testes E2E com Maestro ou Detox
- [ ] Testes de unidade para utils críticos (geo.ts, formatters)
- [ ] Monitoramento com Sentry
- [ ] Analytics básico (quais features são usadas)

### Baixa prioridade
- [ ] Modo claro (opcional — dark é o padrão do produto)
- [ ] Tradução para inglês (pt-BR é o foco inicial)
- [ ] Tema dinâmico baseado na hora do dia

---

## 📅 Timeline estimado

| Fase | Escopo | Tempo | Quando |
|---|---|---|---|
| **v1.0 Beta privado** | MVP atual, testado no celular | ✅ Pronto | Hoje |
| **v1.1 Auth completa** | Apple/Google/Email + BD real | 1–2 semanas | Próxima sprint |
| **v1.1 App Store submit** | EAS build + revisão Apple | +3–7 dias | Após v1.1 |
| **v1.2 Upload Strava + Mapa** | Polimento pós-lançamento | 2–3 semanas | Mês 2 |
| **v1.3 Apple Watch + Áudio Coach** | Diferenciais | 4–6 semanas | Mês 3 |
