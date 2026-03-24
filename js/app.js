(function () {
  'use strict';

  const STORAGE_KEY = 'vg_races_v2';

  function getRaces() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function saveRaces(races) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(races));
  }

  function deleteRace(id) {
    saveRaces(getRaces().filter(r => r.id !== id));
    init();
  }

  function paceToSec(pace) {
    if (!pace || !pace.includes(':')) return 0;
    const [m, s] = pace.split(':').map(Number);
    return m * 60 + (s || 0);
  }

  function secToPace(sec) {
    const m = Math.floor(sec / 60);
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function renderStats(races) {
    const totalKm = races.reduce((s, r) => s + (parseFloat(r.distance) || 0), 0);
    const paces = races.map(r => paceToSec(r.pace)).filter(p => p > 0);
    document.getElementById('statRaces').textContent = races.length;
    document.getElementById('statKm').textContent = totalKm.toFixed(1) + ' km';
    document.getElementById('statBestPace').textContent = paces.length ? secToPace(Math.min(...paces)) : '—';
    document.getElementById('statMedals').textContent = races.filter(r => r.medalType).length;
  }

  function renderGrid(races) {
    const grid = document.getElementById('racesGrid');
    if (!races.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏁</div>
          <div class="empty-title">Nenhuma corrida registrada ainda</div>
          <p class="empty-sub">Registre sua primeira corrida e comece a construir sua história.</p>
          <a href="add.html" class="btn btn-primary">Registrar Corrida</a>
        </div>`;
      return;
    }
    const sorted = [...races].sort((a, b) => new Date(b.date) - new Date(a.date));
    grid.innerHTML = sorted.map(r => cardHTML(r)).join('');
    grid.querySelectorAll('.race-card').forEach(card => {
      card.addEventListener('click', () => openModal(card.dataset.id));
    });
  }

  function cardHTML(r) {
    const cover = r.bibPhoto
      ? `<img src="${r.bibPhoto}" alt="Bib" loading="lazy">`
      : `<div class="card-cover-placeholder">
           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
           <span>Sem foto</span>
         </div>`;
    const badgeClass = `badge-${r.medalType || 'finisher'}`;
    const badgeLabel = { gold: '🥇 Ouro', silver: '🥈 Prata', bronze: '🥉 Bronze', finisher: '🏅 Finisher' }[r.medalType] || '🏅 Finisher';
    return `
      <div class="race-card" data-id="${r.id}">
        <div class="card-cover">
          ${cover}
          <span class="card-medal-badge ${badgeClass}">${badgeLabel}</span>
        </div>
        <div class="card-body">
          <div class="card-date">${fmtDate(r.date)}</div>
          <div class="card-name">${esc(r.name)}</div>
          <div class="card-location">${esc(r.location || '')}</div>
          <div class="card-stats">
            <div class="card-stat"><span class="card-stat-value">${r.distance ? r.distance + ' km' : '—'}</span><span class="card-stat-label">Distância</span></div>
            <div class="card-stat"><span class="card-stat-value">${r.time || '—'}</span><span class="card-stat-label">Tempo</span></div>
            <div class="card-stat"><span class="card-stat-value">${r.pace ? r.pace + '/km' : '—'}</span><span class="card-stat-label">Pace</span></div>
          </div>
        </div>
      </div>`;
  }

  let currentRaceId = null;

  function openModal(id) {
    const race = getRaces().find(r => r.id === id);
    if (!race) return;
    currentRaceId = id;

    document.getElementById('modalDate').textContent = fmtDate(race.date);
    document.getElementById('modalName').textContent = race.name;
    document.getElementById('modalLocation').textContent = race.location || '';

    const photosEl = document.getElementById('modalPhotos');
    let photosHTML = '';
    if (race.bibPhoto) photosHTML += `<div class="modal-photo"><img src="${race.bibPhoto}" alt="Bib"><div class="modal-photo-label">Número do peito</div></div>`;
    if (race.medalPhoto) photosHTML += `<div class="modal-photo"><img src="${race.medalPhoto}" alt="Medalha"><div class="modal-photo-label">Medalha</div></div>`;
    photosEl.innerHTML = photosHTML;
    photosEl.style.display = photosHTML ? 'grid' : 'none';

    const details = [
      ['Distância', race.distance ? race.distance + ' km' : '—'],
      ['Tempo', race.time || '—'],
      ['Pace', race.pace ? race.pace + '/km' : '—'],
      ['FC Média', race.heartRate ? race.heartRate + ' bpm' : '—'],
      ['FC Máxima', race.heartRateMax ? race.heartRateMax + ' bpm' : '—'],
      ['Elevação', race.elevation ? race.elevation + ' m' : '—'],
      ['Calorias', race.calories ? race.calories + ' kcal' : '—'],
      ['Posição', race.position && race.totalParticipants ? `${race.position}/${race.totalParticipants}` : (race.position || '—')],
      ['Categoria', race.category || '—'],
      ['Número do peito', race.bibNumber || '—'],
    ];
    document.getElementById('modalDetails').innerHTML = details
      .map(([label, val]) => `<div class="modal-detail"><div class="modal-detail-label">${label}</div><div class="modal-detail-value">${esc(String(val))}</div></div>`)
      .join('');

    const notesEl = document.getElementById('modalNotes');
    if (race.notes) { notesEl.textContent = race.notes; notesEl.style.display = 'block'; }
    else { notesEl.style.display = 'none'; }

    const stravaEl = document.getElementById('modalStrava');
    if (race.stravaUrl) { stravaEl.href = race.stravaUrl; stravaEl.style.display = 'inline-flex'; }
    else { stravaEl.style.display = 'none'; }

    document.getElementById('modalEditBtn').href = `add.html?id=${id}`;
    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
    currentRaceId = null;
  }

  function fmtDate(d) {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function init() {
    const races = getRaces();
    renderStats(races);
    renderGrid(races);
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    document.getElementById('modalDeleteBtn').addEventListener('click', () => {
      if (!currentRaceId) return;
      if (confirm('Excluir esta corrida?')) { deleteRace(currentRaceId); closeModal(); }
    });
  });
})();
