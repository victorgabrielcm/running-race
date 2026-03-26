(function () {
  'use strict';

  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const DAYS   = ['D','S','T','Q','Q','S','S'];

  // ── COLOR SCALE (olive/green — fácil de trocar com o design system) ───────
  function kmToColor(km) {
    if (km <= 0)   return 'var(--hm-0, #141420)';
    if (km < 5)    return 'var(--hm-1, #2a3d28)';
    if (km < 10)   return 'var(--hm-2, #3a5c35)';
    if (km < 20)   return 'var(--hm-3, #4e7c46)';
    return              'var(--hm-4, #6aab5c)';
  }
  function kmToOpacity(km) {
    if (km <= 0) return 0;
    return 0.7 + Math.min(km / 42, 1) * 0.3;
  }

  // ── BUILD DATA MAP ─────────────────────────────────────────────────────────
  function buildDayMap(races) {
    const map = {};
    races.forEach(r => {
      if (r.date && r.distance_km) {
        map[r.date] = (map[r.date] || 0) + r.distance_km;
      }
    });
    return map;
  }

  // ── GENERATE WEEK GRID (52 semanas para trás) ──────────────────────────────
  function buildWeeks(dayMap) {
    const today  = new Date();
    const start  = new Date(today);
    start.setDate(start.getDate() - 363);
    start.setDate(start.getDate() - start.getDay()); // começa no domingo

    const weeks = [];
    const cur   = new Date(start);

    while (cur <= today) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const iso = cur.toISOString().split('T')[0];
        week.push({ date: iso, km: dayMap[iso] || 0, future: cur > today });
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }

  // ── STATS ──────────────────────────────────────────────────────────────────
  function calcStats(dayMap, races) {
    const thisYear = new Date().getFullYear().toString();
    const yearRaces = races.filter(r => r.date?.startsWith(thisYear));

    const totalKmYear  = yearRaces.reduce((s, r) => s + (r.distance_km || 0), 0);
    const totalRaces   = yearRaces.length;

    // Longest streak (consecutive days with runs)
    const activeDays = Object.entries(dayMap)
      .filter(([, km]) => km > 0)
      .map(([d]) => d)
      .sort();

    let maxStreak = 0, curStreak = 0, prevDate = null;
    activeDays.forEach(d => {
      if (prevDate) {
        const diff = (new Date(d) - new Date(prevDate)) / 86400000;
        if (diff === 1) { curStreak++; maxStreak = Math.max(maxStreak, curStreak); }
        else curStreak = 1;
      } else { curStreak = 1; }
      prevDate = d;
    });

    return { totalKmYear: totalKmYear.toFixed(1), totalRaces, maxStreak };
  }

  // ── TOOLTIP ────────────────────────────────────────────────────────────────
  function createTooltip() {
    const tip = document.createElement('div');
    tip.className = 'hm-tooltip';
    document.body.appendChild(tip);
    return tip;
  }

  function positionTooltip(tip, cell) {
    const rect = cell.getBoundingClientRect();
    const tw   = tip.offsetWidth;
    let left   = rect.left + rect.width / 2 - tw / 2 + window.scrollX;
    let top    = rect.top - tip.offsetHeight - 8 + window.scrollY;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    tip.style.left = left + 'px';
    tip.style.top  = top  + 'px';
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  function render(container, races) {
    const dayMap = buildDayMap(races);
    const weeks  = buildWeeks(dayMap);
    const stats  = calcStats(dayMap, races);

    const CELL = 12, GAP = 3;
    const totalW = weeks.length * (CELL + GAP) - GAP;

    // Month labels
    const monthLabels = [];
    weeks.forEach((week, wi) => {
      const firstDay = week.find(d => !d.future);
      if (!firstDay) return;
      const d = new Date(firstDay.date);
      if (d.getDate() <= 7) {
        monthLabels.push({ x: wi * (CELL + GAP), label: MONTHS[d.getMonth()] });
      }
    });

    container.innerHTML = `
      <div class="hm-stats">
        <div class="hm-stat">
          <span class="hm-stat-val">${stats.totalKmYear}</span>
          <span class="hm-stat-lbl">km em ${new Date().getFullYear()}</span>
        </div>
        <div class="hm-stat-div"></div>
        <div class="hm-stat">
          <span class="hm-stat-val">${stats.totalRaces}</span>
          <span class="hm-stat-lbl">corridas este ano</span>
        </div>
        <div class="hm-stat-div"></div>
        <div class="hm-stat">
          <span class="hm-stat-val">${stats.maxStreak}</span>
          <span class="hm-stat-lbl">dias seguidos</span>
        </div>
      </div>

      <div class="hm-wrap">
        <div class="hm-day-labels">
          ${DAYS.map((d, i) => `<div class="hm-day" style="grid-row:${i+1}">${i % 2 !== 0 ? d : ''}</div>`).join('')}
        </div>
        <div class="hm-scroll">
          <div class="hm-grid-wrap">
            <div class="hm-month-row">
              ${monthLabels.map(m => `<span class="hm-month" style="left:${m.x}px">${m.label}</span>`).join('')}
            </div>
            <div class="hm-grid" id="hmGrid" style="width:${totalW}px"></div>
          </div>
        </div>
        <div class="hm-legend">
          <span class="hm-legend-lbl">Menos</span>
          ${[0, 1, 2, 3, 4].map(i => `<div class="hm-legend-cell" style="background:${kmToColor(i === 0 ? 0 : [0,3,8,15,25][i])}"></div>`).join('')}
          <span class="hm-legend-lbl">Mais</span>
        </div>
      </div>
    `;

    const grid = container.querySelector('#hmGrid');
    const tip  = createTooltip();

    weeks.forEach(week => {
      const col = document.createElement('div');
      col.className = 'hm-col';
      week.forEach(day => {
        const cell = document.createElement('div');
        cell.className = 'hm-cell';
        if (day.future) {
          cell.style.background = 'transparent';
        } else {
          cell.style.background = kmToColor(day.km);
          if (day.km > 0) cell.style.opacity = kmToOpacity(day.km);
          cell.style.setProperty('--hm-km', day.km);
        }
        if (!day.future) {
          const d     = new Date(day.date + 'T00:00:00');
          const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
          cell.addEventListener('mouseenter', () => {
            tip.textContent = day.km > 0
              ? `${label} · ${day.km.toFixed(1)} km`
              : `${label} · sem corrida`;
            tip.style.display = 'block';
            requestAnimationFrame(() => positionTooltip(tip, cell));
          });
          cell.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
        }
        col.appendChild(cell);
      });
      grid.appendChild(col);
    });

    // GSAP reveal
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.fromTo('.hm-cell',
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1, duration: 0.4, stagger: { amount: 1.2, from: 'start' }, ease: 'power2.out',
          scrollTrigger: { trigger: container, start: 'top 80%' } }
      );
      gsap.fromTo('.hm-stat',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: container, start: 'top 80%' } }
      );
    }
  }

  // ── PUBLIC ─────────────────────────────────────────────────────────────────
  window.initHeatmap = function (races) {
    const container = document.getElementById('heatmapContainer');
    if (!container) return;
    render(container, races);
  };
})();
