// =========================================================
// COMPLEJO PADEL 3 - CLIENT LOGIC & BOOKING SYSTEM
// =========================================================

window.state = {
  config: {
    nombre: 'COMPLEJO PADEL 3',
    subtitulo: 'Canchas de Pádel & Fútbol · Techadas y Exterior',
    direccion: '',
    maps: '',
    whatsapp: '',
    horaInicio: '14:00',
    horaFin: '24:00',
    diasActivos: [1, 2, 3, 4, 5, 6, 0],
    monedaSimbolo: '$',
    canchas: []
  },
  turnos: [],
  selectedSport: 'todos',
  selectedLocation: 'todos',
  selectedDuration: 1, // 1h or 2hs
  selectedCanchaId: null,
  selectedFecha: null,
  selectedHora: null,
  lastBooking: null,
  isOrganizer: false
};

const DIAS_ADELANTE = 14;
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Utilities
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatDateISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function hoyISO() {
  return formatDateISO(new Date());
}

function horaActualMin() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function formatCurrency(amount) {
  const symbol = window.state.config.monedaSimbolo || '$';
  return `${symbol} ${Number(amount || 0).toLocaleString('es-AR')}`;
}

function formatFechaLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return { dow: DIAS_SEMANA[date.getDay()], num: d };
}

function formatFechaLarga(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DIAS_SEMANA[date.getDay()]} ${d} de ${MESES[m - 1]}`;
}

// Generate Pitch Silhouette SVG
function getCourtSvgHtml(cancha) {
  if (cancha.deporte === 'padel') {
    return `
      <div class="pitch-container pitch-padel">
        <svg class="pitch-svg" viewBox="0 0 200 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Glass perimeter back and side walls -->
          <rect x="6" y="6" width="188" height="78" fill="none" stroke="rgba(0, 210, 255, 0.7)" stroke-width="2" />
          <rect x="8" y="8" width="184" height="74" fill="none" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1" />
          <!-- Service boxes -->
          <line x1="38" y1="8" x2="38" y2="82" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
          <line x1="162" y1="8" x2="162" y2="82" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
          <line x1="38" y1="45" x2="162" y2="45" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
          <!-- Center Net with metallic posts -->
          <line x1="100" y1="4" x2="100" y2="86" stroke="#CCFF00" stroke-width="2.5" stroke-dasharray="3,2" />
          <circle cx="100" cy="5" r="2.5" fill="#CCFF00" />
          <circle cx="100" cy="85" r="2.5" fill="#CCFF00" />
        </svg>
        <div class="pitch-indicator">
          <span>🎾 Pádel (4 jug. · 2 vs 2)</span>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="pitch-container pitch-futbol">
        <svg class="pitch-svg" viewBox="0 0 200 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Outer border -->
          <rect x="5" y="5" width="190" height="80" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
          <!-- Halfway line -->
          <line x1="100" y1="5" x2="100" y2="85" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
          <!-- Center circle -->
          <circle cx="100" cy="45" r="16" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
          <circle cx="100" cy="45" r="1.5" fill="#FFF" />
          <!-- Penalty Area Left -->
          <rect x="5" y="22" width="26" height="46" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
          <!-- Penalty Area Right -->
          <rect x="169" y="22" width="26" height="46" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
        </svg>
        <div class="pitch-indicator">
          <span>⚽ Fútbol ${cancha.jugadores} (${cancha.jugadores} vs ${cancha.jugadores})</span>
        </div>
      </div>
    `;
  }
}

// Generate active dates for next 14 days
function generarProximasFechas() {
  const resultado = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const activos = window.state.config.diasActivos || [];
  for (let i = 0; i < DIAS_ADELANTE; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    if (activos.includes(d.getDay())) {
      resultado.push(formatDateISO(d));
    }
  }
  return resultado;
}

// Generate 1-hour time slots based on opening and closing hours
function generarHorarios() {
  const horarios = [];
  const [hIni, mIni] = (window.state.config.horaInicio || '14:00').split(':').map(Number);
  let [hFin, mFin] = (window.state.config.horaFin || '24:00').split(':').map(Number);
  if (hFin === 0 && mFin === 0) hFin = 24;

  let inicio = hIni * 60 + (mIni || 0);
  const fin = hFin * 60 + (mFin || 0);
  const dur = 60; // 1h fixed

  while (inicio + dur <= fin) {
    const hh = Math.floor(inicio / 60) % 24;
    const mm = inicio % 60;
    horarios.push(`${pad2(hh)}:${pad2(mm)}`);
    inicio += dur;
  }
  return horarios;
}

function horariosDisponibles(canchaId, fecha, duracion = 1) {
  const todos = generarHorarios();
  const duracionHoras = Number(duracion) === 2 ? 2 : 1;

  // Build a set of all occupied individual 1-hour slots
  const ocupados = new Set();
  window.state.turnos
    .filter(t => t.canchaId === canchaId && t.fecha === fecha)
    .forEach(t => {
      const dur = Number(t.duracion) || 1;
      const [hStr, mStr] = t.hora.split(':').map(Number);
      for (let i = 0; i < dur; i++) {
        const hh = (hStr + i) % 24;
        ocupados.add(`${pad2(hh)}:${pad2(mStr || 0)}`);
      }
    });

  const esHoy = fecha === hoyISO();
  const ahora = horaActualMin();

  // Closing hour limit check
  let [hCierre, mCierre] = (window.state.config.horaFin || '24:00').split(':').map(Number);
  if (hCierre === 0 && mCierre === 0) hCierre = 24;
  const cierreMin = hCierre * 60 + (mCierre || 0);

  return todos.map((h, index) => {
    const [hh, mm] = h.split(':').map(Number);
    const pasado = esHoy && (hh * 60 + mm) <= ahora;

    // Check if entire duration (1h or 2h) fits within business hours
    const finSlotMin = (hh + duracionHoras) * 60 + mm;
    const excedeCierre = finSlotMin > cierreMin;

    let estaOcupado = ocupados.has(h) || pasado || excedeCierre;

    if (!estaOcupado && duracionHoras === 2) {
      // Must also check that the next consecutive hour exists and is free
      const siguienteHora = `${pad2((hh + 1) % 24)}:${pad2(mm)}`;
      if (ocupados.has(siguienteHora) || !todos.includes(siguienteHora)) {
        estaOcupado = true;
      }
    }

    return {
      hora: h,
      duracion: duracionHoras,
      ocupado: estaOcupado
    };
  });
}

// Filter canchas
function getCanchasFiltradas() {
  let canchas = window.state.config.canchas || [];
  if (window.state.selectedSport !== 'todos') {
    canchas = canchas.filter(c => c.deporte === window.state.selectedSport);
  }
  if (window.state.selectedLocation !== 'todos') {
    canchas = canchas.filter(c => c.ubicacion === window.state.selectedLocation);
  }
  return canchas;
}

// ================= RENDER FUNCTIONS =================

function renderHeader() {
  const cfg = window.state.config;
  const nameParts = (cfg.nombre || 'COMPLEJO PADEL 3').split(' ');
  
  // Highlighting in title
  const titleEl = document.getElementById('titulo-complejo');
  if (titleEl) {
    titleEl.innerHTML = `${nameParts[0] || 'COMPLEJO'} <span class="hl-blue">${nameParts[1] || 'PADEL'}</span> <span class="hl-neon">${nameParts.slice(2).join(' ') || '3'}</span>`;
  }

  const subEl = document.getElementById('subtitulo');
  if (subEl) {
    subEl.textContent = cfg.subtitulo || 'Canchas de Pádel & Fútbol · Techadas y Exterior';
  }

  const locText = document.getElementById('location-text');
  const locLink = document.getElementById('location-maps-link');
  if (locText && cfg.direccion) {
    locText.textContent = `📍 ${cfg.direccion}`;
    locText.style.display = 'inline-block';
  }
  if (locLink && cfg.maps) {
    locLink.href = cfg.maps;
    locLink.style.display = 'inline-flex';
  }
}

function renderCanchas() {
  const cont = document.getElementById('canchas-grid');
  if (!cont) return;
  cont.innerHTML = '';

  const canchas = getCanchasFiltradas();

  if (canchas.length === 0) {
    cont.innerHTML = `
      <div class="empty" style="grid-column: 1 / -1;">
        No hay canchas disponibles que coincidan con los filtros seleccionados.
      </div>
    `;
    return;
  }

  // Ensure selection is valid
  if (!window.state.selectedCanchaId || !canchas.some(c => c.id === window.state.selectedCanchaId)) {
    window.state.selectedCanchaId = canchas[0].id;
  }

  canchas.forEach(cancha => {
    const isSelected = cancha.id === window.state.selectedCanchaId;
    const card = document.createElement('div');
    card.className = `cancha-card ${isSelected ? 'selected' : ''}`;

    const sportBadgeClass = cancha.deporte === 'padel' ? 'badge-padel' : 'badge-futbol';
    const sportBadgeLabel = cancha.deporte === 'padel' ? '🎾 Pádel' : `⚽ Fútbol ${cancha.jugadores}`;
    const locationBadgeClass = cancha.ubicacion === 'interior' ? 'badge-interior' : 'badge-exterior';
    const locationBadgeLabel = cancha.ubicacion === 'interior' ? '🏠 Interior Techada' : '☀️ Exterior';

    const pitchSvg = getCourtSvgHtml(cancha);

    card.innerHTML = `
      <div class="cancha-card-header">
        <div class="cancha-nombre">${escapeHtml(cancha.nombre)}</div>
      </div>
      <div class="cancha-tags-row">
        <span class="cancha-sport-badge ${sportBadgeClass}">${sportBadgeLabel}</span>
        <span class="badge-location ${locationBadgeClass}">${locationBadgeLabel}</span>
      </div>
      ${pitchSvg}
      <div class="cancha-card-footer">
        <div class="cancha-surface-info" title="${escapeHtml(cancha.superficie || '')}">
          ${escapeHtml(cancha.superficie || 'Césped Pro')}
        </div>
        <div class="cancha-price-tag">
          ${formatCurrency(cancha.precio)} <span class="hour-label">/ h</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      window.state.selectedCanchaId = cancha.id;
      window.state.selectedHora = null;
      document.getElementById('booking-form').style.display = 'none';
      render();
    });

    cont.appendChild(card);
  });
}

function renderFechas() {
  const cont = document.getElementById('fechas-row');
  if (!cont) return;
  cont.innerHTML = '';

  const fechas = generarProximasFechas();
  if (fechas.length === 0) {
    cont.innerHTML = '<p class="info-msg">El complejo no tiene días de atención activos configurados.</p>';
    return;
  }

  if (!window.state.selectedFecha || !fechas.includes(window.state.selectedFecha)) {
    window.state.selectedFecha = fechas[0];
  }

  fechas.forEach(iso => {
    const { dow, num } = formatFechaLabel(iso);
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `fecha-pill ${iso === window.state.selectedFecha ? 'active' : ''}`;
    pill.innerHTML = `<div class="dow">${dow}</div><div class="num">${num}</div>`;
    pill.addEventListener('click', () => {
      window.state.selectedFecha = iso;
      window.state.selectedHora = null;
      document.getElementById('booking-form').style.display = 'none';
      render();
    });
    cont.appendChild(pill);
  });
}

function renderHorarios() {
  const grid = document.getElementById('horarios-grid');
  const vacio = document.getElementById('sin-horarios');
  if (!grid || !vacio) return;
  grid.innerHTML = '';

  if (!window.state.selectedFecha || !window.state.selectedCanchaId) {
    vacio.style.display = 'none';
    return;
  }

  const duracion = window.state.selectedDuration || 1;
  const slots = horariosDisponibles(window.state.selectedCanchaId, window.state.selectedFecha, duracion);

  // Update title with duration note
  const titleEl = document.getElementById('horarios-section-title');
  if (titleEl) {
    titleEl.textContent = `4. Horarios Disponibles (${duracion === 2 ? 'Bloques de 2 Horas Consecutivas' : 'Bloques de 1 Hora'}):`;
  }

  if (slots.length === 0) {
    vacio.style.display = 'block';
    return;
  }
  vacio.style.display = 'none';

  slots.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `horario-btn ${s.hora === window.state.selectedHora ? 'selected' : ''}`;

    const [hStr, mStr] = s.hora.split(':').map(Number);
    const nextH = (hStr + duracion) % 24;
    const slotRangeLabel = `${s.hora} a ${pad2(nextH)}:${pad2(mStr)} (${duracion}h)`;

    btn.innerHTML = `
      <span>${s.hora} hs</span>
      <span class="sub-duration">${slotRangeLabel}</span>
    `;
    btn.disabled = s.ocupado;
    if (s.ocupado) {
      btn.title = duracion === 2 ? 'No disponible para 2 horas consecutivas' : 'Horario no disponible';
    }

    btn.addEventListener('click', () => {
      window.state.selectedHora = s.hora;
      const cancha = (window.state.config.canchas || []).find(c => c.id === window.state.selectedCanchaId);

      document.getElementById('confirm-panel').style.display = 'none';
      document.getElementById('booking-form').style.display = 'block';

      // Summary
      const slotTitleEl = document.getElementById('selected-slot-label');
      if (slotTitleEl && cancha) {
        const sportIcon = cancha.deporte === 'padel' ? '🎾' : '⚽';
        const durLabel = duracion === 2 ? '2 Horas (Doble Turno)' : '1 Hora';
        slotTitleEl.textContent = `${sportIcon} ${cancha.nombre} · ${formatFechaLarga(window.state.selectedFecha)} · ${s.hora} a ${pad2(nextH)}:${pad2(mStr)} hs (${durLabel})`;
      }

      const tagsContainer = document.getElementById('selected-slot-tags');
      if (tagsContainer && cancha) {
        const locLabel = cancha.ubicacion === 'interior' ? '🏠 Interior Techada' : '☀️ Exterior';
        const locClass = cancha.ubicacion === 'interior' ? 'badge-interior' : 'badge-exterior';
        const formatLabel = cancha.deporte === 'padel' ? 'Pádel 2 vs 2' : `Fútbol ${cancha.jugadores}`;
        const durBadge = duracion === 2 ? '<span class="cancha-sport-badge badge-padel" style="font-weight:800;">⏱️ Doble Turno (2hs)</span>' : '';
        tagsContainer.innerHTML = `
          <span class="cancha-sport-badge ${cancha.deporte === 'padel' ? 'badge-padel' : 'badge-futbol'}">${formatLabel}</span>
          <span class="badge-location ${locClass}">${locLabel}</span>
          ${durBadge}
        `;
      }

      // Show Money Total in summary with unit calculation
      const priceValEl = document.getElementById('selected-slot-price-val');
      if (priceValEl && cancha) {
        const totalCalc = Number(cancha.precio || 20000) * duracion;
        if (duracion === 2) {
          priceValEl.innerHTML = `${formatCurrency(totalCalc)} <span style="font-size:11px; opacity:0.8; font-weight:500;">(2hs x ${formatCurrency(cancha.precio)})</span>`;
        } else {
          priceValEl.textContent = formatCurrency(totalCalc);
        }
      }

      document.getElementById('form-error').textContent = '';
      render();
    });
    grid.appendChild(btn);
  });
}

function setupFilterButtons() {
  // Sport Filters
  document.querySelectorAll('[data-filter-sport]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-filter-sport]').forEach(b => {
        b.classList.remove('active', 'active-padel', 'active-futbol');
      });
      const sport = btn.getAttribute('data-filter-sport');
      window.state.selectedSport = sport;

      if (sport === 'padel') {
        btn.classList.add('active-padel');
      } else if (sport === 'futbol') {
        btn.classList.add('active-futbol');
      } else {
        btn.classList.add('active');
      }

      window.state.selectedHora = null;
      document.getElementById('booking-form').style.display = 'none';
      render();
    });
  });

  // Location Filters
  document.querySelectorAll('[data-filter-location]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-filter-location]').forEach(b => b.classList.remove('active'));
      const loc = btn.getAttribute('data-filter-location');
      window.state.selectedLocation = loc;
      btn.classList.add('active');

      window.state.selectedHora = null;
      document.getElementById('booking-form').style.display = 'none';
      render();
    });
  });

  // Duration Filters (1h vs 2h)
  document.querySelectorAll('[data-duration]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-duration]').forEach(b => b.classList.remove('active'));
      const dur = parseInt(btn.getAttribute('data-duration')) || 1;
      window.state.selectedDuration = dur;
      btn.classList.add('active');

      window.state.selectedHora = null;
      document.getElementById('booking-form').style.display = 'none';
      render();
    });
  });
}

// ================= BOOKING SUBMISSION =================

async function reservarTurno() {
  const nombre = document.getElementById('cliente-nombre').value.trim();
  const whatsapp = document.getElementById('cliente-whatsapp').value.trim();
  const equipo = document.getElementById('cliente-equipo').value.trim();
  const errEl = document.getElementById('form-error');
  errEl.textContent = '';

  if (!nombre) {
    errEl.textContent = 'Por favor ingresá tu nombre y apellido.';
    return;
  }
  if (!window.state.selectedCanchaId) {
    errEl.textContent = 'Por favor seleccioná una cancha.';
    return;
  }
  if (!window.state.selectedFecha || !window.state.selectedHora) {
    errEl.textContent = 'Por favor seleccioná un día y horario disponible.';
    return;
  }

  const btn = document.getElementById('btn-reservar');
  btn.disabled = true;
  btn.innerHTML = '<span>Procesando reserva...</span> ⏳';

  try {
    const response = await fetch('/api/turnos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        canchaId: window.state.selectedCanchaId,
        fecha: window.state.selectedFecha,
        hora: window.state.selectedHora,
        duracion: window.state.selectedDuration || 1,
        nombre,
        whatsapp,
        equipo
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      errEl.textContent = data.message || 'No se pudo completar la reserva.';
      btn.disabled = false;
      btn.innerHTML = '<span>Confirmar Reserva de Turno</span> 🎾⚽';
      await loadTurnos();
      render();
      return;
    }

    // Success
    window.state.lastBooking = data.turno;
    window.state.turnos.push(data.turno);

    document.getElementById('cliente-nombre').value = '';
    document.getElementById('cliente-whatsapp').value = '';
    document.getElementById('cliente-equipo').value = '';
    btn.disabled = false;
    btn.innerHTML = '<span>Confirmar Reserva de Turno</span> 🎾⚽';

    document.getElementById('booking-form').style.display = 'none';
    showConfirmationPanel(data.turno);
    render();

  } catch (error) {
    console.error('Error al reservar:', error);
    errEl.textContent = 'Error de conexión con el servidor. Reintentá en unos momentos.';
    btn.disabled = false;
    btn.innerHTML = '<span>Confirmar Reserva de Turno</span> 🎾⚽';
  }
}

function showConfirmationPanel(turno) {
  const panel = document.getElementById('confirm-panel');
  const box = document.getElementById('confirm-card-content');
  const iconBox = document.getElementById('confirm-icon-box');

  const isPadel = turno.deporte === 'padel';
  if (iconBox) {
    iconBox.textContent = isPadel ? '🎾' : '⚽';
    iconBox.style.borderColor = isPadel ? 'var(--padel-neon)' : 'var(--turf-green)';
  }

  const [hStr, mStr] = turno.hora.split(':').map(Number);
  const dur = Number(turno.duracion) || 1;
  const nextH = (hStr + dur) % 24;
  const horaFinTxt = turno.horaFin || `${pad2(nextH)}:${pad2(mStr)}`;
  const cfg = window.state.config;

  const sportLabel = isPadel ? 'Pádel (4 Jugadores / 2 vs 2)' : `Fútbol ${turno.jugadores} (${turno.jugadores} vs ${turno.jugadores})`;
  const locLabel = turno.ubicacion === 'interior' ? '🏠 Interior (Techada)' : '☀️ Exterior (Aire Libre)';
  const durLabel = dur === 2 ? '2 Horas (Doble Turno)' : '1 Hora';

  box.innerHTML = `
    <div class="confirm-row">
      <span class="label">🏟️ Cancha:</span>
      <span class="value">${escapeHtml(turno.canchaNombre)}</span>
    </div>
    <div class="confirm-row">
      <span class="label">🎯 Deporte:</span>
      <span class="value">${sportLabel}</span>
    </div>
    <div class="confirm-row">
      <span class="label">📍 Ubicación:</span>
      <span class="value">${locLabel}</span>
    </div>
    <div class="confirm-row">
      <span class="label">📅 Fecha:</span>
      <span class="value">${formatFechaLarga(turno.fecha)}</span>
    </div>
    <div class="confirm-row">
      <span class="label">⏰ Horario:</span>
      <span class="value">${turno.hora} a ${horaFinTxt} hs (${durLabel})</span>
    </div>
    <div class="confirm-row">
      <span class="label">👤 Jugador / Capitán:</span>
      <span class="value">${escapeHtml(turno.nombre)}</span>
    </div>
    ${turno.equipo ? `
    <div class="confirm-row">
      <span class="label">🏆 Equipo / Pareja:</span>
      <span class="value">${escapeHtml(turno.equipo)}</span>
    </div>` : ''}
    ${cfg.direccion ? `
    <div class="confirm-row">
      <span class="label">📍 Dirección:</span>
      <span class="value">${escapeHtml(cfg.direccion)}</span>
    </div>` : ''}
    ${cfg.maps ? `
    <div class="confirm-row">
      <span class="label">🗺️ Google Maps:</span>
      <span class="value"><a href="${escapeHtml(cfg.maps)}" target="_blank" style="color:var(--cyan-neon);">Ver mapa 📍</a></span>
    </div>` : ''}
    <div class="confirm-total-row">
      <span class="confirm-total-lbl">💰 Total a Pagar:</span>
      <span class="confirm-total-val">${formatCurrency(turno.precio)} ${dur === 2 ? `<span style="font-size:12px; font-weight:400; opacity:0.8;">(2hs x ${formatCurrency(turno.precioUnitario)})</span>` : ''}</span>
    </div>
  `;

  panel.style.display = 'block';
}

function confirmarPorWhatsapp() {
  const last = window.state.lastBooking;
  if (!last) return;

  const cfg = window.state.config;
  const destino = cfg.whatsapp ? cfg.whatsapp.replace(/\D/g, '') : '';
  const [hStr, mStr] = last.hora.split(':').map(Number);
  const dur = Number(last.duracion) || 1;
  const nextH = (hStr + dur) % 24;
  const horaFinTxt = last.horaFin || `${pad2(nextH)}:${pad2(mStr)}`;

  const isPadel = last.deporte === 'padel';
  const sportName = isPadel ? '🎾 PADEL (2 vs 2)' : `⚽ FUTBOL ${last.jugadores}`;
  const locName = last.ubicacion === 'interior' ? '🏠 Interior / Techada' : '☀️ Exterior';
  const durName = dur === 2 ? '2 HORAS / DOBLE TURNO' : '1 HORA';

  const mensaje = 
`*RESERVA DE TURNO - ${cfg.nombre || 'COMPLEJO PADEL 3'}*

*Jugador/Capitán:* ${last.nombre}
${last.equipo ? `*Equipo/Pareja:* ${last.equipo}\n` : ''}*Deporte:* ${sportName}
*Cancha:* ${last.canchaNombre} (${locName})
*Fecha:* ${formatFechaLarga(last.fecha)}
*Horario:* ${last.hora} a ${horaFinTxt} hs (${durName})
*TOTAL A PAGAR:* ${formatCurrency(last.precio)} ${dur === 2 ? `(2hs x ${formatCurrency(last.precioUnitario)})` : ''}
${cfg.direccion ? `*Dirección:* ${cfg.direccion}\n` : ''}${cfg.maps ? `*Ubicación Maps:* ${cfg.maps}\n` : ''}
Hola! Quiero confirmar la reserva de este turno. Muchas gracias!`;

  const url = destino
    ? `https://wa.me/${destino}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

  window.open(url, '_blank');

  // Mark as confirmed on backend
  fetch(`/api/turnos/${last.id}/confirmar`, { method: 'PATCH' }).catch(() => {});
}

// ================= API FETCHING =================

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.success && data.config) {
      window.state.config = data.config;
    }
  } catch (e) {
    console.warn('Error al cargar config de API:', e);
  }
}

async function loadTurnos() {
  try {
    const res = await fetch('/api/turnos');
    const data = await res.json();
    if (data.success && Array.isArray(data.turnos)) {
      window.state.turnos = data.turnos;
    }
  } catch (e) {
    console.warn('Error al cargar turnos de API:', e);
  }
}

function render() {
  renderHeader();
  renderCanchas();
  renderFechas();
  renderHorarios();
  if (typeof window.renderAdminDashboard === 'function') {
    window.renderAdminDashboard();
  }
}

// ================= INITIALIZATION =================

async function initApp() {
  await loadConfig();
  await loadTurnos();
  setupFilterButtons();

  document.getElementById('btn-reservar').addEventListener('click', reservarTurno);
  document.getElementById('btn-confirmar-whatsapp').addEventListener('click', confirmarPorWhatsapp);
  document.getElementById('btn-reservar-otro').addEventListener('click', () => {
    window.state.lastBooking = null;
    window.state.selectedHora = null;
    document.getElementById('confirm-panel').style.display = 'none';
    render();
  });

  document.getElementById('btn-copiar').addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      const btn = document.getElementById('btn-copiar');
      const orig = btn.textContent;
      btn.textContent = '✓ Link copiado al portapapeles';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }).catch(() => {});
  });

  document.getElementById('btn-refrescar').addEventListener('click', async () => {
    await loadConfig();
    await loadTurnos();
    render();
  });

  render();
}

window.addEventListener('DOMContentLoaded', initApp);
