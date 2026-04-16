# VINCERE — Setup de desenvolvedor (faz uma vez)

Este guia é para **você, dono do app**. O usuário final que baixar o VINCERE da loja **nunca vê nada disso** — ele só clica em "Conectar com Strava" e o app funciona.

---

## O que você precisa configurar (uma vez só)

### 1. Criar uma API App no Strava

Acesse https://www.strava.com/settings/api

Preencha:
- **Application Name**: `Vincere`
- **Category**: `Training`
- **Website**: `https://vincere.app` (ou o seu domínio)
- **Application Description**: `Coach de corrida com IA`
- **Authorization Callback Domain**: `vincere.app` (ou o domínio que vai hospedar o backend)

Após criar, o Strava te entrega:
- `Client ID` → **público**, pode ficar no app (já está: `216298`)
- `Client Secret` → **privado**, só no servidor (nunca no app!)

### 2. Obter chave da Anthropic (Claude)

Acesse https://console.anthropic.com/ → **API Keys** → **Create Key**.

Copia a chave `sk-ant-api03-...`.

### 3. Configurar o backend

```bash
cd backend
cp .env.example .env
nano .env
```

Preenche:
```env
STRAVA_CLIENT_ID=216298
STRAVA_CLIENT_SECRET=cole-seu-client-secret-aqui
ANTHROPIC_API_KEY=sk-ant-api03-cole-aqui
CLAUDE_MODEL=claude-sonnet-4-5
```

### 4. Rodar o backend

```bash
docker-compose up -d
# Backend escutando em http://localhost:8000
# Docs interativas: http://localhost:8000/docs
```

### 5. Apontar o app para o backend

Em `mobile/app.json`, no campo `extra.apiUrl`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://SEU-IP-LOCAL:8000"
    }
  }
}
```

Para testar no celular físico (não emulador), use o IP da sua máquina na rede Wi-Fi (`192.168.x.x`), **não** `localhost`.

Em produção, use sua URL pública: `https://api.vincere.app`.

### 6. Rodar o app

```bash
cd mobile
npm install
npx expo start
```

Escaneia o QR code com o **Expo Go** no iPhone/Android.

---

## O que acontece quando o usuário clica em "Conectar com Strava"

```
┌─────────────┐           ┌──────────────┐           ┌────────────┐
│  App VINCERE│           │ Strava OAuth │           │   Backend  │
│ (no celular)│           │   (browser)  │           │ (servidor) │
└──────┬──────┘           └──────┬───────┘           └──────┬─────┘
       │                         │                          │
       │  1. abre browser        │                          │
       ├────────────────────────>│                          │
       │                         │                          │
       │  2. usuário faz login   │                          │
       │     e autoriza          │                          │
       │                         │                          │
       │  3. Strava retorna      │                          │
       │     "code" temporário   │                          │
       │<────────────────────────┤                          │
       │                         │                          │
       │  4. envia o code        │                          │
       │     pro nosso backend   │                          │
       ├─────────────────────────┴─────────────────────────>│
       │                                                    │
       │                              5. backend troca      │
       │                                 code + SECRET por  │
       │                                 tokens na Strava   │
       │                                                    │
       │  6. recebe access_token + refresh_token            │
       │<───────────────────────────────────────────────────┤
       │                                                    │
       │  7. salva tokens no                                │
       │     SecureStore (iOS keychain)                     │
       │                                                    │
       │  8. sincroniza atividades                          │
```

O **client_secret nunca sai do seu servidor**. O usuário final nunca precisa configurar nada.

---

## Deploy em produção

### Backend (Railway / Render / Fly.io)

```bash
# Com Railway
railway login
railway init
railway up

# Variáveis de ambiente no painel:
#   STRAVA_CLIENT_SECRET, ANTHROPIC_API_KEY, etc.
```

Depois, atualize em `mobile/app.json`:
```json
"apiUrl": "https://vincere-api.up.railway.app"
```

E no Strava (painel de API), atualize o **Authorization Callback Domain** para o domínio final.

### Mobile (App Store + Play Store)

```bash
npm install -g eas-cli
eas login
eas build:configure

# iOS TestFlight
eas build --platform ios --profile preview
eas submit --platform ios

# Android Internal Testing
eas build --platform android --profile preview
eas submit --platform android
```

---

## Checklist antes de publicar

- [ ] `STRAVA_CLIENT_SECRET` no backend (não commitado, em `.env` local + Railway secrets)
- [ ] `ANTHROPIC_API_KEY` no backend
- [ ] `Authorization Callback Domain` no painel Strava = domínio do backend em produção
- [ ] `apiUrl` em `mobile/app.json` apontando para o backend em produção (HTTPS)
- [ ] Ícone 1024x1024 em `mobile/assets/icon.png`
- [ ] Splash em `mobile/assets/splash.png`
- [ ] Bundle ID em `app.json` reservado na Apple + Google
- [ ] Privacy Policy + Terms publicados (obrigatório para app store)
