(function () {
  'use strict';

  const SETTINGS_KEY = 'vg_admin_cfg';

  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || null; }
    catch { return null; }
  }

  // ── PHOTO PREVIEW ──────────────────────────────────────────
  function setupPhotoPreview(inputId, previewId, dropAreaId) {
    const input    = document.getElementById(inputId);
    const preview  = document.getElementById(previewId);
    const dropArea = document.getElementById(dropAreaId);
    if (!input || !preview || !dropArea) return;

    function loadFile(file) {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = e => {
        preview.src = e.target.result;
        preview.style.display = 'block';
        dropArea.classList.add('has-preview');
      };
      reader.readAsDataURL(file);
    }

    dropArea.addEventListener('click', () => input.click());
    input.addEventListener('change', () => loadFile(input.files[0]));

    dropArea.addEventListener('dragover',  e => { e.preventDefault(); dropArea.classList.add('drag-over'); });
    dropArea.addEventListener('dragleave', ()  => dropArea.classList.remove('drag-over'));
    dropArea.addEventListener('drop', e => {
      e.preventDefault();
      dropArea.classList.remove('drag-over');
      loadFile(e.dataTransfer.files[0]);
    });
  }

  // ── HELPERS ────────────────────────────────────────────────
  function timeToSeconds(str) {
    const p = str.split(':').map(Number);
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    return 0;
  }

  function calcPace() {
    const km      = parseFloat(document.getElementById('distance').value);
    const timeStr = document.getElementById('time').value;
    const paceEl  = document.getElementById('pace');
    if (!km || !timeStr || !timeStr.includes(':')) return;
    const secs = timeToSeconds(timeStr);
    if (!secs) return;
    const spk = secs / km;
    paceEl.value = `${Math.floor(spk / 60)}:${String(Math.round(spk % 60)).padStart(2, '0')}`;
  }

  // ── GITHUB ─────────────────────────────────────────────────
  async function saveToGitHub(raceData) {
    const cfg = getSettings();
    if (!cfg?.githubToken || !cfg?.githubRepo) {
      throw new Error('Configuração não encontrada. Acesse admin.html e configure primeiro.');
    }

    const [owner, repo] = cfg.githubRepo.split('/');
    const branch = cfg.githubBranch || 'main';
    const headers = {
      Authorization: `token ${cfg.githubToken}`,
      Accept: 'application/vnd.github.v3+json',
    };

    // Load current file
    const fileRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/data/races.json`,
      { headers }
    );

    let sha = null;
    let races = [];
    let athlete = {
      name: 'Victor Gabriel', username: 'vcardosodemorais',
      stats: { total_km: 0, total_races: 0, total_medals: 0, best_times: {} },
    };

    if (fileRes.ok) {
      const fd = await fileRes.json();
      sha = fd.sha;
      const decoded = JSON.parse(decodeURIComponent(escape(atob(fd.content.replace(/\n/g, '')))));
      races   = decoded.races   || [];
      athlete = decoded.athlete || athlete;
    }

    // Upsert race
    const idx = races.findIndex(r => r.id === raceData.id);
    if (idx >= 0) races[idx] = raceData;
    else races.push(raceData);

    races.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Recalc stats
    athlete.stats.total_km     = parseFloat(races.reduce((s, r) => s + r.distance_km, 0).toFixed(1));
    athlete.stats.total_races  = races.length;
    athlete.stats.total_medals = races.filter(r => r.has_medal).length;

    const payload = { last_updated: new Date().toISOString(), athlete, races };
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));
    const body    = { message: `chore: adiciona corrida "${raceData.name}"`, content, branch };
    if (sha) body.sha = sha;

    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/data/races.json`,
      { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API error ${putRes.status}`);
    }
  }

  // ── FORM SUBMIT ────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();

    const btn = document.querySelector('[type="submit"]');
    const origHTML = btn.innerHTML;

    const name     = document.getElementById('name').value.trim();
    const date     = document.getElementById('date').value;
    const distance = parseFloat(document.getElementById('distance').value);
    const time     = document.getElementById('time').value.trim();

    if (!name || !date || !distance || !time) {
      alert('Preencha os campos obrigatórios: nome, data, distância e tempo.');
      return;
    }

    btn.disabled  = true;
    btn.innerHTML = '<span>Salvando…</span>';

    try {
      const raceData = {
        id:                    Date.now(),
        name,
        date,
        distance_km:           distance,
        moving_time_formatted: time,
        pace:                  document.getElementById('pace').value.trim()     || null,
        total_elevation_gain:  parseInt(document.getElementById('elevation').value)  || 0,
        heart_rate:            parseInt(document.getElementById('heartRate').value)   || null,
        heart_rate_max:        parseInt(document.getElementById('heartRateMax').value)|| null,
        calories:              parseInt(document.getElementById('calories').value)    || null,
        position:              parseInt(document.getElementById('position').value)    || null,
        total_participants:    parseInt(document.getElementById('totalParticipants').value) || null,
        strava_url:            document.getElementById('stravaUrl').value.trim() || 'https://www.strava.com/',
        has_medal:             true,
        medal_type:            document.getElementById('medalType').value,
        medal_image:           null,
        bib_number:            document.getElementById('bibNumber').value.trim() || null,
        photos:                [],
        notes:                 document.getElementById('notes').value.trim()     || '',
        workout_type:          1,
      };

      await saveToGitHub(raceData);

      // Success state
      document.getElementById('formHeader').innerHTML = `
        <div style="text-align:center;padding:40px 0">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1.5" style="margin:0 auto 16px;display:block">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <h1 class="form-page-title" style="color:#22c55e">Corrida salva!</h1>
          <p class="form-page-sub" style="margin-top:8px">${name} foi adicionada com sucesso.</p>
          <a href="index.html" class="btn btn-primary" style="margin-top:24px;display:inline-flex">← Ver corridas</a>
        </div>`;
      document.getElementById('raceForm').style.display = 'none';

    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
      btn.disabled  = false;
      btn.innerHTML = origHTML;
    }
  }

  // ── INIT ───────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    setupPhotoPreview('bibPhoto',   'bibPreview',   'bibDropArea');
    setupPhotoPreview('medalPhoto', 'medalPreview', 'medalDropArea');

    document.getElementById('raceForm').addEventListener('submit', handleSubmit);

    document.getElementById('distance').addEventListener('blur', calcPace);
    document.getElementById('time').addEventListener('blur', calcPace);
  });
})();
