# Victor Gabriel — Portfolio de Corridas

> Cada quilômetro conta uma história.

Portfolio de corridas automatizado, sincronizado com Strava, com timeline interativa e medalhas 3D.

**Site:** `https://victorgabrielcm.github.io/running-race/`

---

## O que foi construído

- **Hero** full screen com suporte a vídeo de fundo e parallax
- **Timeline** vertical alternada (esq/dir) inspirada em sites de festival/expedição
- **Medalhas 3D** com Three.js — disco metálico girando com luz dourada e inclinação pelo mouse
- **Galeria** de fotos e vídeos em grid
- **Strava sync automático** via GitHub Actions — sem preencher nada manualmente
- Tema escuro cinematográfico, 100% responsivo

---

## Configuração Inicial

### 1. GitHub Secrets
Em `Settings → Secrets → Actions`:

| Secret | Valor |
|--------|-------|
| `STRAVA_CLIENT_ID` | `216298` |
| `STRAVA_CLIENT_SECRET` | seu client secret |
| `STRAVA_REFRESH_TOKEN` | seu refresh token |

### 2. GitHub Pages
Em `Settings → Pages`: branch `main`, pasta `/ (root)`.

### 3. Primeiro sync
`Actions → Sync Strava Data → Run workflow`

---

## Como adicionar conteúdo

**Vídeo do hero:** edite `index.html`, descomente:
```html
<source src="images/hero.mp4" type="video/mp4">
