// =========================================================
// COMPLEJO PADEL 3 - CLIENT LOGIC & DYNAMIC BOOKING SYSTEM
// =========================================================

window.toggleMobileMenu = function() {
  const menu = document.getElementById('mobile-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
};

window.state = {
  config: {
    nombre: 'COMPLEJO PADEL 3',
    subtitulo: 'Canchas de Pádel & Fútbol · Techadas y Exterior · Buffet y Estacionamiento',
    direccion: 'Lavalle, Mendoza · Complejo Deportivo',
    maps: 'https://maps.google.com/?q=Lavalle+Mendoza',
    whatsapp: '5491112345678',
    horaInicio: '14:00',
    horaFin: '24:00',
    diasActivos: [1, 2, 3, 4, 5, 6, 0],
    monedaSimbolo: '$',
    canchas: []
  },
  servicios: [],
  eventos: [],
  turnos: [],
  selectedSport: 'todos',
  selectedLocation: 'todos',
  selectedDuration: 1, // 1h or 2hs
  selectedCanchaId: null,
  selectedFecha: null,
  selectedHora: null,
  lastBooking: null
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

function sonMismoDia(fechaA, fechaB) {
  if (!fechaA || !fechaB) return false;
  if (fechaA === fechaB) return true;
  if (fechaA.includes(fechaB) || fechaB.includes(fechaA)) return true;
  const matchA = String(fechaA).match(/(?:^|\D)(\d{1,2})(?:\D|$)/);
  const matchB = String(fechaB).match(/(?:^|\D)(\d{1,2})(?:\D|$)/);
  return Boolean(matchA && matchB && matchA[1] === matchB[1]);
}
window.sonMismoDia = sonMismoDia;

// Normalizar la Detección de Deporte
function esCanchaPadel(cancha) {
  if (!cancha) return true;
  const deporteNormalizado = (cancha.deporte || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const esPadel = deporteNormalizado.includes('PADEL') || (cancha.nombre || '').toLowerCase().includes('pista');
  return esPadel;
}
window.esCanchaPadel = esCanchaPadel;

// Generate Pitch Silhouette SVG
function getCourtSvgHtml(cancha) {
  const esPadel = esCanchaPadel(cancha);
  if (esPadel) {
    return `
      <div class="pitch-container pitch-padel h-24 max-h-24 w-full flex items-center justify-center p-2 rounded-xl bg-slate-950/60 border border-sky-500/30 my-2.5 overflow-hidden">
        <svg viewBox="0 0 160 52" class="w-full h-full max-h-20" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
          <!-- Caja azul cian con paredes de cristal -->
          <rect x="2" y="2" width="156" height="48" rx="3" fill="rgba(14, 165, 233, 0.08)" stroke="rgba(14, 165, 233, 0.7)" stroke-width="1.6" />
          <!-- Líneas de saque -->
          <rect x="18" y="5" width="124" height="42" fill="none" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1" />
          <line x1="42" y1="5" x2="42" y2="47" stroke="rgba(255, 255, 255, 0.35)" stroke-width="1" />
          <line x1="118" y1="5" x2="118" y2="47" stroke="rgba(255, 255, 255, 0.35)" stroke-width="1" />
          <line x1="42" y1="26" x2="118" y2="26" stroke="rgba(255, 255, 255, 0.35)" stroke-width="1" />
          <!-- Red central segmentada -->
          <line x1="80" y1="1" x2="80" y2="51" stroke="#00E676" stroke-width="2" stroke-dasharray="3,2" />
          <circle cx="80" cy="3" r="1.5" fill="#00E676" />
          <circle cx="80" cy="49" r="1.5" fill="#00E676" />
        </svg>
      </div>
    `;
  } else {
    return `
      <div class="pitch-container pitch-futbol h-24 max-h-24 w-full flex items-center justify-center p-2 rounded-xl bg-slate-950/60 border border-emerald-500/30 my-2.5 overflow-hidden">
        <svg viewBox="0 0 160 52" class="w-full h-full max-h-20" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
          <!-- Campo verde con área y círculo central -->
          <rect x="2" y="2" width="156" height="48" rx="3" fill="rgba(16, 185, 129, 0.08)" stroke="rgba(16, 185, 129, 0.6)" stroke-width="1.6" />
          <line x1="80" y1="2" x2="80" y2="50" stroke="rgba(255, 255, 255, 0.3)" stroke-width="1" />
          <circle cx="80" cy="26" r="11" fill="none" stroke="rgba(255, 255, 255, 0.35)" stroke-width="1" />
          <circle cx="80" cy="26" r="1.5" fill="#00E676" />
          <rect x="2" y="14" width="16" height="24" fill="none" stroke="rgba(255, 255, 255, 0.3)" stroke-width="1" />
          <rect x="142" y="14" width="16" height="24" fill="none" stroke="rgba(255, 255, 255, 0.3)" stroke-width="1" />
        </svg>
      </div>
    `;
  }
}
window.getCourtSvgHtml = getCourtSvgHtml;

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
  const dur = 60; // 1h

  while (inicio + dur <= fin) {
    const hh = Math.floor(inicio / 60) % 24;
    const mm = inicio % 60;
    horarios.push(`${pad2(hh)}:${pad2(mm)}`);
    inicio += dur;
  }
  return horarios;
}

function matchCancha(reserva, cancha) {
  if (!reserva || !cancha) return false;
  const resCanchaId = String(reserva.canchaId || '').toLowerCase().trim();
  const targetId = String(cancha.id || '').toLowerCase().trim();
  if (resCanchaId && targetId && resCanchaId === targetId) {
    return true;
  }
  const nombreReserva = String(reserva.canchaNombre || reserva.cancha || reserva.nombreCancha || '').toLowerCase().trim();
  const nombreCancha = String(cancha.nombre || '').toLowerCase().trim();
  if (nombreReserva && nombreCancha) {
    if (nombreReserva === nombreCancha) return true;
    if (nombreReserva.includes(nombreCancha) || nombreCancha.includes(nombreReserva)) return true;
    const cleanRes = nombreReserva.replace(/[^a-z0-9]/g, '');
    const cleanCan = nombreCancha.replace(/[^a-z0-9]/g, '');
    if (cleanRes && cleanCan && (cleanRes.includes(cleanCan) || cleanCan.includes(cleanRes))) return true;
  }
  return false;
}

function getHorasOcupadas(reserva) {
  if (!reserva) return [];

  // 1. Detectar formato "14:00 a 16:00", "14:00 - 16:00" o similar
  const str = `${reserva.horario || ''} ${reserva.hora || ''} ${reserva.horaFin || ''}`;
  const match = str.match(/(\d{1,2}):(\d{2})/g);

  if (match && match.length >= 2) {
    const inicio = parseInt(match[0].split(':')[0]);
    const fin = parseInt(match[1].split(':')[0]);
    if (fin > inicio) {
      const ocupados = [];
      for (let h = inicio; h < fin; h++) {
        ocupados.push(`${String(h).padStart(2, '0')}:00`);
      }
      return ocupados;
    }
  }

  const dur = Number(reserva.duracion) || 1;
  if (reserva.hora) {
    const [hStr, mStr] = String(reserva.hora).split(':').map(Number);
    const ocupados = [];
    for (let i = 0; i < dur; i++) {
      const hh = (hStr + i) % 24;
      ocupados.push(`${pad2(hh)}:${pad2(mStr || 0)}`);
    }
    return ocupados;
  }

  return [String(reserva.horario || reserva.hora || '')].filter(Boolean);
}

function slotEstaOcupado(reserva, slotHora) {
  if (!reserva || !slotHora) return false;
  const horaSlotNum = parseInt(String(slotHora).split(':')[0], 10);
  
  // Si tiene horario en formato "14:00 a 16:00"
  const textoHorario = reserva.horario || reserva.hora || '';
  const matches = String(textoHorario).match(/(\d\d):(\d\d)/g);
  
  if (matches && matches.length >= 2) {
    const inicioNum = parseInt(matches[0].split(':')[0], 10);
    const finNum = parseInt(matches[1].split(':')[0], 10);
    // Ocupa desde el inicio hasta estrictamente antes del fin: inicio <= slot < fin
    return horaSlotNum >= inicioNum && horaSlotNum < finNum;
  }
  
  // Si solo tiene hora simple "14:00"
  if (reserva.hora) {
    const inicioNum = parseInt(String(reserva.hora).split(':')[0], 10);
    const durStr = String(reserva.duracion || '');
    const duracionHoras = (durStr === '2h' || durStr === '2 horas' || durStr.includes('2') || Number(reserva.duracion) === 2) ? 2 : 1;
    return horaSlotNum >= inicioNum && horaSlotNum < (inicioNum + duracionHoras);
  }
  
  return false;
}
window.slotEstaOcupado = slotEstaOcupado;

function horariosDisponibles(canchaId, fecha, duracion = 1) {
  const todos = generarHorarios();
  const duracionHoras = Number(duracion) === 2 ? 2 : 1;
  const cancha = (window.state.config.canchas || []).find(c => c.id === canchaId) || { id: canchaId, nombre: '' };

  const reservasDelDia = (window.state.turnos || []).filter(r => {
    if (!r) return false;
    const estado = String(r.estado || '').toLowerCase().trim();
    if (['cancelado', 'liberado', 'anulado', 'disponible'].includes(estado)) {
      return false;
    }
    const mismaCancha = (r.cancha || r.canchaNombre || '').toLowerCase().includes(cancha.nombre.toLowerCase().trim()) ||
                        cancha.nombre.toLowerCase().trim().includes((r.cancha || r.canchaNombre || '').toLowerCase()) ||
                        matchCancha(r, cancha);
    const mismaFecha = sonMismoDia(r.fecha || r.fechaTexto, fecha);
    return mismaCancha && mismaFecha;
  });

  const esHoy = fecha === hoyISO();
  const ahora = horaActualMin();

  // Closing hour limit check
  let [hCierre, mCierre] = (window.state.config.horaFin || '24:00').split(':').map(Number);
  if (hCierre === 0 && mCierre === 0) hCierre = 24;
  const cierreMin = hCierre * 60 + (mCierre || 0);

  return todos.map((h) => {
    const [hh, mm] = h.split(':').map(Number);
    const pasado = esHoy && (hh * 60 + mm) <= ahora;

    const finSlotMin = (hh + duracionHoras) * 60 + mm;
    const excedeCierre = finSlotMin > cierreMin;

    const ocupadoH = reservasDelDia.some(r => slotEstaOcupado(r, h));
    let estaOcupado = ocupadoH || pasado || excedeCierre;

    if (!estaOcupado && duracionHoras === 2) {
      const siguienteHora = `${pad2((hh + 1) % 24)}:${pad2(mm)}`;
      const ocupadoSiguiente = reservasDelDia.some(r => slotEstaOcupado(r, siguienteHora));
      if (ocupadoSiguiente || !todos.includes(siguienteHora)) {
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

window.matchCancha = matchCancha;
window.getHorasOcupadas = getHorasOcupadas;
window.horariosDisponibles = horariosDisponibles;

// Filter canchas
function getCanchasFiltradas() {
  let canchas = (window.state?.config?.canchas || []).filter(c => c && c.activo !== false);

  if (window.state?.selectedSport && window.state.selectedSport !== 'todos') {
    const filterNorm = String(window.state.selectedSport).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    if (filterNorm.includes('PAD')) {
      canchas = canchas.filter(c => esCanchaPadel(c));
    } else if (filterNorm.includes('FUT')) {
      canchas = canchas.filter(c => !esCanchaPadel(c));
    }
  }

  if (window.state?.selectedLocation && window.state.selectedLocation !== 'todos') {
    const locFilter = String(window.state.selectedLocation).toLowerCase();
    canchas = canchas.filter(c => {
      const ubi = String(c.ubicacion || '').toLowerCase();
      if (locFilter.includes('int') || locFilter.includes('tech')) {
        return ubi.includes('int') || ubi.includes('tech');
      }
      if (locFilter.includes('ext')) {
        return ubi.includes('ext');
      }
      return ubi.includes(locFilter);
    });
  }

  return canchas;
}
window.getCanchasFiltradas = getCanchasFiltradas;

// ================= RENDER FUNCTIONS =================

function renderHeader() {
  const cfg = window.state.config;

  const subEl = document.getElementById('hero-subtitle');
  if (subEl && cfg.subtitulo) {
    subEl.textContent = cfg.subtitulo;
  }

  const dirEl = document.getElementById('footer-direccion');
  if (dirEl && cfg.direccion) {
    dirEl.textContent = cfg.direccion;
  }

  const mapsBtn = document.getElementById('btn-google-maps');
  if (mapsBtn && cfg.maps) {
    mapsBtn.href = cfg.maps;
  }

  const waLink = document.getElementById('footer-wa-link');
  if (waLink && cfg.whatsapp) {
    const cleanPhone = String(cfg.whatsapp).replace(/\D/g, '');
    waLink.href = `https://wa.me/${cleanPhone}`;
  }

  const bottomWa = document.getElementById('bottom-nav-wa');
  if (bottomWa && cfg.whatsapp) {
    const cleanPhone = String(cfg.whatsapp).replace(/\D/g, '');
    bottomWa.href = `https://wa.me/${cleanPhone}`;
  }
}

function renderCanchas() {
  const cont = document.getElementById('canchas-grid');
  if (!cont) return;
  cont.innerHTML = '';

  const canchas = getCanchasFiltradas();

  if (canchas.length === 0) {
    cont.innerHTML = `
      <div class="p-8 rounded-2xl bg-[#161F30] border border-slate-800 text-center text-slate-400 col-span-full">
        No hay canchas disponibles que coincidan con los filtros seleccionados.
      </div>
    `;
    return;
  }

  if (!window.state.selectedCanchaId || !canchas.some(c => c.id === window.state.selectedCanchaId)) {
    window.state.selectedCanchaId = canchas[0].id;
  }

  canchas.forEach(cancha => {
    const isSelected = cancha.id === window.state.selectedCanchaId;
    const card = document.createElement('div');
    card.className = `glass-card p-5 cursor-pointer transition-all duration-300 ${isSelected ? 'border-2 border-[#00E676] bg-[#1C273D] shadow-[0_0_25px_rgba(0,230,118,0.25)]' : 'border border-slate-800 hover:border-slate-600'}`;

    const esPadel = esCanchaPadel(cancha);
    const sportBadgeHtml = esPadel
      ? '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">🎾 Pádel (2 vs 2)</span>'
      : `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">⚽ ${cancha.formato || (cancha.jugadores ? 'Fútbol ' + cancha.jugadores : 'Fútbol')}</span>`;

    const ubiNormalizado = String(cancha.ubicacion || '').toLowerCase();
    const esInterior = ubiNormalizado.includes('int') || ubiNormalizado.includes('tech');
    const locationBadgeHtml = esInterior
      ? '<span class="badge-location-interior">🏠 Techada</span>'
      : '<span class="badge-location-exterior">☀️ Exterior</span>';

    const pitchSvg = getCourtSvgHtml(cancha);

    card.innerHTML = `
      <div class="flex items-center justify-between gap-2 mb-3">
        <h4 class="font-sports text-lg font-bold text-white tracking-wide truncate">${escapeHtml(cancha.nombre)}</h4>
        ${isSelected ? '<span class="w-2.5 h-2.5 rounded-full bg-[#00E676] shadow-[0_0_8px_#00E676]"></span>' : ''}
      </div>
      <div class="flex items-center gap-2 mb-3">
        ${sportBadgeHtml}
        ${locationBadgeHtml}
      </div>
      ${pitchSvg}
      <div class="flex items-center justify-between pt-3 mt-2 border-t border-slate-800">
        <div class="text-xs text-slate-400 truncate max-w-[140px]" title="${escapeHtml(cancha.superficie || '')}">
          ${escapeHtml(cancha.superficie || 'Césped Pro')}
        </div>
        <div class="font-bebas text-2xl text-[#00E676]">
          ${formatCurrency(cancha.precio)} <span class="text-xs font-body text-slate-400">/ h</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      window.state.selectedCanchaId = cancha.id;
      window.state.selectedHora = null;
      document.getElementById('booking-form').classList.add('hidden');
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
    cont.innerHTML = '<p class="text-slate-400 text-sm">El complejo no tiene días de atención activos configurados.</p>';
    return;
  }

  if (!window.state.selectedFecha || !fechas.includes(window.state.selectedFecha)) {
    window.state.selectedFecha = fechas[0];
  }

  fechas.forEach(iso => {
    const { dow, num } = formatFechaLabel(iso);
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `fecha-pill-modern ${iso === window.state.selectedFecha ? 'active' : ''}`;
    pill.innerHTML = `<div class="dow">${dow}</div><div class="num">${num}</div>`;
    pill.addEventListener('click', () => {
      window.state.selectedFecha = iso;
      window.state.selectedHora = null;
      document.getElementById('booking-form').classList.add('hidden');
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
    vacio.classList.add('hidden');
    return;
  }

  const duracion = window.state.selectedDuration || 1;
  const slots = horariosDisponibles(window.state.selectedCanchaId, window.state.selectedFecha, duracion);

  const titleEl = document.getElementById('horarios-section-title');
  if (titleEl) {
    titleEl.textContent = `4. Horarios Disponibles (${duracion === 2 ? 'Turno Doble de 2 Horas' : 'Turno de 1 Hora'}):`;
  }

  if (slots.length === 0 || slots.every(s => s.ocupado)) {
    vacio.classList.remove('hidden');
  } else {
    vacio.classList.add('hidden');
  }

  slots.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `slot-btn-modern ${s.hora === window.state.selectedHora ? 'selected' : ''}`;

    const [hStr, mStr] = s.hora.split(':').map(Number);
    const nextH = (hStr + duracion) % 24;
    const slotRangeLabel = `${s.hora} a ${pad2(nextH)}:${pad2(mStr)}`;

    btn.innerHTML = `
      <span class="text-base font-sports tracking-wide">${s.hora} hs</span>
      <span class="sub-label">${slotRangeLabel}</span>
    `;
    btn.disabled = s.ocupado;
    if (s.ocupado) {
      btn.classList.add('opacity-40', 'pointer-events-none', 'bg-slate-800', 'line-through');
    }

    if (!s.ocupado) {
      btn.addEventListener('click', () => {
        window.state.selectedHora = s.hora;
        const cancha = (window.state.config.canchas || []).find(c => c.id === window.state.selectedCanchaId);

        document.getElementById('confirm-panel').classList.add('hidden');
        document.getElementById('booking-form').classList.remove('hidden');

        // Update booking summary
        const slotTitleEl = document.getElementById('selected-slot-label');
        if (slotTitleEl && cancha) {
          const sportIcon = cancha.deporte === 'padel' ? '🎾' : '⚽';
          const durLabel = duracion === 2 ? '2 Horas (Doble Turno)' : '1 Hora';
          slotTitleEl.textContent = `${sportIcon} ${cancha.nombre} · ${formatFechaLarga(window.state.selectedFecha)} · ${s.hora} a ${pad2(nextH)}:${pad2(mStr)} hs (${durLabel})`;
        }

        const tagsContainer = document.getElementById('selected-slot-tags');
        if (tagsContainer && cancha) {
          const isPadel = cancha.deporte === 'padel';
          const locLabel = cancha.ubicacion === 'interior' ? '🏠 Interior Techada' : '☀️ Exterior';
          const locClass = cancha.ubicacion === 'interior' ? 'badge-location-interior' : 'badge-location-exterior';
          const formatLabel = isPadel ? 'Pádel 2 vs 2' : `Fútbol ${cancha.jugadores || 5}`;
          const durBadge = duracion === 2 ? '<span class="badge-neon font-bold">⏱️ Doble Turno (2hs)</span>' : '';
          tagsContainer.innerHTML = `
            <span class="${isPadel ? 'badge-neon' : 'badge-location-interior'}">${formatLabel}</span>
            <span class="${locClass}">${locLabel}</span>
            ${durBadge}
          `;
        }

        const priceValEl = document.getElementById('selected-slot-price-val');
        if (priceValEl && cancha) {
          const totalCalc = Number(cancha.precio || 20000) * duracion;
          if (duracion === 2) {
            priceValEl.innerHTML = `${formatCurrency(totalCalc)} <span class="text-xs font-body text-slate-400 font-normal">(2hs x ${formatCurrency(cancha.precio)})</span>`;
          } else {
            priceValEl.textContent = formatCurrency(totalCalc);
          }
        }

        document.getElementById('form-error').textContent = '';
        render();

        // Smooth scroll to form on mobile
        document.getElementById('booking-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }

    grid.appendChild(btn);
  });
}

function renderServicios() {
  const grid = document.getElementById('servicios-slider') || document.getElementById('servicios-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const servicios = window.state.servicios || [];
  if (servicios.length === 0) {
    grid.innerHTML = '<p class="text-slate-400 col-span-full text-center">No hay servicios cargados actualmente.</p>';
    return;
  }

  // Map icon names to Lucide icons
  const iconMap = {
    'Trophy': 'trophy',
    'Flame': 'flame',
    'Utensils': 'utensils',
    'ShieldCheck': 'shield-check',
    'Car': 'car',
    'HeartPulse': 'heart-pulse',
    'Sparkles': 'sparkles',
    'Gift': 'gift',
    'Wifi': 'wifi',
    'Tv': 'tv',
    'Medal': 'medal',
    'Activity': 'activity'
  };

  servicios.filter(s => s.activo !== false).forEach(srv => {
    const card = document.createElement('div');
    card.className = 'flex-shrink-0 w-[84vw] sm:w-[320px] md:w-[360px] snap-start bg-[#0e1626] border border-slate-800 rounded-2xl overflow-hidden shadow-lg p-4 flex flex-col justify-between group transition-all duration-300 hover:border-[#00E676]/40 hover:shadow-[0_0_30px_rgba(0,230,118,0.15)]';

    const lucideName = iconMap[srv.icono] || 'check-circle-2';
    const tagsHtml = (srv.tags || []).map(t => `<span class="text-[10px] bg-[#1E293B] border border-slate-700/80 text-slate-300 px-2 py-0.5 rounded-md font-medium">${escapeHtml(t)}</span>`).join('');
    const defaultImg = 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80';
    const imgUrl = srv.imagen || defaultImg;
    const catBadge = srv.categoria || 'SERVICIO';

    card.innerHTML = `
      <div>
        <div class="relative h-36 w-full overflow-hidden rounded-xl mb-2">
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(srv.titulo)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          <div class="absolute inset-0 bg-gradient-to-t from-[#0e1626] via-transparent to-transparent"></div>
          <div class="absolute top-2 left-2">
            <span class="badge-neon font-bold text-[10px] py-0.5 px-2 backdrop-blur-md shadow-md uppercase tracking-wider">
              ${escapeHtml(catBadge)}
            </span>
          </div>
        </div>

        <div class="p-1 space-y-1">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-[#1E293B] border border-[#00E676]/30 group-hover:border-[#00E676] flex items-center justify-center text-[#00E676] shrink-0 shadow-[0_0_10px_rgba(0,230,118,0.1)]">
              <i data-lucide="${lucideName}" class="w-3.5 h-3.5"></i>
            </div>
            <h3 class="text-sm font-sports font-bold text-white tracking-wide uppercase leading-tight truncate">${escapeHtml(srv.titulo)}</h3>
          </div>
          <p class="line-clamp-2 text-xs text-slate-400 leading-snug">${escapeHtml(srv.descripcion)}</p>
        </div>
      </div>

      <div class="pt-2 mt-2 border-t border-slate-800/80">
        <div class="flex flex-wrap gap-1">
          ${tagsHtml}
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();
  if (window.setupCarousel) {
    window.setupCarousel('servicios-slider', 'btn-servicios-prev', 'btn-servicios-next');
  }
  if (window.startAutoScroll) {
    window.startAutoScroll('servicios-slider', 4000);
  }
}

function renderEventos() {
  const grid = document.getElementById('eventos-slider') || document.getElementById('eventos-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const eventos = window.state.eventos || [];
  if (eventos.length === 0) {
    grid.innerHTML = '<p class="text-slate-400 col-span-full text-center">No hay eventos ni torneos programados en este momento. ¡Volvé a consultar pronto!</p>';
    return;
  }

  const cfg = window.state.config;

  eventos.filter(e => e.activo !== false).forEach(ev => {
    const card = document.createElement('div');
    card.className = 'flex-shrink-0 w-[84vw] sm:w-[320px] md:w-[360px] snap-start bg-[#0e1626] border border-slate-800 rounded-2xl overflow-hidden shadow-lg p-4 flex flex-col justify-between group transition-all duration-300 hover:border-[#00E676]/40 hover:shadow-[0_0_30px_rgba(0,230,118,0.15)]';

    const cleanWa = ev.whatsappContacto ? String(ev.whatsappContacto).replace(/\D/g, '') : (cfg.whatsapp ? String(cfg.whatsapp).replace(/\D/g, '') : '');
    const waMsg = `Hola! Quiero inscribirme / consultar información sobre el evento: *${ev.titulo}* (${ev.fecha})`;
    const waUrl = cleanWa ? `https://wa.me/${cleanWa}?text=${encodeURIComponent(waMsg)}` : `https://wa.me/?text=${encodeURIComponent(waMsg)}`;

    const isAvailable = ev.estado === 'Inscripciones Abiertas';
    const statusBadgeClass = isAvailable ? 'bg-[#00E676]/20 text-[#00E676] border-[#00E676]/40' : (ev.estado === 'Últimos Cupos' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-red-500/20 text-red-400 border-red-500/40');

    card.innerHTML = `
      <div>
        <div class="relative h-36 w-full overflow-hidden rounded-xl mb-2">
          <img src="${escapeHtml(ev.imagen || 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80')}" alt="${escapeHtml(ev.titulo)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          <div class="absolute inset-0 bg-gradient-to-t from-[#0e1626] via-transparent to-transparent"></div>
          <div class="absolute top-2 left-2">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeClass} backdrop-blur-md">
              ${escapeHtml(ev.estado)}
            </span>
          </div>
          <div class="absolute top-2 right-2">
            <span class="badge-neon text-[10px] py-0.5 px-2 backdrop-blur-md">
              ${escapeHtml(ev.categoria || 'Torneo')}
            </span>
          </div>
        </div>

        <div class="p-1 space-y-1">
          <div class="text-[10px] text-[#00E676] font-semibold uppercase tracking-wider flex items-center gap-1">
            <i data-lucide="calendar" class="w-3 h-3"></i>
            <span>${escapeHtml(ev.fecha)} · ${escapeHtml(ev.horario || '')}</span>
          </div>
          <h3 class="text-sm font-sports font-bold text-white tracking-wide uppercase leading-tight truncate">${escapeHtml(ev.titulo)}</h3>
          <p class="line-clamp-2 text-xs text-slate-400 leading-snug">${escapeHtml(ev.descripcion)}</p>

          ${ev.premio ? `
          <div class="p-1.5 rounded-lg bg-[#0B0F19] border border-amber-500/30 flex items-center gap-2 mt-1">
            <i data-lucide="award" class="w-3.5 h-3.5 text-[#FFD600] shrink-0"></i>
            <span class="text-[10px] font-bold text-amber-300 truncate">${escapeHtml(ev.premio)}</span>
          </div>` : ''}
        </div>
      </div>

      <div class="pt-2 mt-2 border-t border-slate-800/80">
        <a href="${waUrl}" target="_blank" class="w-full py-2 px-3 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md">
          <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
          <span>Inscribirme por WhatsApp</span>
        </a>
      </div>
    `;

    grid.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();
  if (window.setupCarousel) {
    window.setupCarousel('eventos-slider', 'btn-eventos-prev', 'btn-eventos-next');
  }
  if (window.startAutoScroll) {
    window.startAutoScroll('eventos-slider', 4500);
  }
}

function setupFilterButtons() {
  // Sport Filters
  document.querySelectorAll('[data-filter-sport]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-sport]').forEach(b => b.classList.remove('active', 'active-padel', 'active-futbol'));
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
      document.getElementById('booking-form').classList.add('hidden');
      render();
    });
  });

  // Location Filters
  document.querySelectorAll('[data-filter-location]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-location]').forEach(b => b.classList.remove('active'));
      const loc = btn.getAttribute('data-filter-location');
      window.state.selectedLocation = loc;
      btn.classList.add('active');

      window.state.selectedHora = null;
      document.getElementById('booking-form').classList.add('hidden');
      render();
    });
  });

  // Duration Filters (1h vs 2h)
  document.querySelectorAll('[data-duration]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-duration]').forEach(b => b.classList.remove('active'));
      const dur = parseInt(btn.getAttribute('data-duration')) || 1;
      window.state.selectedDuration = dur;
      btn.classList.add('active');

      window.state.selectedHora = null;
      document.getElementById('booking-form').classList.add('hidden');
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
      btn.innerHTML = '<i data-lucide="check-circle-2" class="w-5 h-5 text-black"></i><span>Confirmar Reserva de Turno</span>';
      if (window.lucide) window.lucide.createIcons();
      await loadTurnos();
      render();
      return;
    }

    // Success
    window.state.lastBooking = data.turno;
    if (!Array.isArray(window.state.turnos)) window.state.turnos = [];
    window.state.turnos.push(data.turno);

    if (dbFs) {
      const canchaObj = (window.state.config?.canchas || []).find(c => c.id === window.state.selectedCanchaId);
      const durStr = String(window.state.selectedDuration || 1).includes('2') || Number(window.state.selectedDuration) === 2 ? '2h' : '1h';
      const durNum = durStr === '2h' ? 2 : 1;
      const [hIniStr, mIniStr] = String(window.state.selectedHora || '00:00').split(':').map(Number);
      const nextH = (hIniStr + durNum) % 24;
      const horaFin = `${pad2(nextH)}:${pad2(mIniStr || 0)}`;

      const precioUnit = Number(canchaObj?.precio) >= 0 ? Number(canchaObj.precio) : 24000;
      const precioTotal = precioUnit * durNum;

      const serverTs = (window.firebase?.firestore?.FieldValue?.serverTimestamp)
        ? firebase.firestore.FieldValue.serverTimestamp()
        : new Date().toISOString();

      const nuevaReserva = {
        cliente: String(nombre).trim(),
        telefono: String(whatsapp || '').trim(),
        cancha: String(canchaObj?.nombre || data.turno.canchaNombre || 'Pista').trim(),
        deporte: (canchaObj?.deporte || data.turno.deporte || 'padel').toUpperCase().includes('FUT') ? 'FUTBOL' : 'PADEL',
        fecha: window.state.selectedFecha,
        fechaTexto: (typeof formatFechaLarga === 'function') ? formatFechaLarga(window.state.selectedFecha) : window.state.selectedFecha,
        hora: window.state.selectedHora,
        horario: `${window.state.selectedHora} a ${horaFin} hs`,
        duracion: durStr,
        precio: Number(precioTotal) || 0,
        estado: "pendiente",
        creadoEn: serverTs,
        // Campos retrocompatibles seguros
        id: data.turno.id,
        nombre: String(nombre).trim(),
        whatsapp: String(whatsapp || '').trim(),
        canchaNombre: String(canchaObj?.nombre || data.turno.canchaNombre || 'Pista').trim(),
        canchaId: window.state.selectedCanchaId || ''
      };

      dbFs.collection('reservas').doc(data.turno.id).set(nuevaReserva, { merge: true }).catch(e => console.warn('Error Firestore reservas:', e));
      dbFs.collection('turnos').doc(data.turno.id).set(nuevaReserva, { merge: true }).catch(e => console.warn('Error Firestore turnos:', e));
    }

    document.getElementById('cliente-nombre').value = '';
    document.getElementById('cliente-whatsapp').value = '';
    document.getElementById('cliente-equipo').value = '';
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="check-circle-2" class="w-5 h-5 text-black"></i><span>Confirmar Reserva de Turno</span>';
    if (window.lucide) window.lucide.createIcons();

    document.getElementById('booking-form').classList.add('hidden');
    showConfirmationPanel(data.turno);
    render();

  } catch (error) {
    console.error('Error al reservar:', error);
    errEl.textContent = 'Error de conexión con el servidor. Reintentá en unos momentos.';
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="check-circle-2" class="w-5 h-5 text-black"></i><span>Confirmar Reserva de Turno</span>';
    if (window.lucide) window.lucide.createIcons();
  }
}

function showConfirmationPanel(turno) {
  const panel = document.getElementById('confirm-panel');
  const box = document.getElementById('confirm-card-content');
  const iconBox = document.getElementById('confirm-icon-box');

  const isPadel = turno.deporte === 'padel';
  if (iconBox) {
    iconBox.textContent = isPadel ? '🎾' : '⚽';
    iconBox.style.borderColor = isPadel ? '#00E676' : '#10B981';
  }

  const [hStr, mStr] = turno.hora.split(':').map(Number);
  const dur = Number(turno.duracion) || 1;
  const nextH = (hStr + dur) % 24;
  const horaFinTxt = turno.horaFin || `${pad2(nextH)}:${pad2(mStr)}`;
  const cfg = window.state.config;

  const sportLabel = isPadel ? 'Pádel (4 Jugadores / 2 vs 2)' : `Fútbol ${turno.jugadores || 5}`;
  const locLabel = turno.ubicacion === 'interior' ? '🏠 Interior (Techada)' : '☀️ Exterior (Aire Libre)';
  const durLabel = dur === 2 ? '2 Horas (Doble Turno)' : '1 Hora';

  box.innerHTML = `
    <div class="flex justify-between items-center py-1.5 border-b border-slate-800 text-xs">
      <span class="text-slate-400 font-semibold uppercase">🏟️ Cancha:</span>
      <span class="font-bold text-white">${escapeHtml(turno.canchaNombre)}</span>
    </div>
    <div class="flex justify-between items-center py-1.5 border-b border-slate-800 text-xs">
      <span class="text-slate-400 font-semibold uppercase">🎯 Deporte:</span>
      <span class="font-bold text-white">${sportLabel}</span>
    </div>
    <div class="flex justify-between items-center py-1.5 border-b border-slate-800 text-xs">
      <span class="text-slate-400 font-semibold uppercase">📍 Ubicación:</span>
      <span class="font-bold text-white">${locLabel}</span>
    </div>
    <div class="flex justify-between items-center py-1.5 border-b border-slate-800 text-xs">
      <span class="text-slate-400 font-semibold uppercase">📅 Fecha:</span>
      <span class="font-bold text-white">${formatFechaLarga(turno.fecha)}</span>
    </div>
    <div class="flex justify-between items-center py-1.5 border-b border-slate-800 text-xs">
      <span class="text-slate-400 font-semibold uppercase">⏰ Horario:</span>
      <span class="font-bold text-[#00E676]">${turno.hora} a ${horaFinTxt} hs (${durLabel})</span>
    </div>
    <div class="flex justify-between items-center py-1.5 border-b border-slate-800 text-xs">
      <span class="text-slate-400 font-semibold uppercase">👤 Jugador / Capitán:</span>
      <span class="font-bold text-white">${escapeHtml(turno.nombre)}</span>
    </div>
    ${turno.equipo ? `
    <div class="flex justify-between items-center py-1.5 border-b border-slate-800 text-xs">
      <span class="text-slate-400 font-semibold uppercase">🏆 Equipo / Pareja:</span>
      <span class="font-bold text-[#00E5FF]">${escapeHtml(turno.equipo)}</span>
    </div>` : ''}
    ${cfg.direccion ? `
    <div class="flex justify-between items-center py-1.5 border-b border-slate-800 text-xs">
      <span class="text-slate-400 font-semibold uppercase">📍 Dirección:</span>
      <span class="font-medium text-slate-300">${escapeHtml(cfg.direccion)}</span>
    </div>` : ''}
    <div class="flex justify-between items-center pt-3 text-sm">
      <span class="font-bold text-white uppercase">💰 Total a Pagar:</span>
      <span class="font-bebas text-2xl text-[#00E676]">${formatCurrency(turno.precio)} ${dur === 2 ? `<span class="text-xs font-body text-slate-400 font-normal">(2hs x ${formatCurrency(turno.precioUnitario)})</span>` : ''}</span>
    </div>
  `;

  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
  const sportName = isPadel ? '🎾 PADEL (2 vs 2)' : `⚽ FUTBOL ${last.jugadores || 5}`;
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

// ================= FIREBASE FIRESTORE SYNC =================
let dbFs = null;

const DEFAULT_SERVICIOS = [
  {
    id: 'srv_1',
    titulo: 'Canchas de Pádel WPT',
    categoria: 'PÁDEL PRO',
    imagen: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
    descripcion: 'Pistas panorámicas con césped sintético oficial WPT, cristal templado e iluminación LED proyectada sin sombras.',
    icono: 'Trophy',
    tags: ['4 Canchas Panorámicas', 'Césped WPT', 'Techadas & Exterior'],
    activo: true
  },
  {
    id: 'srv_2',
    titulo: 'Canchas de Fútbol 5 & 7',
    categoria: 'FÚTBOL PREMIUM',
    imagen: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    descripcion: 'Canchas de fútbol con césped sintético de alta densidad 50mm, amortiguación premium e iluminación LED.',
    icono: 'Flame',
    tags: ['Fútbol 5 y 7', 'Sintético 50mm', 'Torneos & Partidos'],
    activo: true
  },
  {
    id: 'srv_3',
    titulo: 'Snack Bar & Tercer Tiempo',
    categoria: 'GASTRONOMÍA',
    imagen: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    descripcion: 'Disfrutá del mejor tercer tiempo con amigos en nuestro buffet equipado. Bebidas frías, picadas, comidas y pantallas HD.',
    icono: 'Utensils',
    tags: ['Bebidas Frías', 'Comidas Rápida', 'Pantallas HD'],
    activo: true
  },
  {
    id: 'srv_4',
    titulo: 'Vestuarios & Duchas',
    categoria: 'COMODIDADES',
    imagen: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    descripcion: 'Instalaciones sanitarias completas con duchas de agua caliente, lockers individuales y máxima higiene permanente.',
    icono: 'ShieldCheck',
    tags: ['Duchas Agua Caliente', 'Lockers Seguros', 'Higiene Pro'],
    activo: true
  },
  {
    id: 'srv_5',
    titulo: 'Estacionamiento Privado',
    categoria: 'SEGURIDAD',
    imagen: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
    descripcion: 'Predio con estacionamiento monitoreado dentro del complejo con fácil acceso a las canchas.',
    icono: 'Car',
    tags: ['Seguridad Monitoreada', 'Acceso Directo', 'Gratuito'],
    activo: true
  },
  {
    id: 'srv_6',
    titulo: 'Ayuda Médica & Seguro',
    categoria: 'SALUD & SEGURIDAD',
    imagen: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    descripcion: 'Área protegida con servicio de emergencia médica y botiquín de primeros auxilios ante cualquier eventualidad.',
    icono: 'HeartPulse',
    tags: ['Área Protegida', 'Servicio Urgencias', 'Primeros Auxilios'],
    activo: true
  },
  {
    id: 'srv_7',
    titulo: 'Alquiler de Paletas & Indumentaria',
    categoria: 'EQUIPAMIENTO',
    imagen: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80',
    descripcion: 'Equipamiento oficial de primeras marcas (Bullpadel, Head, Nox) y venta de accesorios para tu partido.',
    icono: 'Sparkles',
    tags: ['Paletas Pro', 'Tubos Presurizados', 'Grip Nuevo'],
    activo: true
  }
];

const DEFAULT_EVENTOS = [
  {
    id: 'ev_1',
    titulo: 'Gran Torneo Apertura Pádel 2026',
    categoria: '4ta a 7ma Caballeros y Damas',
    fecha: '12 al 14 de Septiembre',
    horario: 'Desde las 18:00 hs',
    estado: 'Inscripciones Abiertas',
    descripcion: 'Torneo de fin de semana con fase de grupos y llaves de eliminación directa. Premios en efectivo, indumentaria oficial y trofeos para campeones y subcampeones.',
    premio: '$ 250.000 en Premios + Trofeos',
    imagen: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
    whatsappContacto: '5491112345678',
    activo: true
  },
  {
    id: 'ev_2',
    titulo: 'Clínica Intensiva de Smash & Bandeja',
    categoria: 'Nivel Inicial e Intermedio',
    fecha: 'Sábado 19 de Septiembre',
    horario: '10:00 a 13:00 hs',
    estado: 'Últimos Cupos',
    descripcion: 'Entrenamiento técnico y táctico con profesores federados. Corrección de golpes de ataque, posicionamiento en pista y videoanálisis.',
    premio: 'Incluye hidratación y kit de entrenamiento',
    imagen: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80',
    whatsappContacto: '5491112345678',
    activo: true
  },
  {
    id: 'ev_3',
    titulo: 'Torneo Relámpago Fútbol 7 Nocturno',
    categoria: 'Libre Masculino (Equipos 7 a 10 jug.)',
    fecha: 'Viernes 25 de Septiembre',
    horario: 'Desde las 20:00 hs',
    estado: 'Inscripciones Abiertas',
    descripcion: 'Copa nocturna bajo iluminación LED. Mínimo 3 partidos garantizados por equipo, asado para el campeón y consumición incluida en el buffet.',
    premio: 'Copa Campeón + Asado completo para 10 personas',
    imagen: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    whatsappContacto: '5491112345678',
    activo: true
  },
  {
    id: 'ev_4',
    titulo: 'CUMPLEAÑOS & EVENTOS INFANTILES',
    categoria: 'Eventos Sociales & Festejos',
    fecha: 'Todos los fines de semana',
    horario: 'Turnos de 3 a 4 hs',
    estado: 'Consultar Disponibilidad / Reservas Abiertas',
    descripcion: 'Festejá tu cumple en el complejo: uso de canchas de fútbol/pádel, espacio techado para pelotero, castillo inflable, mesa dulce, vajilla y coordinador deportivo.',
    premio: 'Incluye vajilla, coordinador deportivo y pelotero techado',
    imagen: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80',
    whatsappContacto: '5491112345678',
    activo: true
  }
];

function initFirestoreApp() {
  const fbConfig = {
    apiKey: "AIzaSyCCjMf1IIcKsLu2wQPqB-UxGa3bmEmVnWs",
    authDomain: "complejo-padel-3.firebaseapp.com",
    projectId: "complejo-padel-3",
    storageBucket: "complejo-padel-3.firebasestorage.app",
    messagingSenderId: "975322009594",
    appId: "1:975322009594:web:e81ead05c09307e7255e43",
    measurementId: "G-RY4RW29MRS"
  };

  try {
    if (window.firebase) {
      if (!firebase.apps.length) {
        firebase.initializeApp(fbConfig);
      }
      dbFs = firebase.firestore();
      setupFirestoreListeners();
    }
  } catch (err) {
    console.warn('Error iniciando Firestore en cliente:', err);
  }
}

function setupFirestoreListeners() {
  if (!dbFs) return;

  // 1. Escuchador de Servicios en tiempo real desde Firestore
  dbFs.collection('servicios').onSnapshot(snapshot => {
    if (!snapshot.empty) {
      const list = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        list.push({
          id: doc.id,
          ...d,
          titulo: d.titulo || d.nombre || '',
          nombre: d.nombre || d.titulo || '',
          tags: d.tags || d.badges || [],
          badges: d.badges || d.tags || []
        });
      });
      window.state.servicios = list;
      renderServicios();
    } else {
      DEFAULT_SERVICIOS.forEach(s => dbFs.collection('servicios').doc(s.id).set(s));
      window.state.servicios = DEFAULT_SERVICIOS;
      renderServicios();
    }
  }, err => console.warn('Firestore listener servicios error:', err));

  // 2. Escuchador de Eventos en tiempo real desde Firestore
  dbFs.collection('eventos').onSnapshot(snapshot => {
    if (!snapshot.empty) {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      window.state.eventos = list;
      renderEventos();
    } else {
      DEFAULT_EVENTOS.forEach(e => dbFs.collection('eventos').doc(e.id).set(e));
      window.state.eventos = DEFAULT_EVENTOS;
      renderEventos();
    }
  }, err => console.warn('Firestore listener eventos error:', err));

  // 3. Escuchador de Turnos / Reservas en tiempo real desde Firestore
  const updateTurnosFromSnapshot = (snapshot) => {
    if (!snapshot) return;
    const currentList = Array.isArray(window.state.turnos) ? [...window.state.turnos] : [];
    snapshot.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };
      const idx = currentList.findIndex(t => t.id === doc.id);
      if (idx >= 0) {
        currentList[idx] = { ...currentList[idx], ...data };
      } else {
        currentList.push(data);
      }
    });
    window.state.turnos = currentList;
    render();
  };

  dbFs.collection('turnos').onSnapshot(updateTurnosFromSnapshot, err => console.warn('Firestore listener turnos error:', err));
  dbFs.collection('reservas').onSnapshot(updateTurnosFromSnapshot, err => console.warn('Firestore listener reservas error:', err));

  // 4. Escuchador de Canchas en tiempo real desde Firestore
  dbFs.collection('canchas').onSnapshot(snapshot => {
    if (!snapshot.empty) {
      const list = [];
      snapshot.forEach(doc => {
        const d = doc.data() || {};
        const depStr = String(d.deporte || 'PADEL').trim().toUpperCase();
        list.push({
          id: doc.id,
          nombre: String(d.nombre || '').trim() || 'Cancha sin nombre',
          deporte: depStr.includes('F') ? 'FUTBOL' : 'PADEL',
          ubicacion: String(d.ubicacion || 'Interior Techada').trim() || 'Interior Techada',
          precio: Number(d.precio) || 0,
          superficie: String(d.superficie || (depStr.includes('F') ? 'Sintético 50mm' : 'Césped Sintético Azul WPT')).trim(),
          jugadores: Number(d.jugadores) || (depStr.includes('F') ? 5 : 4),
          activo: d.activo !== false
        });
      });
      window.state.config = window.state.config || {};
      window.state.config.canchas = list;
      renderCanchas();
      renderReservasPage();
    }
  }, err => console.warn('Firestore listener canchas error:', err));

  // 5. Escuchador de Configuración General
  const updateGeneralConfigFromFirestore = (doc) => {
    if (doc.exists) {
      const d = doc.data();
      window.state.config = {
        ...(window.state.config || {}),
        ...d,
        nombre: d.nombreComplejo || d.nombre || window.state.config?.nombre,
        subtitulo: d.slogan || d.subtitulo || window.state.config?.subtitulo,
        direccion: d.direccion || window.state.config?.direccion,
        maps: d.linkMaps || d.maps || window.state.config?.maps,
        whatsapp: d.whatsapp || window.state.config?.whatsapp,
        horaInicio: d.apertura || d.horaInicio || window.state.config?.horaInicio,
        horaFin: d.cierre || d.horaFin || window.state.config?.horaFin,
        diasActivos: d.diasAtencion || d.diasActivos || window.state.config?.diasActivos
      };
      render();
    }
  };
  dbFs.collection('configuracion').doc('general').onSnapshot(updateGeneralConfigFromFirestore, err => console.warn('Firestore listener configuracion/general error:', err));
  dbFs.collection('config').doc('general').onSnapshot(updateGeneralConfigFromFirestore, err => console.warn('Firestore listener config/general error:', err));
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

async function loadServicios() {
  try {
    const res = await fetch('/api/servicios');
    const data = await res.json();
    if (data.success && Array.isArray(data.servicios) && data.servicios.length > 0) {
      window.state.servicios = data.servicios;
    }
  } catch (e) {
    console.warn('Error al cargar servicios:', e);
  }
}

async function loadEventos() {
  try {
    const res = await fetch('/api/eventos');
    const data = await res.json();
    if (data.success && Array.isArray(data.eventos) && data.eventos.length > 0) {
      window.state.eventos = data.eventos;
    }
  } catch (e) {
    console.warn('Error al cargar eventos:', e);
  }
}

// ================= DEDICATED RESERVAS.HTML PAGE LOGIC =================

function renderReservasPage() {
  const fechasContainer = document.getElementById('fechas-container');
  const canchasBookingGrid = document.getElementById('canchas-booking-grid');
  if (!canchasBookingGrid) return; // Not on reservas.html

  // 1. Render Date Pills
  if (fechasContainer) {
    fechasContainer.innerHTML = '';
    const fechas = generarProximasFechas();
    if (!window.state.selectedFecha || !fechas.includes(window.state.selectedFecha)) {
      window.state.selectedFecha = fechas[0] || hoyISO();
    }

    const labelFecha = document.getElementById('label-fecha-seleccionada');
    if (labelFecha && window.state.selectedFecha) {
      labelFecha.textContent = formatFechaLarga(window.state.selectedFecha);
    }

    fechas.forEach(iso => {
      const { dow, num } = formatFechaLabel(iso);
      const isSelected = iso === window.state.selectedFecha;
      const isToday = iso === hoyISO();

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `flex flex-col items-center justify-center min-w-[65px] py-2.5 px-3 rounded-2xl border transition-all flex-shrink-0 snap-start ${
        isSelected
          ? 'bg-[#00E676] text-black border-[#00E676] font-bold shadow-[0_0_15px_rgba(0,230,118,0.4)] scale-105'
          : 'bg-[#161F30] text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
      }`;
      btn.innerHTML = `
        <span class="text-[11px] uppercase tracking-wider ${isSelected ? 'text-black font-extrabold' : 'text-slate-400 font-semibold'}">${dow}</span>
        <span class="text-xl font-sports font-bold leading-tight ${isSelected ? 'text-black' : 'text-white'}">${num}</span>
        ${isToday ? `<span class="text-[9px] uppercase tracking-widest ${isSelected ? 'text-black' : 'text-[#00E676]'} font-bold">Hoy</span>` : ''}
      `;

      btn.addEventListener('click', () => {
        window.state.selectedFecha = iso;
        renderReservasPage();
      });

      fechasContainer.appendChild(btn);
    });
  }

  // 2. Render Courts with In-Card Time Slots
  canchasBookingGrid.innerHTML = '';
  const canchas = getCanchasFiltradas();
  const duracion = window.state.selectedDuration || 1;

  if (canchas.length === 0) {
    canchasBookingGrid.innerHTML = `
      <div class="p-12 rounded-3xl bg-[#161F30] border border-slate-800 text-center text-slate-400 col-span-full space-y-3">
        <i data-lucide="info" class="w-8 h-8 text-slate-500 mx-auto"></i>
        <p class="text-base font-semibold text-slate-300">No hay canchas disponibles con los filtros seleccionados.</p>
        <p class="text-xs text-slate-500">Probá seleccionando "Todos" los deportes o cambiando de ubicación.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  canchas.forEach(cancha => {
    const esPadel = esCanchaPadel(cancha);
    const slots = horariosDisponibles(cancha.id, window.state.selectedFecha, duracion);
    const disponiblesCount = slots.filter(s => !s.ocupado).length;

    const card = document.createElement('div');
    card.className = 'flex-shrink-0 w-[88vw] max-w-[340px] md:w-auto snap-center rounded-2xl bg-[#0e1626] border border-slate-800 p-4 shadow-xl flex flex-col justify-between group overflow-hidden transition-all duration-300 hover:border-slate-600';

    const sportBadgeHtml = esPadel
      ? '<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">🎾 Pádel (2 vs 2)</span>'
      : `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">⚽ ${cancha.formato || (cancha.jugadores ? 'Fútbol ' + cancha.jugadores : 'Fútbol')}</span>`;

    const ubiNormalizado = String(cancha.ubicacion || '').toLowerCase();
    const esInterior = ubiNormalizado.includes('int') || ubiNormalizado.includes('tech');
    const locationBadgeHtml = esInterior
      ? '<span class="badge-location-interior">🏠 Techada</span>'
      : '<span class="badge-location-exterior">☀️ Exterior</span>';

    const pitchSvg = getCourtSvgHtml(cancha);

    // Calculate slots HTML
    let slotsHtml = '';
    if (slots.length === 0) {
      slotsHtml = '<p class="text-xs text-slate-500 col-span-full text-center py-2">Sin horarios configurados.</p>';
    } else {
      slotsHtml = slots.map(s => {
        const [hStr, mStr] = s.hora.split(':').map(Number);
        const nextH = (hStr + duracion) % 24;
        const slotRangeLabel = `${s.hora} a ${pad2(nextH)}:${pad2(mStr)}`;

        if (s.ocupado) {
          return `
            <button type="button" disabled class="btn-slot-hora py-2 px-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed text-xs font-semibold text-center opacity-40 pointer-events-none line-through">
              <span class="block font-sports">${s.hora}</span>
              <span class="text-[9px] block">Ocupado</span>
            </button>
          `;
        } else {
          return `
            <button type="button" data-court-id="${cancha.id}" data-slot-hour="${s.hora}" class="btn-select-slot py-2.5 px-2 rounded-xl bg-[#1E293B] hover:bg-[#00E676] hover:text-black border border-slate-700 hover:border-[#00E676] text-white transition-all text-center group/btn shadow-sm hover:scale-105 hover:shadow-[0_0_12px_rgba(0,230,118,0.4)]">
              <span class="block font-sports text-sm font-bold group-hover/btn:text-black">${s.hora}</span>
              <span class="text-[9px] text-slate-400 group-hover/btn:text-black font-semibold block">${slotRangeLabel}</span>
            </button>
          `;
        }
      }).join('');
    }

    card.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h3 class="font-sports text-xl font-bold text-white tracking-wide uppercase">${escapeHtml(cancha.nombre)}</h3>
            <span class="text-xs text-slate-400">${escapeHtml(cancha.superficie || 'Césped Pro')}</span>
          </div>
          <div class="text-right">
            <span class="font-bebas text-2xl text-[#00E676] leading-none">${formatCurrency(cancha.precio)}</span>
            <span class="text-[10px] text-slate-400 block font-semibold">/ hora</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          ${sportBadgeHtml}
          ${locationBadgeHtml}
          <span class="text-xs ml-auto font-semibold ${disponiblesCount > 0 ? 'text-[#00E676]' : 'text-slate-500'}">
            ${disponiblesCount > 0 ? `🟢 ${disponiblesCount} libres` : '🔴 Completo'}
          </span>
        </div>

        ${pitchSvg}

        <div class="pt-3 border-t border-slate-800/80 space-y-2">
          <div class="flex items-center justify-between text-xs text-slate-300 font-bold uppercase tracking-wider">
            <span>Horarios Disponibles (${duracion}h):</span>
            <span class="text-[10px] font-normal text-slate-400">Clic para reservar</span>
          </div>
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            ${slotsHtml}
          </div>
        </div>
      </div>
    `;

    canchasBookingGrid.appendChild(card);
  });

  // Attach slot click handlers to open Modal
  document.querySelectorAll('.btn-select-slot').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const courtId = btn.getAttribute('data-court-id');
      const hour = btn.getAttribute('data-slot-hour');
      openBookingModal(courtId, hour);
    });
  });

  if (window.lucide) window.lucide.createIcons();
  if (window.setupCanchasNav) window.setupCanchasNav();
  if (window.updateCanchasNav) {
    window.updateCanchasNav();
    setTimeout(window.updateCanchasNav, 300);
  }
}

function openBookingModal(canchaId, hora) {
  const modal = document.getElementById('booking-modal');
  if (!modal) return;

  const cancha = (window.state.config.canchas || []).find(c => c.id === canchaId);
  if (!cancha) return;

  window.state.selectedCanchaId = canchaId;
  window.state.selectedHora = hora;

  const duracion = window.state.selectedDuration || 1;
  const [hStr, mStr] = hora.split(':').map(Number);
  const nextH = (hStr + duracion) % 24;
  const horaFinTxt = `${pad2(nextH)}:${pad2(mStr)}`;
  const total = Number(cancha.precio || 20000) * duracion;

  document.getElementById('modal-cancha-nombre').textContent = cancha.nombre;
  document.getElementById('modal-fecha-texto').textContent = formatFechaLarga(window.state.selectedFecha);
  document.getElementById('modal-horario-texto').textContent = `${hora} a ${horaFinTxt} hs`;
  document.getElementById('modal-duracion-texto').textContent = duracion === 2 ? '2 Horas (Doble Turno)' : '1 Hora';
  document.getElementById('modal-precio-total').textContent = formatCurrency(total);

  modal.classList.remove('hidden');
}

function closeBookingModal() {
  const modal = document.getElementById('booking-modal');
  if (modal) modal.classList.add('hidden');
}

// Setup Reservas Page Filter & Modal Handlers
function setupReservasPage() {
  // Duration buttons
  document.querySelectorAll('.btn-duracion').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-duracion').forEach(b => {
        b.className = 'btn-duracion px-4 py-3 rounded-xl border border-slate-700 bg-[#161F30] text-slate-300 hover:text-white font-sports text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all font-semibold';
      });
      btn.className = 'btn-duracion active px-4 py-3 rounded-xl border font-sports text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all bg-[#00E676] text-black border-[#00E676] font-bold shadow-[0_0_15px_rgba(0,230,118,0.3)]';
      window.state.selectedDuration = parseInt(btn.getAttribute('data-duracion')) || 1;
      renderReservasPage();
    });
  });

  // Sport Filter buttons
  document.querySelectorAll('.btn-filter-sport').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-filter-sport').forEach(b => {
        b.className = 'btn-filter-sport flex-1 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white uppercase transition-all';
      });
      btn.className = 'btn-filter-sport active flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all bg-[#00E676] text-black';
      window.state.selectedSport = btn.getAttribute('data-sport');
      renderReservasPage();
    });
  });

  // Location Filter buttons
  document.querySelectorAll('.btn-filter-loc').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-filter-loc').forEach(b => {
        b.className = 'btn-filter-loc flex-1 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white uppercase transition-all';
      });
      btn.className = 'btn-filter-loc active flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all bg-[#00E676] text-black';
      window.state.selectedLocation = btn.getAttribute('data-loc');
      renderReservasPage();
    });
  });

  // Modal Close buttons
  document.getElementById('btn-close-modal')?.addEventListener('click', closeBookingModal);
  document.getElementById('booking-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'booking-modal') closeBookingModal();
  });

  // Form Submission
  const form = document.getElementById('form-confirm-booking');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('input-nombre').value.trim();
      const whatsapp = document.getElementById('input-whatsapp').value.trim();
      const equipo = document.getElementById('input-equipo').value.trim();
      const submitBtn = document.getElementById('btn-submit-booking');

      if (!nombre || !whatsapp) {
        alert('Por favor completá tu nombre y WhatsApp.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Registrando turno...</span> ⏳';

      try {
        const res = await fetch('/api/turnos', {
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

        const data = await res.json();
        if (!res.ok || !data.success) {
          alert(data.message || 'No se pudo reservar el turno.');
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i data-lucide="send" class="w-4 h-4 text-black"></i><span>Confirmar y Enviar por WhatsApp</span>';
          if (window.lucide) window.lucide.createIcons();
          await loadTurnos();
          renderReservasPage();
          return;
        }

        // Add to local state
        window.state.lastBooking = data.turno;
        if (!Array.isArray(window.state.turnos)) window.state.turnos = [];
        window.state.turnos.push(data.turno);

        if (dbFs) {
          const canchaObj = (window.state.config?.canchas || []).find(c => c.id === window.state.selectedCanchaId);
          const durStr = String(window.state.selectedDuration || 1).includes('2') || Number(window.state.selectedDuration) === 2 ? '2h' : '1h';
          const durNum = durStr === '2h' ? 2 : 1;
          const [hIniStr, mIniStr] = String(window.state.selectedHora || '00:00').split(':').map(Number);
          const nextH = (hIniStr + durNum) % 24;
          const horaFin = `${pad2(nextH)}:${pad2(mIniStr || 0)}`;

          const precioUnit = Number(canchaObj?.precio) >= 0 ? Number(canchaObj.precio) : 24000;
          const precioTotal = precioUnit * durNum;

          const serverTs = (window.firebase?.firestore?.FieldValue?.serverTimestamp)
            ? firebase.firestore.FieldValue.serverTimestamp()
            : new Date().toISOString();

          const nuevaReserva = {
            cliente: String(nombre).trim(),
            telefono: String(whatsapp || '').trim(),
            cancha: String(canchaObj?.nombre || data.turno.canchaNombre || 'Pista').trim(),
            deporte: (canchaObj?.deporte || data.turno.deporte || 'padel').toUpperCase().includes('FUT') ? 'FUTBOL' : 'PADEL',
            fecha: window.state.selectedFecha,
            fechaTexto: (typeof formatFechaLarga === 'function') ? formatFechaLarga(window.state.selectedFecha) : window.state.selectedFecha,
            hora: window.state.selectedHora,
            horario: `${window.state.selectedHora} a ${horaFin} hs`,
            duracion: durStr,
            precio: Number(precioTotal) || 0,
            estado: "pendiente",
            creadoEn: serverTs,
            // Campos retrocompatibles seguros
            id: data.turno.id,
            nombre: String(nombre).trim(),
            whatsapp: String(whatsapp || '').trim(),
            canchaNombre: String(canchaObj?.nombre || data.turno.canchaNombre || 'Pista').trim(),
            canchaId: window.state.selectedCanchaId || ''
          };

          dbFs.collection('reservas').doc(data.turno.id).set(nuevaReserva, { merge: true }).catch(e => console.warn('Error Firestore reservas:', e));
          dbFs.collection('turnos').doc(data.turno.id).set(nuevaReserva, { merge: true }).catch(e => console.warn('Error Firestore turnos:', e));
        }

        // Open WhatsApp confirmation
        const cfg = window.state.config;
        const destino = cfg.whatsapp ? String(cfg.whatsapp).replace(/\D/g, '') : '';
        const dur = Number(data.turno.duracion) || 1;
        const [hStr, mStr] = data.turno.hora.split(':').map(Number);
        const nextH = (hStr + dur) % 24;
        const horaFinTxt = data.turno.horaFin || `${pad2(nextH)}:${pad2(mStr)}`;
        const sportName = data.turno.deporte === 'padel' ? '🎾 PÁDEL (2 vs 2)' : `⚽ FÚTBOL ${data.turno.jugadores || 5}`;

        const mensaje = 
`*RESERVA DE TURNO - ${cfg.nombre || 'COMPLEJO PADEL 3'}*

*Jugador/Capitán:* ${data.turno.nombre}
${data.turno.equipo ? `*Equipo/Pareja:* ${data.turno.equipo}\n` : ''}*Deporte:* ${sportName}
*Cancha:* ${data.turno.canchaNombre} (${data.turno.ubicacion === 'interior' ? '🏠 Techada' : '☀️ Exterior'})
*Fecha:* ${formatFechaLarga(data.turno.fecha)}
*Horario:* ${data.turno.hora} a ${horaFinTxt} hs (${dur === 2 ? '2 Horas / Doble Turno' : '1 Hora'})
*TOTAL A PAGAR:* ${formatCurrency(data.turno.precio)}
${cfg.direccion ? `*Dirección:* ${cfg.direccion}\n` : ''}
Hola! Quiero confirmar la reserva de este turno. Muchas gracias!`;

        const waUrl = destino ? `https://wa.me/${destino}?text=${encodeURIComponent(mensaje)}` : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
        window.open(waUrl, '_blank');

        // Reset & Close Modal
        form.reset();
        closeBookingModal();
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="send" class="w-4 h-4 text-black"></i><span>Confirmar y Enviar por WhatsApp</span>';

        alert('¡Turno reservado con éxito! Se abrió WhatsApp para enviar la confirmación.');
        renderReservasPage();

      } catch (err) {
        console.error('Error al reservar:', err);
        alert('Error al conectar con el servidor.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="send" class="w-4 h-4 text-black"></i><span>Confirmar y Enviar por WhatsApp</span>';
      }
    });
  }
}

// Mobile Menu Handler
function setupMobileMenu() {
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const iconOpen = document.getElementById('menu-icon-open');
  const iconClose = document.getElementById('menu-icon-close');

  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = mobileMenu.classList.contains('hidden');
      mobileMenu.classList.toggle('hidden');
      mobileMenu.classList.toggle('flex');
      if (iconOpen && iconClose) {
        if (willOpen) {
          iconOpen.classList.add('hidden');
          iconClose.classList.remove('hidden');
        } else {
          iconOpen.classList.remove('hidden');
          iconClose.classList.add('hidden');
        }
      }
    });

    // Cerrar automáticamente al hacer clic en cualquier enlace del menú
    mobileMenu.querySelectorAll('a, button').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('flex');
        if (iconOpen && iconClose) {
          iconOpen.classList.remove('hidden');
          iconClose.classList.add('hidden');
        }
      });
    });

    // Cerrar si se toca fuera del menú
    document.addEventListener('click', (e) => {
      if (!mobileMenu.contains(e.target) && !mobileBtn.contains(e.target)) {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('flex');
        if (iconOpen && iconClose) {
          iconOpen.classList.remove('hidden');
          iconClose.classList.add('hidden');
        }
      }
    });
  }
}

function render() {
  renderHeader();
  renderCanchas();
  renderFechas();
  renderHorarios();
  renderServicios();
  renderEventos();
  renderReservasPage();
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ================= INITIALIZATION =================

async function initApp() {
  initFirestoreApp();
  await Promise.all([
    loadConfig(),
    loadTurnos(),
    loadServicios(),
    loadEventos()
  ]);

  setupMobileMenu();
  setupFilterButtons();
  setupReservasPage();

  document.getElementById('btn-reservar')?.addEventListener('click', reservarTurno);
  document.getElementById('btn-confirmar-whatsapp')?.addEventListener('click', confirmarPorWhatsapp);
  document.getElementById('btn-reservar-otro')?.addEventListener('click', () => {
    window.state.lastBooking = null;
    window.state.selectedHora = null;
    document.getElementById('confirm-panel')?.classList.add('hidden');
    render();
  });

  render();
}

window.addEventListener('DOMContentLoaded', initApp);

