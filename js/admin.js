(function () {
  'use strict';

  // ── STATE ──────────────────────────────────────────────────────────────────
  const S = {
    activities: [],
    meta: {},      // { [activityId]: { included, has_medal, medal_type, notes } }
    filter: 'all', // all | race | training | selected
    loading: false,
    isFirstSetup: false,
  };

  const SETTINGS_KEY = 'vg_admin_cfg';
  const META_KEY     = 'vg_admin_meta';

  // ── SETTINGS ───────────────────────────────────────────────────────────────
  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || null; }
    catch { return null; }
  }
  function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }
  function loadMeta() {
    try { S.meta = JSON.parse(localStorage.getItem(META_KEY)) || {}; }
    catch { S.meta = {}; }
  }
  function saveMeta() {
    localStorage.setItem(META_KEY, JSON.stringify(S.meta));
  }

  // ── CRYPTO ─────────────────────────────────────────────────────────────────
  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── SCREENS ────────────────────────────────────────────────────────────────
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.hidden = true);
    document.getElementById('screen-' + id).hidden = false;
  }

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }
  function clearError(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    clearError('loginError');
    const pw  = document.getElementById('inputPassword').value;
    const cfg = getSettings();
    if (!cfg?.passHash) { showError('loginError', 'Configuração não encontrada.'); return; }
    const hash = await sha256(pw);
    if (hash !== cfg.passHash) {
      showError('loginError', 'Senha incorreta.');
      document.getElementById('inputPassword').value = '';
      return;
    }
    await enterMain();
  }

  async function enterMain() {
    showScreen('main');
    if (!S.activities.length) await loadActivities();
  }

  // ── SETUP / SETTINGS ───────────────────────────────────────────────────────
  function openSetup(isFirst) {
    S.isFirstSetup = isFirst;
    clearError('setupError');
    const title = document.getElementById('setupTitle');
    const pwSection = document.getElementById('pwSection');
    const cancelBtn = document.getElementById('btnSetupCancel');

    if (isFirst) {
      title.textContent = 'Configuração Inicial';
      pwSection.hidden = false;
      cancelBtn.hidden = true;
    } else {
      title.textContent = 'Configurações';
      pwSection.hidden = true;
      cancelBtn.hidden = false;
      // Pre-fill
      const s = getSettings() || {};
      document.getElementById('setupGithubToken').value  = s.githubToken  || '';
      document.getElementById('setupGithubRepo').value   = s.githubRepo   || '';
      document.getElementById('setupGithubBranch').value = s.githubBranch || 'main';
      document.getElementById('setupStravaId').value     = s.stravaId     || '';
      document.getElementById('setupStravaSecret').value = s.stravaSecret || '';
      document.getElementById('setupStravaRefresh').value= s.stravaRefresh|| '';
    }
    showScreen('setup');
  }

  async function handleSetup(e) {
    e.preventDefault();
    clearError('setupError');
    const existing = getSettings() || {};

    // Password
    let passHash = existing.passHash || null;
    if (S.isFirstSetup) {
      const pw  = document.getElementById('setupPw').value;
      const pw2 = document.getElementById('setupPw2').value;
      if (pw.length < 6)  { showError('setupError', 'Senha muito curta (mín. 6 caracteres).'); return; }
      if (pw !== pw2)     { showError('setupError', 'As senhas não coincidem.'); return; }
      passHash = await sha256(pw);
    }

    const githubToken   = document.getElementById('setupGithubToken').value.trim();
    const githubRepo    = document.getElementById('setupGithubRepo').value.trim();
    const githubBranch  = document.getElementById('setupGithubBranch').value.trim() || 'main';
    const stravaId      = document.getElementById('setupStravaId').value.trim();
    const stravaSecret  = document.getElementById('setupStravaSecret').value.trim();
    const stravaRefresh = document.getElementById('setupStravaRefresh').value.trim();

    if (!githubToken || !githubRepo || !stravaId || !stravaSecret || !stravaRefresh) {
      showError('setupError', 'Preencha todos os campos obrigatórios (*).');
      return;
    }
    if (!githubRepo.includes('/')) {
      showError('setupError', 'GitHub repo deve ser no formato usuario/repositorio.');
      return;
    }

    saveSettings({ passHash, githubToken, githubRepo, githubBranch, stravaId, stravaSecret, stravaRefresh });

    if (S.isFirstSetup) {
      await enterMain();
    } else {
      showScreen('main');
      await loadActivities();
    }
  }

  // ── STRAVA API ─────────────────────────────────────────────────────────────
  async function getAccessToken() {
    const cfg = getSettings();
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     cfg.stravaId,
        client_secret: cfg.stravaSecret,
        grant_type:    'refresh_token',
        refresh_token: cfg.stravaRefresh,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Strava auth error ${res.status}`);
    }
    const data = await res.json();
    return data.access_token;
  }

  async function fetchAllRuns(token) {
    let all = [], page = 1;
    while (true) {
      const res = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Strava API error ${res.status}`);
      const batch = await res.json();
      if (!batch.length) break;
      const runs = batch.filter(a => a.type === 'Run' || a.sport_type === 'Run');
      all = all.concat(runs);
      if (batch.length < 100) break;
      page++;
    }
    return all.sort((a, b) => new Date(b.start_date_local) - new Date(a.start_date_local));
  }

  async function loadActivities() {
    setLoading(true, 'Buscando atividades no Strava…');
    try {
      const token = await getAccessToken();
      S.activities = await fetchAllRuns(token);
      loadMeta();
      renderList();
      updateCounts();
    } catch (err) {
      showToast('Erro ao carregar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── FORMAT HELPERS ─────────────────────────────────────────────────────────
  function fmtDate(str) {
    const d = new Date(str);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fmtTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  function fmtPace(mps) {
    if (!mps) return '—';
    const secPerKm = 1000 / mps;
    return `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2,'0')}`;
  }
  function fmtKm(m) {
    return (m / 1000).toFixed(2);
  }
  function workoutBadge(type) {
    if (type === 1) return { label: 'Corrida Oficial', cls: 'badge-race' };
    if (type === 2) return { label: 'Long Run',        cls: 'badge-long' };
    if (type === 3) return { label: 'Treino',          cls: 'badge-workout' };
    return              { label: 'Corrida',            cls: 'badge-default' };
  }

  // ── RENDER LIST ────────────────────────────────────────────────────────────
  function getFiltered() {
    return S.activities.filter(a => {
      if (S.filter === 'race')     return a.workout_type === 1;
      if (S.filter === 'training') return a.workout_type !== 1;
      if (S.filter === 'selected') return !!S.meta[a.id]?.included;
      return true;
    });
  }

  function updateCounts() {
    const sel = Object.values(S.meta).filter(m => m.included).length;
    document.getElementById('selectedBadge').textContent = sel || '';
    document.getElementById('selectedBadge').hidden = sel === 0;
    document.getElementById('publishCount').textContent = sel;
    document.getElementById('btnPublish').disabled = sel === 0;
  }

  function renderList() {
    const list     = document.getElementById('activityList');
    const filtered = getFiltered();
    updateCounts();

    if (!S.activities.length) {
      list.innerHTML = '<div class="list-empty">Nenhuma atividade encontrada no Strava.</div>';
      return;
    }
    if (!filtered.length) {
      list.innerHTML = '<div class="list-empty">Nenhuma atividade neste filtro.</div>';
      return;
    }

    list.innerHTML = filtered.map(a => renderCard(a)).join('');
  }

  function renderCard(a) {
    const meta    = S.meta[a.id] || {};
    const included = !!meta.included;
    const badge   = workoutBadge(a.workout_type);
    const km      = fmtKm(a.distance);
    const time    = fmtTime(a.moving_time);
    const pace    = fmtPace(a.average_speed);

    const medalSelect = meta.has_medal ? `
      <select class="ac-select" onchange="Admin.setMedalType(${a.id}, this.value)">
        <option value="finisher" ${meta.medal_type === 'finisher' ? 'selected' : ''}>Finisher</option>
        <option value="bronze"   ${meta.medal_type === 'bronze'   ? 'selected' : ''}>Bronze</option>
        <option value="silver"   ${meta.medal_type === 'silver'   ? 'selected' : ''}>Prata</option>
        <option value="gold"     ${meta.medal_type === 'gold'     ? 'selected' : ''}>Ouro</option>
      </select>` : '';

    const extraSection = included ? `
      <div class="ac-extra">
        <div class="ac-extra-row">
          <label class="toggle-row">
            <input type="checkbox" ${meta.has_medal ? 'checked' : ''} onchange="Admin.toggleMedal(${a.id})">
            <span class="toggle-box"></span>
            <span>Tem medalha</span>
          </label>
          ${medalSelect}
        </div>
        <textarea class="ac-notes" placeholder="Notas sobre a corrida (opcional)…" onchange="Admin.setNotes(${a.id}, this.value)">${meta.notes || ''}</textarea>
      </div>` : '';

    return `
      <div class="ac-card ${included ? 'is-included' : ''}" data-id="${a.id}">
        <div class="ac-main">
          <label class="ac-checkbox">
            <input type="checkbox" ${included ? 'checked' : ''} onchange="Admin.toggleInclude(${a.id})">
            <span class="ac-checkmark"></span>
          </label>
          <div class="ac-body">
            <div class="ac-top-row">
              <span class="ac-badge ${badge.cls}">${badge.label}</span>
              <span class="ac-date">${fmtDate(a.start_date_local)}</span>
              <a href="https://www.strava.com/activities/${a.id}" target="_blank" class="ac-strava" title="Ver no Strava">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
              </a>
            </div>
            <div class="ac-name">${a.name}</div>
            <div class="ac-chips">
              <span class="chip">${km} km</span>
              <span class="chip">${time}</span>
              <span class="chip">${pace} /km</span>
              ${a.total_elevation_gain > 0 ? `<span class="chip">↑${Math.round(a.total_elevation_gain)}m</span>` : ''}
              ${a.average_heartrate ? `<span class="chip">${Math.round(a.average_heartrate)} bpm</span>` : ''}
            </div>
          </div>
        </div>
        ${extraSection}
      </div>`;
  }

  // ── ACTIONS (exposed globally) ──────────────────────────────────────────────
  window.Admin = {
    toggleInclude(id) {
      if (!S.meta[id]) S.meta[id] = {};
      S.meta[id].included = !S.meta[id].included;
      saveMeta();
      // Re-render just this card
      const a = S.activities.find(x => x.id === id);
      if (a) {
        const el = document.querySelector(`.ac-card[data-id="${id}"]`);
        if (el) el.outerHTML = renderCard(a);
        // Re-attach — simpler to just update counts and re-render filtered if in selected mode
        if (S.filter === 'selected') renderList();
      }
      updateCounts();
    },
    toggleMedal(id) {
      if (!S.meta[id]) S.meta[id] = {};
      S.meta[id].has_medal = !S.meta[id].has_medal;
      if (S.meta[id].has_medal && !S.meta[id].medal_type) S.meta[id].medal_type = 'finisher';
      saveMeta();
      const a = S.activities.find(x => x.id === id);
      if (a) {
        const el = document.querySelector(`.ac-card[data-id="${id}"]`);
        if (el) el.outerHTML = renderCard(a);
      }
    },
    setMedalType(id, val) {
      if (!S.meta[id]) S.meta[id] = {};
      S.meta[id].medal_type = val;
      saveMeta();
    },
    setNotes(id, val) {
      if (!S.meta[id]) S.meta[id] = {};
      S.meta[id].notes = val;
      saveMeta();
    },
  };

  // ── FILTER ─────────────────────────────────────────────────────────────────
  window.setFilter = function (f) {
    S.filter = f;
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === f);
    });
    renderList();
  };

  // ── PUBLISH ────────────────────────────────────────────────────────────────
  async function publish() {
    const cfg      = getSettings();
    const selected = S.activities.filter(a => S.meta[a.id]?.included);
    if (!selected.length) return;

    setLoading(true, 'Publicando no GitHub…');
    try {
      const races = selected.map(a => {
        const meta = S.meta[a.id] || {};
        return {
          id:                   a.id,
          name:                 a.name,
          date:                 a.start_date_local.substring(0, 10),
          distance_km:          parseFloat(fmtKm(a.distance)),
          moving_time_formatted: fmtTime(a.moving_time),
          pace:                 fmtPace(a.average_speed),
          total_elevation_gain: Math.round(a.total_elevation_gain || 0),
          heart_rate:           a.average_heartrate ? Math.round(a.average_heartrate) : null,
          heart_rate_max:       a.max_heartrate     ? Math.round(a.max_heartrate)     : null,
          calories:             a.calories          || null,
          strava_url:           `https://www.strava.com/activities/${a.id}`,
          has_medal:            !!meta.has_medal,
          medal_type:           meta.medal_type || 'finisher',
          medal_image:          null,
          photos:               [],
          notes:                meta.notes || '',
          workout_type:         a.workout_type,
        };
      }).sort((a, b) => new Date(b.date) - new Date(a.date));

      const totalKm = races.reduce((s, r) => s + r.distance_km, 0);

      const payload = {
        last_updated: new Date().toISOString(),
        athlete: {
          name:     'Victor Gabriel',
          username: 'vcardosodemorais',
          stats: {
            total_km:     parseFloat(totalKm.toFixed(1)),
            total_races:  races.length,
            total_medals: races.filter(r => r.has_medal).length,
            best_times:   {},
          },
        },
        races,
      };

      const [owner, repo] = cfg.githubRepo.split('/');
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));

      // Get current SHA
      const fileRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/data/races.json`,
        { headers: { Authorization: `token ${cfg.githubToken}`, Accept: 'application/vnd.github.v3+json' } }
      );
      let sha = null;
      if (fileRes.ok) { sha = (await fileRes.json()).sha; }

      // Commit
      const body = {
        message: `chore: atualiza corridas (${races.length} selecionada${races.length !== 1 ? 's' : ''})`,
        content,
        branch: cfg.githubBranch,
      };
      if (sha) body.sha = sha;

      const putRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/data/races.json`,
        {
          method:  'PUT',
          headers: {
            Authorization:  `token ${cfg.githubToken}`,
            Accept:         'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        throw new Error(err.message || `GitHub API error ${putRes.status}`);
      }

      showToast(`${races.length} corrida${races.length !== 1 ? 's' : ''} publicada${races.length !== 1 ? 's' : ''} com sucesso!`);
    } catch (err) {
      showToast('Erro ao publicar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── LOADING / TOAST ────────────────────────────────────────────────────────
  function setLoading(v, msg) {
    S.loading = v;
    const overlay = document.getElementById('loadingOverlay');
    overlay.hidden = !v;
    if (msg) document.getElementById('loadingMsg').textContent = msg;
  }

  function showToast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast visible' + (type === 'error' ? ' toast-error' : '');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('visible'), 4000);
  }

  // ── INIT ───────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const cfg = getSettings();

    if (!cfg?.passHash) {
      openSetup(true);
    } else {
      showScreen('login');
    }

    document.getElementById('formLogin').addEventListener('submit', handleLogin);
    document.getElementById('formSetup').addEventListener('submit', handleSetup);
    document.getElementById('btnPublish').addEventListener('click', publish);
    document.getElementById('btnRefresh').addEventListener('click', loadActivities);
    document.getElementById('btnSettings').addEventListener('click', () => openSetup(false));
    document.getElementById('btnSetupCancel').addEventListener('click', () => showScreen('main'));
    document.getElementById('btnLogout').addEventListener('click', () => {
      S.activities = [];
      showScreen('login');
    });
  });
})();
