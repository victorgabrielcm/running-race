const DIST_LABELS = {
  '5k':       { label: '5K',       cls: 'dist-5k'       },
  '10k':      { label: '10K',      cls: 'dist-10k'      },
  'half':     { label: 'Meia',     cls: 'dist-half'     },
  'marathon': { label: 'Maratona', cls: 'dist-marathon' },
};

function classifyDistance(km) {
  if (km >= 4.5  && km <= 5.5)  return '5k';
  if (km >= 9    && km <= 11)   return '10k';
  if (km >= 20   && km <= 22)   return 'half';
  if (km >= 41   && km <= 43)   return 'marathon';
  return null;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatKm(km) {
  return km >= 100 ? `${Math.round(km)}km` : `${km}km`;
}

function buildCard(race, index) {
  const isLeft  = index % 2 === 0;
  const distKey = classifyDistance(race.distance_km);
  const distInfo = distKey ? DIST_LABELS[distKey] : null;

  const item = document.createElement('div');
  item.className = `timeline-item ${isLeft ? 'tl-left' : 'tl-right'}`;
  item.style.opacity = '0';

  const dotEl = document.createElement('div');
  dotEl.className = 'timeline-dot';

  const card = document.createElement('div');
  card.className = 'timeline-card';

  const photoHTML = race.photos && race.photos.length > 0
    ? `<div class="card-photo"><img src="${race.photos[0]}" alt="${race.name}" loading="lazy"/></div>`
    : '';

  const badgeHTML = distInfo
    ? `<span class="card-badge ${distInfo.cls}">${distInfo.label}</span>`
    : `<span class="card-badge dist-other">${formatKm(race.distance_km)}</span>`;

  const elevHTML = race.total_elevation_gain > 0
    ? `<div class="card-elev">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>
        +${race.total_elevation_gain}m elevação
       </div>` : '';

  const notesHTML = race.notes
    ? `<p class="card-notes">${race.notes}</p>` : '';

  const medalHTML = race.has_medal
    ? `<span class="card-medal-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
        Medalha
       </span>` : '';

  card.innerHTML = `
    ${photoHTML}
    <div class="card-meta">
      <span class="card-date">${formatDate(race.date)}</span>
      ${badgeHTML}
    </div>
    <h3 class="card-title">${race.name}</h3>
    ${notesHTML}
    <div class="card-stats">
      <div class="card-stat">
        <span class="card-stat-val">${formatKm(race.distance_km)}</span>
        <span class="card-stat-lbl">Distância</span>
      </div>
      <div class="card-stat">
        <span class="card-stat-val">${race.moving_time_formatted || '—'}</span>
        <span class="card-stat-lbl">Tempo</span>
      </div>
      <div class="card-stat">
        <span class="card-stat-val">${race.pace || '—'}</span>
        <span class="card-stat-lbl">Pace</span>
      </div>
    </div>
    ${elevHTML}
    <div class="card-footer">
      <a href="${race.strava_url}" target="_blank" rel="noopener" class="card-strava">
        Ver no Strava
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7,7 17,7 17,17"/></svg>
      </a>
      ${medalHTML}
    </div>
  `;

  item.appendChild(dotEl);
  item.appendChild(card);
  return item;
}

async function initTimeline() {
  const container = document.getElementById('timeline');
  const loadingEl = document.getElementById('timelineLoading');

  try {
    const res  = await fetch('data/races.json');
    if (!res.ok) throw new Error('not found');
    const data = await res.json();

    if (data.athlete?.stats) {
      const s = data.athlete.stats;
      animateNumber('statKm',     s.total_km,    1);
      animateNumber('statRaces',  s.total_races, 0);
      animateNumber('statMedals', s.total_medals,0);
    }

    loadingEl?.remove();

    if (!data.races || data.races.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'timeline-empty';
      empty.innerHTML = `
        <p>Nenhuma corrida ainda.</p>
        <p>Configure os GitHub Secrets e o sync vai popular isso automaticamente.</p>
      `;
      container.appendChild(empty);
      return;
    }

    data.races.forEach((race, i) => container.appendChild(buildCard(race, i)));
    requestAnimationFrame(animateTimeline);

    if (typeof initMedals === 'function') {
      initMedals(data.races.filter(r => r.has_medal));
    }

  } catch (err) {
    loadingEl?.remove();
    const empty = document.createElement('div');
    empty.className = 'timeline-empty';
    empty.innerHTML = `
      <p>Configure os GitHub Secrets para sincronizar com o Strava.</p>
      <p style="font-size:12px;margin-top:8px;color:#ff4500">
        STRAVA_CLIENT_ID · STRAVA_CLIENT_SECRET · STRAVA_REFRESH_TOKEN
      </p>
    `;
    container.appendChild(empty);
  }
}

function animateTimeline() {
  if (typeof gsap === 'undefined') return;
  gsap.utils.toArray('.timeline-item').forEach(item => {
    const isLeft = item.classList.contains('tl-left');
    const card   = item.querySelector('.timeline-card');
    const dot    = item.querySelector('.timeline-dot');
    gsap.fromTo(card,
      { opacity: 0, x: isLeft ? -50 : 50, y: 20 },
      { opacity: 1, x: 0, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: item, start: 'top 82%' } }
    );
    gsap.to(dot, { scale: 1, duration: 0.5, ease: 'back.out(2)',
      scrollTrigger: { trigger: item, start: 'top 82%' } });
    gsap.fromTo(item, { opacity: 0 }, { opacity: 1, duration: 0.1,
      scrollTrigger: { trigger: item, start: 'top 85%' } });
  });
}

function animateNumber(id, target, decimals) {
  const el = document.getElementById(id);
  if (!el || !target) return;
  const duration = 1800;
  const start = performance.now();
  const update = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const val = (1 - Math.pow(1 - p, 3)) * target;
    el.textContent = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
    if (p < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

document.addEventListener('DOMContentLoaded', initTimeline);
