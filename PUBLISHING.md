# VINCERE — Publicação nas lojas

> Guia passo-a-passo pra subir o app pro **App Store** (iOS) e **Google Play** (Android).
> Não precisa fazer agora — esse doc é pra quando o `v1.1` estiver pronto (auth completa + banco de dados).

---

## 🗓️ Ordem recomendada

1. **Primeiro:** terminar v1.1 (Sign in with Apple + Google + Email, banco de dados real). Ver `ROADMAP.md`.
2. Comprar as contas de desenvolvedor (Apple + Google).
3. Preparar assets (ícone, screenshots, textos).
4. Gerar build com **EAS Build** (Expo).
5. Submeter pra revisão.
6. Aguardar aprovação (Apple: 1–3 dias; Google: algumas horas a 2 dias).

---

## 💰 Custos

| Item | Preço | Periodicidade |
|---|---|---|
| Apple Developer Program | **US$ 99** (~R$ 550) | por ano |
| Google Play Developer | **US$ 25** (~R$ 140) | uma vez (pra sempre) |
| EAS Build (Expo) | **Grátis** no plano Free (30 builds/mês) | — |
| Certificados / APNs | Grátis (EAS gerencia) | — |
| **Total ano 1** | ~R$ 700 | — |

---

## 🍎 Apple App Store

### 1. Criar conta Apple Developer
- Acessar https://developer.apple.com/programs/enroll/
- Precisa de **Apple ID com autenticação de dois fatores**
- Pra pessoa física: CPF + comprovante de identidade
- Pra empresa (recomendado mais pra frente): precisa de **D-U-N-S Number** (grátis, demora 1–2 semanas)
- Pagamento: US$ 99 no cartão internacional
- Aprovação: 24–48h

### 2. Configurar App Store Connect
- Acessar https://appstoreconnect.apple.com
- Criar novo app:
  - Nome: **VINCERE — Coach de Corrida**
  - Bundle ID: `com.vincere.app` (precisa estar registrado no Developer Portal primeiro)
  - Idioma primário: **Português (Brasil)**
  - SKU: `vincere-ios-001` (qualquer string única)

### 3. Informações obrigatórias
- [ ] **Ícone do app**: 1024×1024 PNG sem transparência, sem cantos arredondados (Apple arredonda)
- [ ] **Screenshots** (obrigatório pelo menos 1 tamanho):
  - iPhone 6.7" (1290×2796) — iPhone 14/15/16 Pro Max — **pelo menos 3, até 10**
  - iPhone 6.5" (1242×2688) — opcional
  - iPad 12.9" — só se o app rodar em iPad
- [ ] **Texto promocional** (170 chars): "Coaching de corrida com IA. Plano que evolui a cada treino, integrado ao Strava."
- [ ] **Descrição** (4000 chars): destacar features (Coach IA, Strava sync, plano adaptativo, GPS tracking, nutrição, etc.)
- [ ] **Palavras-chave** (100 chars): `corrida,running,coach,strava,treino,maratona,10k,21k,ia`
- [ ] **URL de suporte**: https://vincere.run/suporte (ou um email: `suporte@vincere.app`)
- [ ] **URL da política de privacidade**: **obrigatório**. Pode hospedar como página estática (Notion publicado, GitHub Pages, Vercel).
- [ ] **Classificação etária**: 4+ (fitness não tem restrição)
- [ ] **Categoria primária**: Saúde e forma física
- [ ] **Categoria secundária**: Esportes

### 4. Privacy (App Privacy)
Declarar o que o app coleta — Apple leva isso **muito a sério**:
- ✅ Email (usado pra criar conta)
- ✅ Nome (no perfil)
- ✅ Dados de saúde e fitness (GPS, treinos)
- ✅ Localização precisa (enquanto usa o app)
- ❌ Não coleta pra publicidade
- ❌ Não rastreia entre apps

### 5. Guidelines críticas pro VINCERE
- **4.8 — Sign in with Apple**: se tiver login com Google/Strava/Facebook, **obriga** a ter Sign in with Apple também. (Vai estar no v1.1.)
- **5.1.1 — Permissões**: o `Info.plist` precisa explicar POR QUE cada permissão é usada:
  - `NSLocationWhenInUseUsageDescription`: "O VINCERE usa sua localização pra rastrear seus treinos em tempo real."
  - `NSMotionUsageDescription`: "Usamos dados de movimento pra calcular cadência e esforço."
  - `NSHealthShareUsageDescription`: "Lemos seus treinos do Apple Health pra incluir no seu progresso."
  - `NSHealthUpdateUsageDescription`: "Salvamos seus treinos do VINCERE no Apple Health."
- **2.5.1 — APIs públicas**: só usar APIs públicas (já estamos ok).
- **4.2 — Mínimo de funcionalidade**: o app precisa fazer mais do que um site faria (✅ ok — GPS, push, health sync).

### 6. Build via EAS
```bash
# dentro de /mobile
npm install -g eas-cli
eas login
eas build:configure   # cria eas.json

# build de produção pra iOS
eas build --platform ios --profile production
```
EAS cuida dos certificados/APNs automaticamente. Primeira build demora ~15–20 min.

### 7. Submeter
```bash
eas submit --platform ios --latest
```
Ou manual: baixar o `.ipa`, abrir **Transporter** (app grátis da Mac App Store), arrastar o IPA.

### 8. Revisão
- No App Store Connect, preencher tudo e clicar em **"Submit for Review"**
- Apple revisa em **24–72h** (pode ser mais em época de lançamento iOS novo)
- Se rejeitar, responde no Resolution Center explicando — costuma passar na 2ª tentativa

---

## 🤖 Google Play Store

### 1. Criar conta Google Play Developer
- Acessar https://play.google.com/console/signup
- Pagamento único de **US$ 25**
- Precisa de conta Google + cartão internacional
- Pra pessoa física: CPF + documento com foto
- Aprovação: algumas horas a 2 dias

### 2. Criar novo app no Play Console
- Nome do app: **VINCERE — Coach de Corrida**
- Idioma padrão: **Português (Brasil)**
- App ou jogo: App
- Grátis ou pago: Grátis (ao menos por enquanto)
- Declarações: não é diretamente pra crianças, não tem ads

### 3. Informações obrigatórias
- [ ] **Ícone**: 512×512 PNG
- [ ] **Feature graphic**: 1024×500 (banner que aparece no topo)
- [ ] **Screenshots**:
  - Celular: pelo menos 2, recomendado 8 (1080×1920 ou maior)
  - Tablet 7" + 10": opcional
- [ ] **Descrição curta** (80 chars)
- [ ] **Descrição completa** (4000 chars)
- [ ] **Política de privacidade**: URL obrigatória
- [ ] **Categoria**: Saúde e fitness
- [ ] **Content rating**: preencher questionário (→ Livre)
- [ ] **Público-alvo**: 18+ (ou 13+ se quiser)

### 4. Data Safety (equivalente ao App Privacy da Apple)
Declarar:
- Coleta localização precisa (enquanto em uso)
- Coleta dados de saúde e fitness
- Coleta email + nome
- Criptografia em trânsito: ✅
- Usuário pode pedir exclusão: ✅ (precisa implementar endpoint)

### 5. Build via EAS
```bash
# dentro de /mobile
eas build --platform android --profile production
```
Gera um `.aab` (Android App Bundle — formato exigido hoje).

### 6. Submeter
```bash
eas submit --platform android --latest
```
Ou manual: baixar o `.aab`, subir na aba **"Production"** do Play Console.

### 7. Testing tracks (recomendado)
Antes de mandar pra **Production**, usar:
1. **Internal testing** — até 100 testers, review em **minutos**. Perfeito pra testar antes do público.
2. **Closed testing** — grupo maior, review em algumas horas.
3. **Open testing** — beta público, qualquer um pode entrar.
4. **Production** — público geral.

Pro VINCERE: começar em **Internal testing** com 5–10 amigos, depois passar pra Production quando estabilizar.

### 8. Revisão
- Primeira submissão de app novo demora **7 dias** (política nova do Google desde 2024)
- Updates posteriores: algumas horas

---

## 📄 Política de Privacidade (obrigatória nas duas lojas)

Pode gerar grátis com https://www.termly.io/ ou https://app-privacy-policy-generator.firebaseapp.com/

Precisa cobrir:
- Que dados coleta (email, nome, GPS, atividades, tokens Strava)
- Pra que usa (coaching personalizado, sync, Coach IA com Anthropic)
- Com quem compartilha (Strava via OAuth, Anthropic pra geração de plano)
- Como o usuário pede exclusão da conta
- Contato do responsável (nosso email)

Hospedar em:
- GitHub Pages (grátis): `vincere-app.github.io/privacy`
- Vercel (grátis)
- Notion publicado

---

## 📸 Como gerar screenshots bonitos

Opções:
1. **Simulador + screenshot nativo** — tira print do iOS Simulator (`Cmd + S`)
2. **Fastlane Snapshot** — automatiza capturas (overkill pro v1)
3. **Screenshot builder web** (tem template com moldura de iPhone):
   - https://www.previewed.app (grátis com marca d'água, US$ 15/mês sem)
   - https://screenshots.pro
   - https://appscreens.com

Telas que vale mostrar:
- Home com dados reais
- Chat do Coach IA
- Tela de tracking em corrida
- Plano semanal
- Gráfico de evolução

---

## ✅ Checklist pré-lançamento

### Técnico
- [ ] Versão `1.0.0` no `app.json`
- [ ] Bundle ID/Package name definitivos (`com.vincere.app`)
- [ ] Ícone 1024×1024 (iOS) + 512×512 (Android)
- [ ] Splash screen com logo VINCERE
- [ ] Remover TODO MODO DEMO dos builds de produção (já está gateado em `__DEV__`)
- [ ] Remover `console.log`s verbosos
- [ ] Testar em device real iOS + Android
- [ ] Backend em produção (Railway/Fly.io/Render)
- [ ] HTTPS obrigatório (sem `http://` hardcoded)
- [ ] Variáveis de ambiente no EAS Secrets (`eas secret:create`)

### Legal / Conta
- [ ] Apple Developer pago + ativo
- [ ] Google Play Developer pago + ativo
- [ ] Política de Privacidade publicada
- [ ] Termos de Uso publicados
- [ ] Email de suporte funcional

### Store listings
- [ ] Nome + descrição + keywords nas duas lojas
- [ ] Screenshots nas duas lojas (mínimo 3 cada)
- [ ] Ícone + feature graphic
- [ ] Classificação etária preenchida
- [ ] Data Safety (Google) + App Privacy (Apple) preenchidos

---

## 🎯 Timeline realista

| Tarefa | Tempo |
|---|---|
| Criar contas dev (Apple + Google) | 1–3 dias |
| Terminar v1.1 (auth + BD) | 1–2 semanas |
| Gerar assets (ícone, screenshots, textos) | 1–2 dias |
| Política de privacidade + termos | 0,5 dia |
| Primeira build EAS | 20 min |
| Testing interno Android | 1 dia |
| TestFlight iOS (beta Apple) | 1–2 dias |
| Revisão Apple | 1–3 dias |
| Revisão Google (primeiro app) | 7 dias |
| **Total do zero até na loja** | **~3 semanas** |

---

## 🆘 Onde pedir ajuda

- **Apple review rejeitou**: responder no Resolution Center explicando educadamente.
- **EAS Build falhou**: `eas build:view --logs` mostra o motivo.
- **Play Console confuso**: https://support.google.com/googleplay/android-developer
- **Expo issues**: https://chat.expo.dev (Discord bem ativo)

---

Esse doc fica aqui como referência. Quando for a hora, é só seguir passo a passo.
