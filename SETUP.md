# VINCERE — Rodando localmente no VS Code

Este guia é para **você, dono do app**. O usuário final que baixar o VINCERE da loja **nunca vê nada disso** — ele só clica em "Conectar com Strava" e o app funciona.

---

## 1. Pré-requisitos — instale uma vez só

| Software | Versão mínima | Link |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| Docker Desktop | última | https://docker.com/get-started |
| Python | 3.12+ | (só se rodar backend sem Docker) |
| Expo Go | última | App Store / Play Store |

**VS Code Extensions recomendadas:**

Abra o VS Code, pressione `Ctrl+Shift+X` (ou `Cmd+Shift+X` no Mac) e instale:

- `React Native Tools` (Microsoft)
- `Expo Tools` (Expo)
- `ESLint`
- `Prettier - Code formatter`
- `Python` (Microsoft) — para o backend
- `Docker` (Microsoft) — para ver containers rodando
- `Thunder Client` — cliente HTTP para testar a API (alternativa ao Postman)

---

## 2. Configurar credenciais (uma vez só)

### 2.1 Criar API App no Strava

Acesse https://www.strava.com/settings/api e preencha:

- **Application Name**: `Vincere`
- **Category**: `Training`
- **Website**: `https://vincere.app`
- **Authorization Callback Domain**: `localhost` (para testes locais)

O Strava te entrega:
- `Client ID` → público (já está configurado como `216298`)
- `Client Secret` → **secreto**, só no servidor

### 2.2 Obter chave da Anthropic (Claude)

Acesse https://console.anthropic.com/ → **API Keys** → **Create Key**.

---

## 3. Configurar o backend

```bash
cd backend
cp .env.example .env
```

Edite `.env` no VS Code e preencha:

```env
STRAVA_CLIENT_ID=216298
STRAVA_CLIENT_SECRET=cole-seu-client-secret-aqui
ANTHROPIC_API_KEY=sk-ant-api03-cole-aqui
CLAUDE_MODEL=claude-sonnet-4-6
```

---

## 4. Rodar o backend (Docker)

No terminal integrado do VS Code (`Ctrl+` ` `` `):

```bash
# Na raiz do projeto
docker-compose up -d
```

Isso sobe 3 containers: FastAPI (porta 8000), PostgreSQL (5432), Redis (6379).

Confirme que está rodando:
```bash
docker ps
# Ou abra a extensão Docker no VS Code (ícone de baleia na barra lateral)
```

Acesse http://localhost:8000/docs para ver a API interativa.

**Para ver os logs do backend em tempo real:**
```bash
docker-compose logs -f backend
```

---

## 5. Configurar a URL do backend no app

> **Atenção:** No celular físico, `localhost` não aponta para o seu computador.
> Você precisa usar o IP da sua máquina na rede Wi-Fi.

**Como descobrir seu IP local:**
- **Mac/Linux:** `ifconfig | grep "inet " | grep -v 127` → geralmente `192.168.x.x`
- **Windows:** `ipconfig` → procure "Endereço IPv4"

Edite `mobile/app.json`, campo `extra.apiUrl`:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://192.168.1.42:8000"
    }
  }
}
```

> Se for testar no **simulador iOS/Android** (não celular físico), pode usar `http://localhost:8000`.

---

## 6. Rodar o app mobile

```bash
cd mobile
npm install
npx expo start
```

O terminal vai mostrar um **QR code** e um menu:

```
› Metro waiting on exp://192.168.1.42:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

i  ›  Press i │ open iOS simulator
a  ›  Press a │ open Android emulator
w  ›  Press w │ open web browser
```

### Opção A — Celular físico (recomendado para GPS)

1. Instale o app **Expo Go** no seu iPhone ou Android
2. Certifique que o celular está **na mesma rede Wi-Fi** do computador
3. **iPhone:** abra a câmera e aponte para o QR code
4. **Android:** abra o Expo Go e toque em "Scan QR Code"

### Opção B — Simulador iOS (Mac com Xcode)

Pressione `i` no terminal do Expo. O simulador abre automaticamente.

> Instale o Xcode pela App Store (gratuito, ~15 GB). Depois:
> ```bash
> xcode-select --install
> sudo xcodebuild -license accept
> ```

### Opção C — Emulador Android (qualquer OS)

1. Instale o [Android Studio](https://developer.android.com/studio)
2. Em Tools → Device Manager → crie um Pixel 8 API 35
3. Inicie o emulador
4. Pressione `a` no terminal do Expo

---

## 7. Fluxo de desenvolvimento típico

Abra **3 terminais** no VS Code (ícone `+` na barra de terminais):

| Terminal | Comando | Para quê |
|---|---|---|
| 1 | `docker-compose up` | Backend + banco |
| 2 | `cd mobile && npx expo start` | App mobile (hot reload) |
| 3 | (livre) | git, testes, etc |

O Expo tem **hot reload**: salve qualquer arquivo `.tsx` e o app atualiza instantaneamente no celular sem recompilar.

**Para forçar um reload completo:** agite o celular → "Reload" no menu dev.

---

## 8. Testando funcionalidades específicas

### Strava OAuth
> Requer o backend rodando E o `apiUrl` apontando para seu IP local.
> O redirect vai funcionar porque o Strava permite `localhost` como callback domain em modo de desenvolvimento.

### GPS Tracking
> Funciona melhor no celular físico. No simulador, o GPS é simulado.
> Em `mobile/app/run/index.tsx`, aguarde o sinal GPS ficar verde antes de iniciar.

### Push Notifications
> Não funcionam no Expo Go em simulador. Para testar de verdade, use um **dev build**:
> ```bash
> npx expo run:ios   # compila e instala no simulador
> npx expo run:android
> ```

### Apple Health / Google Health
> Requer dev build (não funciona no Expo Go). Execute:
> ```bash
> npx expo run:ios
> ```

---

## 9. Como o Strava funciona para o usuário final

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

## 10. Deploy em produção

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

## 11. Checklist antes de publicar

- [ ] `STRAVA_CLIENT_SECRET` no backend (não commitado, em `.env` local + Railway secrets)
- [ ] `ANTHROPIC_API_KEY` no backend
- [ ] `Authorization Callback Domain` no painel Strava = domínio do backend em produção
- [ ] `apiUrl` em `mobile/app.json` apontando para o backend em produção (HTTPS)
- [ ] Ícone 1024x1024 em `mobile/assets/icon.png`
- [ ] Splash em `mobile/assets/splash.png`
- [ ] Bundle ID em `app.json` reservado na Apple + Google
- [ ] Privacy Policy + Terms publicados (obrigatório para app store)
