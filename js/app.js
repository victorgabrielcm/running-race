/* ========================================
   RUNNING RACE TRACKER - APP
   Victor Gabriel Portfolio
   ======================================== */

(function () {
  'use strict';

  // ── State ──
  let raceData = null;
  let leafletMaps = {};

  // ── Constants ──
  const CACHE_KEY = 'vg_race_data';
  const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

  // ── Init ──
  document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initNavbar();
    initScrollReveal();
    loadData();
  });

  // ── Data Loading ──
  async function loadData() {
    // Try cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
          raceData = parsed.data;
          render();
          return;
        }
      } catch (e) {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    try {
      const res = await fetch('data/races.json');
      if (!res.ok) throw new Error('Fetch failed');
      raceData = await res.json();
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: raceData, timestamp: Date.now() }));
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      raceData = { runner: { name: 'Victor Gabriel', bio: '', totalRaces: 0, startedRunning: '2024' }, races: [] };
    }

    render();
  }

  // ── Render ──
  function render() {
    const races = raceData.races || [];
    const stats = computeStats(races);

    renderHeroCounters(stats);
    renderStatCards(stats);
    renderBarChart(races);
    renderTimeline(races);
    renderMedals(races);

    // Re-observe new elements
    initScrollReveal();
  }

  // ── Stats Computation ──
  function computeStats(races) {
    const totalRaces = races.length;
    const totalKm = races.reduce((sum, r) => sum + (r.distance || 0), 0);

    const paces = races
      .map(r => paceToSeconds(r.pace))
      .filter(p => p > 0);

    const bestPace = paces.length ? secondsToPace(Math.min(...paces)) : '--';
    const avgPace = paces.length
      ? secondsToPace(Math.round(paces.reduce((a, b) => a + b, 0) / paces.length))
      : '--';

    return { totalRaces, totalKm, bestPace, avgPace };
  }

  function paceToSeconds(pace) {
    if (!pace || pace === '--') return 0;
    const parts = pace.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }

  function secondsToPace(totalSec) {
    const min = Math.floor(totalSec / 60);
    const sec = String(totalSec % 60).padStart(2, '0');
    return `${min}:${sec}`;
  }

  // ── Animated Counters ──
  function renderHeroCounters(stats) {
    animateCounter('[data-counter="totalRaces"]', stats.totalRaces);
    animateCounter('[data-counter="totalKm"]', stats.totalKm);
    setTextContent('[data-counter="bestPace"]', stats.bestPace);

    animateCounter('[data-counter="totalRacesCard"]', stats.totalRaces);
    animateCounter('[data-counter="totalKmCard"]', stats.totalKm);
    setTextContent('[data-counter="bestPaceCard"]', stats.bestPace);
    setTextContent('[data-counter="avgPaceCard"]', stats.avgPace);
  }

  function renderStatCards(stats) {
    animateCounter('[data-counter="totalMedals"]', stats.totalRaces);
  }

  function animateCounter(selector, target) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (target === 0) { el.textContent = '0'; return; }

    const duration = 1500;
    const start = performance.now();
    const startVal = 0;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(startVal + (target - startVal) * eased);
      el.textContent = current;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function setTextContent(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  }

  // ── Bar Chart ──
  function renderBarChart(races) {
    const container = document.getElementById('barChart');
    if (!container) return;
    container.innerHTML = '';

    if (races.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;width:100%;font-size:0.9rem;">Nenhuma corrida registrada ainda.</p>';
      return;
    }

    const sorted = [...races].sort((a, b) => new Date(a.date) - new Date(b.date));
    const maxDist = Math.max(...sorted.map(r => r.distance));

    sorted.forEach((race, i) => {
      const pct = maxDist > 0 ? (race.distance / maxDist) * 100 : 0;
      const group = document.createElement('div');
      group.className = 'bar-group';

      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = '0%';

      const value = document.createElement('span');
      value.className = 'bar-value';
      value.textContent = `${race.distance}km`;
      bar.appendChild(value);

      const label = document.createElement('span');
      label.className = 'bar-label';
      label.textContent = formatDateShort(race.date);

      group.appendChild(bar);
      group.appendChild(label);
      container.appendChild(group);

      // Animate bar height
      requestAnimationFrame(() => {
        setTimeout(() => {
          bar.style.height = `${Math.max(pct, 5)}%`;
        }, 200 + i * 100);
      });
    });
  }

  // ── Timeline ──
  function renderTimeline(races) {
    const container = document.getElementById('timelineContainer');
    if (!container) return;
    container.innerHTML = '';

    if (races.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏃</div>
          <p class="empty-state-text">Nenhuma corrida registrada ainda</p>
          <p class="empty-state-sub">Adicione suas corridas ao arquivo races.json para começar!</p>
        </div>`;
      return;
    }

    const sorted = [...races].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach((race, index) => {
      const item = document.createElement('div');
      item.className = `timeline-item ${index % 2 === 0 ? 'reveal-left' : 'reveal-right'}`;

      const medalEmoji = getMedalEmoji(race.medalType);
      const medalClass = race.medalType || 'finisher';

      item.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-card" data-race-id="${race.id}">
          <div class="timeline-date">${formatDateLong(race.date)}</div>
          <div class="timeline-race-name">${escapeHTML(race.name)}</div>
          <div class="timeline-location">${escapeHTML(race.location)}</div>
          <div class="timeline-meta">
            <span class="timeline-meta-item">📏 <strong>${race.distance} ${race.distanceUnit || 'km'}</strong></span>
            <span class="timeline-meta-item">⏱️ <strong>${race.time}</strong></span>
            <span class="timeline-meta-item">⚡ <strong>${race.pace}/km</strong></span>
          </div>
          <span class="medal-badge ${medalClass}">${medalEmoji} ${getMedalLabel(race.medalType)}</span>
          ${race.bibNumber ? `<span class="timeline-bib">#${escapeHTML(race.bibNumber)}</span>` : ''}

          <div class="timeline-expand" id="expand-${race.id}">
            <div class="timeline-details">
              <div class="detail-row">
                <span class="detail-label">Posição</span>
                <span class="detail-value">${race.position}/${race.totalParticipants}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Categoria</span>
                <span class="detail-value">${escapeHTML(race.category)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Elevação</span>
                <span class="detail-value">${race.elevation}m</span>
              </div>
              ${race.route && race.route.coordinates ? `<div class="timeline-map" id="map-${race.id}"></div>` : ''}
              ${race.notes ? `<p class="timeline-notes">"${escapeHTML(race.notes)}"</p>` : ''}
            </div>
          </div>
        </div>`;

      container.appendChild(item);

      // Click to expand
      const card = item.querySelector('.timeline-card');
      card.addEventListener('click', () => toggleExpand(race));
    });
  }

  function toggleExpand(race) {
    const expandEl = document.getElementById(`expand-${race.id}`);
    if (!expandEl) return;

    const isOpen = expandEl.classList.contains('open');
    // Close all
    document.querySelectorAll('.timeline-expand.open').forEach(el => {
      el.classList.remove('open');
      el.closest('.timeline-card').classList.remove('expanded');
    });

    if (!isOpen) {
      expandEl.classList.add('open');
      expandEl.closest('.timeline-card').classList.add('expanded');

      // Init map if needed
      if (race.route && race.route.coordinates) {
        setTimeout(() => initMap(race), 300);
      }
    }
  }

  // ── Map ──
  function initMap(race) {
    const mapId = `map-${race.id}`;
    const mapEl = document.getElementById(mapId);
    if (!mapEl) return;

    // Destroy existing
    if (leafletMaps[mapId]) {
      leafletMaps[mapId].remove();
      delete leafletMaps[mapId];
    }

    const map = L.map(mapId, {
      scrollWheelZoom: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18
    }).addTo(map);

    const coords = race.route.coordinates.map(c => [c[0], c[1]]);
    const polyline = L.polyline(coords, {
      color: '#00ff88',
      weight: 4,
      opacity: 0.9
    }).addTo(map);

    // Start marker
    L.circleMarker(coords[0], {
      radius: 7,
      color: '#00ff88',
      fillColor: '#00ff88',
      fillOpacity: 1
    }).addTo(map);

    // End marker
    L.circleMarker(coords[coords.length - 1], {
      radius: 7,
      color: '#ff4444',
      fillColor: '#ff4444',
      fillOpacity: 1
    }).addTo(map);

    map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    leafletMaps[mapId] = map;
  }

  // ── Medals ──
  function renderMedals(races) {
    const container = document.getElementById('medalsGrid');
    if (!container) return;
    container.innerHTML = '';

    if (races.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🏅</div>
          <p class="empty-state-text">Nenhuma medalha conquistada ainda</p>
          <p class="empty-state-sub">Complete corridas para colecionar medalhas!</p>
        </div>`;
      return;
    }

    races.forEach(race => {
      const medalClass = race.medalType || 'finisher';
      const emoji = getMedalEmoji(race.medalType);

      const card = document.createElement('div');
      card.className = 'medal-container reveal';
      card.innerHTML = `
        <div class="medal-flipper">
          <div class="medal-front">
            <div class="medal-icon ${medalClass}">${emoji}</div>
            <span class="medal-type">${getMedalLabel(race.medalType)}</span>
          </div>
          <div class="medal-back">
            <p class="medal-back-name">${escapeHTML(race.name)}</p>
            <p class="medal-back-date">${formatDateLong(race.date)}</p>
            <p class="medal-back-distance">${race.distance} ${race.distanceUnit || 'km'}</p>
          </div>
        </div>`;
      container.appendChild(card);
    });
  }

  // ── Helpers ──
  function getMedalEmoji(type) {
    const map = { gold: '🥇', silver: '🥈', bronze: '🥉', finisher: '🏅' };
    return map[type] || '🏅';
  }

  function getMedalLabel(type) {
    const map = { gold: 'Ouro', silver: 'Prata', bronze: 'Bronze', finisher: 'Finisher' };
    return map[type] || 'Finisher';
  }

  function formatDateLong(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function formatDateShort(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  }

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Navbar ──
  function initNavbar() {
    const navbar = document.getElementById('navbar');
    const toggle = document.getElementById('mobileToggle');
    const links = document.getElementById('navLinks');

    // Scroll effect
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });

    // Mobile toggle
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        links.classList.toggle('open');
      });

      // Close on link click
      links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => links.classList.remove('open'));
      });
    }

    // Active link highlight
    const sections = document.querySelectorAll('section[id]');
    const navAnchors = document.querySelectorAll('.navbar-links a');

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navAnchors.forEach(a => a.classList.remove('active'));
          const active = document.querySelector(`.navbar-links a[href="#${entry.target.id}"]`);
          if (active) active.classList.add('active');
        }
      });
    }, { threshold: 0.35 });

    sections.forEach(s => observer.observe(s));
  }

  // ── Scroll Reveal ──
  function initScrollReveal() {
    const targets = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(el => {
      if (!el.classList.contains('visible')) {
        observer.observe(el);
      }
    });
  }

  // ── Particles ──
  function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w, h, particles;
    const PARTICLE_COUNT = 60;

    function resize() {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    }

    function createParticles() {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: Math.random() * 2 + 0.5,
          alpha: Math.random() * 0.4 + 0.1
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 136, ${p.alpha})`;
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 255, 136, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    draw();

    window.addEventListener('resize', () => {
      resize();
      createParticles();
    });
  }

})();
