// =========================================================
// COMPLEJO PADEL 3 - MOBILE-FIRST UI & NAVIGATION HELPERS
// =========================================================

function getScrollStep(slider) {
  const firstCard = slider ? slider.firstElementChild : null;
  if (!firstCard) return 320;
  const cardWidth = firstCard.getBoundingClientRect().width;
  const gap = parseFloat(window.getComputedStyle(slider).gap) || 16;
  return cardWidth + gap;
}

function setupCarousel(sliderId, prevBtnId, nextBtnId) {
  const slider = document.getElementById(sliderId);
  const prevBtn = document.getElementById(prevBtnId);
  const nextBtn = document.getElementById(nextBtnId);
  if (!slider || !prevBtn || !nextBtn) return;

  const updateButtons = () => {
    const maxScroll = slider.scrollWidth - slider.clientWidth - 5;
    prevBtn.disabled = slider.scrollLeft <= 5;
    nextBtn.disabled = slider.scrollLeft >= maxScroll;
  };

  if (!prevBtn.dataset.carouselBound) {
    prevBtn.dataset.carouselBound = 'true';
    nextBtn.addEventListener('click', () => {
      const step = getScrollStep(slider);
      slider.scrollBy({ left: step, behavior: 'smooth' });
    });

    prevBtn.addEventListener('click', () => {
      const step = getScrollStep(slider);
      slider.scrollBy({ left: -step, behavior: 'smooth' });
    });

    slider.addEventListener('scroll', updateButtons);
    window.addEventListener('resize', updateButtons);
  }

  updateButtons();
  setTimeout(updateButtons, 300);
}

function startAutoScroll(sliderId, intervalTime = 3500) {
  const slider = document.getElementById(sliderId);
  if (!slider) return;

  if (slider.dataset.autoScrollInit) return;
  slider.dataset.autoScrollInit = 'true';

  let isHovered = false;
  let touchActive = false;

  // Pausar cuando el usuario interactúa
  slider.addEventListener('mouseenter', () => isHovered = true);
  slider.addEventListener('mouseleave', () => isHovered = false);
  slider.addEventListener('touchstart', () => touchActive = true, { passive: true });
  slider.addEventListener('touchend', () => touchActive = false);

  setInterval(() => {
    // No mover si el usuario tiene el cursor encima o está tocando la pantalla
    if (isHovered || touchActive) return;

    const step = getScrollStep(slider);
    const maxScroll = slider.scrollWidth - slider.clientWidth - 10;

    // Si llega al final, volver al inicio suavemente; de lo contrario, avanzar un paso
    if (slider.scrollLeft >= maxScroll) {
      slider.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      slider.scrollBy({ left: step, behavior: 'smooth' });
    }
  }, intervalTime);
}

function updateCanchasNav() {
  const canchasSlider = document.getElementById('canchas-booking-grid') || document.getElementById('canchas-container');
  const btnPrev = document.getElementById('btn-canchas-prev');
  const btnNext = document.getElementById('btn-canchas-next');
  if (!canchasSlider || !btnPrev || !btnNext) return;

  // Si en pantalla grande se ve en grilla sin scroll, ocultar flechas
  if (canchasSlider.scrollWidth <= canchasSlider.clientWidth + 5) {
    btnPrev.style.display = 'none';
    btnNext.style.display = 'none';
    return;
  }
  btnPrev.style.display = 'flex';
  btnNext.style.display = 'flex';

  const maxScroll = canchasSlider.scrollWidth - canchasSlider.clientWidth - 5;
  btnPrev.disabled = canchasSlider.scrollLeft <= 5;
  btnNext.disabled = canchasSlider.scrollLeft >= maxScroll;
}

function setupCanchasNav() {
  const canchasSlider = document.getElementById('canchas-booking-grid') || document.getElementById('canchas-container');
  const btnPrev = document.getElementById('btn-canchas-prev');
  const btnNext = document.getElementById('btn-canchas-next');
  if (!canchasSlider || !btnPrev || !btnNext) return;

  if (!btnNext.dataset.bound) {
    btnNext.dataset.bound = 'true';
    btnNext.addEventListener('click', () => {
      const firstCard = canchasSlider.firstElementChild;
      const step = firstCard ? firstCard.getBoundingClientRect().width + 20 : 320;
      canchasSlider.scrollBy({ left: step, behavior: 'smooth' });
    });
  }

  if (!btnPrev.dataset.bound) {
    btnPrev.dataset.bound = 'true';
    btnPrev.addEventListener('click', () => {
      const firstCard = canchasSlider.firstElementChild;
      const step = firstCard ? firstCard.getBoundingClientRect().width + 20 : 320;
      canchasSlider.scrollBy({ left: -step, behavior: 'smooth' });
    });
  }

  if (!canchasSlider.dataset.navBound) {
    canchasSlider.dataset.navBound = 'true';
    canchasSlider.addEventListener('scroll', updateCanchasNav);
    window.addEventListener('resize', updateCanchasNav);
  }

  updateCanchasNav();
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
      ocupados.push(`${String(hh).padStart(2, '0')}:${String(mStr || 0).padStart(2, '0')}`);
    }
    return ocupados;
  }

  return [String(reserva.horario || reserva.hora || '')].filter(Boolean);
}

function normalizarFechaISO(f) {
  if (!f) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const str = String(f).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return str;
}

function formatFechaLegibleTexto(iso) {
  try {
    if (!iso) return '';
    const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return String(iso);
    const [, yStr, mStr, dStr] = match;
    const date = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${dias[date.getDay()]} ${Number(dStr)} de ${meses[Number(mStr) - 1]}`;
  } catch (e) {
    return String(iso);
  }
}

function sonMismoDia(fechaA, fechaB) {
  if (!fechaA || !fechaB) return false;
  if (fechaA === fechaB) return true;
  // Si una contiene a la otra
  if (fechaA.includes(fechaB) || fechaB.includes(fechaA)) return true;
  // Comparar por el número de día del mes (ej: '3' de '2026-09-03' y '3' de 'Jue 3 de septiembre')
  const matchA = String(fechaA).match(/(?:^|\D)(\d{1,2})(?:\D|$)/);
  const matchB = String(fechaB).match(/(?:^|\D)(\d{1,2})(?:\D|$)/);
  return Boolean(matchA && matchB && matchA[1] === matchB[1]);
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

function estaSlotOcupado(cancha, fechaSeleccionada, slotHora, reservas = (window.todasLasReservas || window.state?.turnos || [])) {
  if (!reservas || !Array.isArray(reservas)) return false;
  return reservas.some(r => {
    if (!r) return false;
    const estado = String(r.estado || '').toLowerCase().trim();
    if (estado === 'cancelado' || estado === 'liberado' || estado === 'anulado') return false;

    const nombreCancha = typeof cancha === 'object' ? (cancha.nombre || '') : String(cancha || '');
    const canchaR = String(r.cancha || r.canchaNombre || '').toLowerCase().trim();
    const canchaTarget = nombreCancha.toLowerCase().trim();
    const mismaCancha = canchaR.includes(canchaTarget) || canchaTarget.includes(canchaR);

    const mismaFecha = sonMismoDia(r.fecha || r.fechaTexto, fechaSeleccionada);
    return mismaCancha && mismaFecha && slotEstaOcupado(r, slotHora);
  });
}

function crearObjetoReserva({
  cliente,
  telefono,
  cancha,
  deporte,
  fecha,
  hora,
  duracion,
  precio
}) {
  const durStr = String(duracion || '1').includes('2') || Number(duracion) === 2 ? '2h' : '1h';
  const durNum = durStr === '2h' ? 2 : 1;
  const [hStr, mStr] = String(hora || '00:00').split(':').map(Number);
  const nextH = (hStr + durNum) % 24;
  const horaInicio = String(hora || '00:00');
  const horaFin = `${String(nextH).padStart(2, '0')}:${String(mStr || 0).padStart(2, '0')}`;
  const fechaISO = normalizarFechaISO(fecha);
  const fechaTextoFormateado = formatFechaLegibleTexto(fechaISO);

  const canchaNombre = typeof cancha === 'object' ? (cancha.nombre || '') : String(cancha || '');
  const deporteStr = (String(deporte || (typeof cancha === 'object' ? cancha.deporte : 'padel'))).toUpperCase().includes('FUT') ? 'FUTBOL' : 'PADEL';

  const ts = (window.firebase?.firestore?.FieldValue?.serverTimestamp)
    ? window.firebase.firestore.FieldValue.serverTimestamp()
    : new Date().toISOString();

  return {
    cliente: String(cliente || '').trim(),
    telefono: String(telefono || '').trim(),
    cancha: canchaNombre.trim(),
    deporte: deporteStr,
    fecha: fechaISO,
    fechaTexto: fechaTextoFormateado,
    hora: horaInicio,
    horario: `${horaInicio} a ${horaFin} hs`,
    duracion: durStr,
    precio: Number(precio) || 0,
    estado: "pendiente",
    creadoEn: ts,
    // Mapeo retrocompatible seguro
    nombre: String(cliente || '').trim(),
    whatsapp: String(telefono || '').trim(),
    canchaNombre: canchaNombre.trim(),
    canchaId: typeof cancha === 'object' ? (cancha.id || '') : ''
  };
}

window.getScrollStep = getScrollStep;
window.setupCarousel = setupCarousel;
window.startAutoScroll = startAutoScroll;
window.updateCanchasNav = updateCanchasNav;
window.setupCanchasNav = setupCanchasNav;
window.matchCancha = matchCancha;
window.getHorasOcupadas = getHorasOcupadas;
window.normalizarFechaISO = normalizarFechaISO;
window.formatFechaLegibleTexto = formatFechaLegibleTexto;
window.sonMismoDia = sonMismoDia;
window.estaSlotOcupado = estaSlotOcupado;
window.slotEstaOcupado = slotEstaOcupado;
window.crearObjetoReserva = crearObjetoReserva;

function setupMainFirestoreListeners() {
  try {
    if (window.firebase && firebase.firestore) {
      const db = firebase.firestore();

      // Sincronizar canchas en tiempo real
      db.collection('canchas').onSnapshot(snapshot => {
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
          if (window.state) {
            window.state.config = window.state.config || {};
            window.state.config.canchas = list;
            if (typeof window.renderCanchas === 'function') window.renderCanchas();
            if (typeof window.renderReservasPage === 'function') window.renderReservasPage();
          }
        }
      }, err => console.warn('[main.js] Firestore canchas onSnapshot error:', err));

      // Sincronizar configuración general
      const updateGeneralConfig = (doc) => {
        if (doc.exists) {
          const cfg = doc.data();
          if (window.state) {
            window.state.config = {
              ...(window.state.config || {}),
              ...cfg,
              nombre: cfg.nombreComplejo || cfg.nombre || window.state.config?.nombre,
              subtitulo: cfg.slogan || cfg.subtitulo || window.state.config?.subtitulo,
              direccion: cfg.direccion || window.state.config?.direccion,
              maps: cfg.linkMaps || cfg.maps || window.state.config?.maps,
              whatsapp: cfg.whatsapp || window.state.config?.whatsapp,
              horaInicio: cfg.apertura || cfg.horaInicio || window.state.config?.horaInicio,
              horaFin: cfg.cierre || cfg.horaFin || window.state.config?.horaFin,
              diasActivos: cfg.diasAtencion || cfg.diasActivos || window.state.config?.diasActivos
            };
          }
          if (cfg.whatsapp) {
            const cleanNum = String(cfg.whatsapp).replace(/[^0-9]/g, '');
            if (cleanNum) {
              document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
                a.href = `https://wa.me/${cleanNum}`;
              });
            }
          }
        }
      };

      db.collection('configuracion').doc('general').onSnapshot(updateGeneralConfig, err => console.warn('[main.js] Firestore configuracion error:', err));
      db.collection('config').doc('general').onSnapshot(updateGeneralConfig, err => console.warn('[main.js] Firestore config error:', err));
    }
  } catch (e) {
    console.warn('[main.js] Error inicializando Firestore listeners:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Touch helper for horizontal scroll sliders
  const noScrollbarElems = document.querySelectorAll('.no-scrollbar');
  noScrollbarElems.forEach(slider => {
    slider.style.webkitOverflowScrolling = 'touch';
  });

  // Initialize Carousels & Autoplay
  setupCarousel('servicios-slider', 'btn-servicios-prev', 'btn-servicios-next');
  setupCarousel('eventos-slider', 'btn-eventos-prev', 'btn-eventos-next');
  startAutoScroll('servicios-slider', 4000);
  startAutoScroll('eventos-slider', 4500);

  setupCanchasNav();
  setupMainFirestoreListeners();

  // Ensure Lucide icons are initialized on dynamic DOM changes
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

