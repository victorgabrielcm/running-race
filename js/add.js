(function () {
  'use strict';

  const SETTINGS_KEY = 'vg_admin_cfg';

  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || null; }
    catch { return null; }
  }

  // ── PACE AUTO-CALC ─────────────────────────────────────────────────────────
  function calcPace(distKm, timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return '';
    const totalSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (!distKm || !totalSec) return '';
    const secPerKm = totalSec / distKm;
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // ── PHOTO DROP AREAS ───────────────────────────────────────────────────────
  function setupPhotoArea(dropId, inputId, previewId) {
    const area    = document.getElementById(dropId);
    const input   = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!area || !input) return;

    area.addEventListener('click', () => input.click());

    input.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) readPreview(file, preview, area);
    });

    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', e => {
      e.preventDefault();
      area.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) readPreview(file, preview, area);
    });
  }

  function readPreview(file, img, area) {
    const reader = new FileReader();
    reader.onload = e => {
      img.src = e.target.result;
      img.style.display = 'block';
      area.classList.add('has-preview');
    };
    reader.readAsDataURL(file);
  }

  // ── BUILD RACE OBJECT ──────────────────────────────────────────────────────
  function genId() {
    return Date.now() + Math.floor(Math.random() * 9999);
  }

  function buildRace() {
    const distKm  = parseFloat(document.getElementById('distance').value) || 0;
    const timeStr = document.getElementById('time').value.trim();
    const paceVal = document.getElementById('pace').value.trim() || calcPace(distKm, timeStr);

    return {
      id:                    parseInt(document.getElementById('raceId').value) || genId(),
      name:                  document.getElementById('name').value.trim(),
      date:                  document.getElementById('date').value,
      location:              document.getElementById('location').value.trim() || null,
      category:              document.getElementById('category').value || null,
      distance_km:           distKm,
      moving_time_formatted: timeStr,
      pace:                  paceVal,
      heart_rate:            parseInt(document.getElementById('heartRate').value)       || null,
      heart_rate_max:        parseInt(document.getElementById('heartRateMax').value)    || null,
      total_elevation_gain:  parseInt(document.getElementById('elevation').value)       || 0,
      calories:              parseInt(document.getElementById('calories').value)        || null,
      position:              parseInt(document.getElementById('position').value)        || null,
      total_participants:    parseInt(document.getElementById('totalParticipants').value) || null,
      strava_url:            document.getElementById('stravaUrl').value.trim() || '#',
      has_medal:             document.getElementById('medalType').value !== '',
      medal_type:            document.getElementById('medalType').value || 'finisher',
      medal_image:           null,
      bib_number:            document.getElementById('bibNumber').value.trim() || null,
      photos:                [],
      notes:                 document.getElementById('notes').value.trim(),
      workout_type:          1, // entrada manual = corrida oficial
    };
  }

  function validateRace(race) {
    if (!race.name)      return 'Preencha o nome da corrida.';
    if (!race.date)      return 'Preencha a data.';
    if (!race.distance_km || race.distance_km <= 0) return 'Preencha a distância.';
    if (!race.moving_time_formatted || !/^\d{2}:\d{2}:\d{2}$/.test(race.moving_time_formatted))
      return 'Tempo inválido. Use o formato hh:mm:ss.';
    return null;
  }

  // ── GITHUB API ─────────────────────────────────────────────────────────────
  async function fetchCurrentData(cfg) {
    const [owner, repo] = cfg.githubRepo.split('/');
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/data/races.json`,
      { headers: { Authorization: `token ${cfg.githubToken}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) return { data: null, sha: null };
    const file = await res.json();
    const data = JSON.parse(atob(file.content.replace(/\n/g, '')));
    return { data, sha: file.sha };
  }

  async function commitRace(race) {
    const cfg = getSettings();
    if (!cfg?.githubToken || !cfg?.githubRepo) {
      alert('Credenciais não configuradas. Configure pelo painel Admin primeiro.');
      window.location.href = 'admin.html';
      return false;
    }

    const [owner, repo] = cfg.githubRepo.split('/');
    const { data, sha } = await fetchCurrentData(cfg);

    let payload;
    if (!data) {
      payload = {
        last_updated: new Date().toISOString(),
        athlete: {
          name: 'Victor Gabriel', username: 'vcardosodemorais',
          stats: { total_km: race.distance_km, total_races: 1, total_medals: race.has_medal ? 1 : 0, best_times: {} },
        },
        races: [race],
      };
    } else {
      const races = data.races || [];
      const idx   = races.findIndex(r => r.id === race.id);
      if (idx >= 0) races[idx] = race;
      else          races.unshift(race);
      races.sort((a, b) => new Date(b.date) - new Date(a.date));

      const totalKm = races.reduce((s, r) => s + (r.distance_km || 0), 0);
      payload = {
        ...data,
        last_updated: new Date().toISOString(),
        races,
        athlete: {
          ...data.athlete,
          stats: {
            total_km:     parseFloat(totalKm.toFixed(1)),
            total_races:  races.length,
            total_medals: races.filter(r => r.has_medal).length,
            best_times:   {},
          },
        },
      };
    }

    const content  = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));
    const isEdit   = (data?.races || []).some(r => r.id === race.id);
    const body     = {
      message: isEdit ? `chore: edita corrida "${race.name}"` : `feat: adiciona corrida "${race.name}"`,
      content,
      branch: cfg.githubBranch || 'main',
    };
    if (sha) body.sha = sha;

    const res = await fetch(
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
    return res.ok;
  }

  // ── LOAD FOR EDIT ──────────────────────────────────────────────────────────
  async function loadForEdit(id) {
    const cfg = getSettings();
    if (!cfg) return;
    try {
      const { data } = await fetchCurrentData(cfg);
      if (!data) return;
      const race = data.races.find(r => String(r.id) === String(id));
      if (!race) return;

      document.getElementById('raceId').value            = race.id;
      document.getElementById('name').value              = race.name || '';
      document.getElementById('date').value              = race.date || '';
      document.getElementById('location').value          = race.location || '';
      document.getElementById('category').value          = race.category || '';
      document.getElementById('medalType').value         = race.medal_type || 'finisher';
      document.getElementById('bibNumber').value         = race.bib_number || '';
      document.getElementById('distance').value          = race.distance_km || '';
      document.getElementById('time').value              = race.moving_time_formatted || '';
      document.getElementById('pace').value              = race.pace || '';
      document.getElementById('heartRate').value         = race.heart_rate || '';
      document.getElementById('heartRateMax').value      = race.heart_rate_max || '';
      document.getElementById('elevation').value         = race.total_elevation_gain || '';
      document.getElementById('calories').value          = race.calories || '';
      document.getElementById('position').value          = race.position || '';
      document.getElementById('totalParticipants').value = race.total_participants || '';
      document.getElementById('stravaUrl').value         = race.strava_url !== '#' ? race.strava_url : '';
      document.getElementById('notes').value             = race.notes || '';

      document.getElementById('formHeader').innerHTML = `
        <h1 class="form-page-title">Editar Corrida</h1>
        <p class="form-page-sub">Atualize os dados da corrida.</p>
      `;
    } catch (err) {
      console.error('Erro ao carregar corrida para edição:', err);
    }
  }

  // ── LOADING STATE ──────────────────────────────────────────────────────────
  function setSubmitting(btn, loading) {
    btn.disabled = loading;
    btn.innerHTML = loading
      ? '<span class="btn-spinner"></span> Salvando…'
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Salvar Corrida`;
  }

  function showFieldError(msg) {
    let el = document.getElementById('formError');
    if (!el) {
      el = document.createElement('p');
      el.id = 'formError';
      el.style.cssText = 'color:#ff6b6b;font-size:13px;margin-top:12px;text-align:center';
      document.querySelector('.form-actions').prepend(el);
    }
    el.textContent = msg;
  }

  // ── INIT ───────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    setupPhotoArea('bibDropArea',   'bibPhoto',   'bibPreview');
    setupPhotoArea('medalDropArea', 'medalPhoto', 'medalPreview');

    // Auto-calc pace
    const paceInput = document.getElementById('pace');
    ['distance', 'time'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        if (paceInput.dataset.manual) return;
        const dist = parseFloat(document.getElementById('distance').value);
        const time = document.getElementById('time').value;
        const p = calcPace(dist, time);
        if (p) paceInput.value = p;
      });
    });
    paceInput?.addEventListener('input', function () {
      this.dataset.manual = this.value ? '1' : '';
    });

    // Edit mode
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('id');
    if (editId) await loadForEdit(editId);

    // Submit
    document.getElementById('raceForm').addEventListener('submit', async e => {
      e.preventDefault();
      const btn  = e.target.querySelector('button[type="submit"]');
      const race = buildRace();
      const err  = validateRace(race);
      if (err) { showFieldError(err); return; }

      setSubmitting(btn, true);
      try {
        const ok = await commitRace(race);
        if (ok) {
          window.location.href = 'index.html';
        } else {
          showFieldError('Erro ao salvar. Verifique as credenciais no Admin.');
        }
      } catch (err) {
        showFieldError('Erro: ' + err.message);
      } finally {
        setSubmitting(btn, false);
      }
    });
  });
})();
