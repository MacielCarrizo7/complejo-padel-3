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

window.getScrollStep = getScrollStep;
window.setupCarousel = setupCarousel;
window.startAutoScroll = startAutoScroll;
window.updateCanchasNav = updateCanchasNav;
window.setupCanchasNav = setupCanchasNav;

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

