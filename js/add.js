(function () {
  'use strict';

  const STORAGE_KEY = 'vg_races_v2';
  const MAX_PX = 1200;

  function getRaces() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function saveRaces(races) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(races));
  }

  const params = new URLSearchParams(location.search);
  const editId = params.get('id');

  function resizeImage(file, maxPx) {
    return new Promise(resolve => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          if (width > height) { height = Math.round(height * maxPx / width); width = maxPx; }
          else { width = Math.round(width * maxPx / height); height = maxPx; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = url;
    });
  }

  function setupPhotoUpload(inputId, previewId, dropAreaId, onLoad) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const dropArea = document.getElementById(dropAreaId);

    async function handleFile(file) {
      if (!file || !file.type.startsWith('image/')) return;
      const b64 = await resizeImage(file, MAX_PX);
      preview.src = b64;
      preview.classList.add('visible');
      onLoad(b64);
    }

    input.addEventListener('change', e => handleFile(e.target.files[0]));
    dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.classList.add('drag-over'); });
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag-over'));
    dropArea.addEventListener('drop', e => { e.preventDefault(); dropArea.classList.remove('drag-over'); handleFile(e.dataTransfer.files[0]); });
  }

  let bibPhotoData = null;
  let medalPhotoData = null;

  function getFormData() {
    return {
      id:                editId || String(Date.now()),
      name:              document.getElementById('name').value.trim(),
      date:              document.getElementById('date').value,
      location:          document.getElementById('location').value.trim(),
      category:          document.getElementById('category').value,
      medalType:         document.getElementById('medalType').value,
      bibNumber:         document.getElementById('bibNumber').value.trim(),
      distance:          document.getElementById('distance').value,
      time:              document.getElementById('time').value.trim(),
      pace:              document.getElementById('pace').value.trim(),
      heartRate:         document.getElementById('heartRate').value,
      heartRateMax:      document.getElementById('heartRateMax').value,
      elevation:         document.getElementById('elevation').value,
      calories:          document.getElementById('calories').value,
      position:          document.getElementById('position').value,
      totalParticipants: document.getElementById('totalParticipants').value,
      stravaUrl:         document.getElementById('stravaUrl').value.trim(),
      notes:             document.getElementById('notes').value.trim(),
      bibPhoto:          bibPhotoData,
      medalPhoto:        medalPhotoData,
    };
  }

  function fillForm(race) {
    ['name','date','location','category','medalType','bibNumber','distance','time','pace',
     'heartRate','heartRateMax','elevation','calories','position','totalParticipants','stravaUrl','notes']
    .forEach(f => { const el = document.getElementById(f); if (el && race[f] != null) el.value = race[f]; });

    if (race.bibPhoto) { bibPhotoData = race.bibPhoto; const p = document.getElementById('bibPreview'); p.src = race.bibPhoto; p.classList.add('visible'); }
    if (race.medalPhoto) { medalPhotoData = race.medalPhoto; const p = document.getElementById('medalPreview'); p.src = race.medalPhoto; p.classList.add('visible'); }
  }

  function validate(data) {
    if (!data.name) { alert('Informe o nome da corrida.'); return false; }
    if (!data.date) { alert('Informe a data da corrida.'); return false; }
    if (!data.distance) { alert('Informe a distância.'); return false; }
    if (!data.time) { alert('Informe o tempo.'); return false; }
    return true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupPhotoUpload('bibPhoto', 'bibPreview', 'bibDropArea', b64 => { bibPhotoData = b64; });
    setupPhotoUpload('medalPhoto', 'medalPreview', 'medalDropArea', b64 => { medalPhotoData = b64; });

    if (editId) {
      const race = getRaces().find(r => r.id === editId);
      if (race) { document.querySelector('.form-page-title').textContent = 'Editar Corrida'; fillForm(race); }
    } else {
      document.getElementById('date').value = new Date().toISOString().split('T')[0];
    }

    document.getElementById('raceForm').addEventListener('submit', e => {
      e.preventDefault();
      const data = getFormData();
      if (!validate(data)) return;
      let races = getRaces();
      races = editId ? races.map(r => r.id === editId ? data : r) : [...races, data];
      saveRaces(races);
      location.href = 'index.html';
    });
  });
})();
