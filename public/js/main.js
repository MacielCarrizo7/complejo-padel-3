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

function formatFechaLegibleTexto(iso) {
  try {
    const [y, m, d] = String(iso).split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${dias[date.getDay()]} ${d} de ${meses[m - 1]}`;
  } catch (e) {
    return iso;
  }
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
  const fechaISO = String(fecha || '').trim();

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
    fechaTexto: formatFechaLegibleTexto(fechaISO),
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
window.crearObjetoReserva = crearObjetoReserva;
window.formatFechaLegibleTexto = formatFechaLegibleTexto;

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

  // Ensure Lucide icons are initialized on dynamic DOM changes
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

