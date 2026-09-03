// =========================================================
// COMPLEJO PADEL 3 - MOBILE-FIRST UI & NAVIGATION HELPERS
// =========================================================

function setupCarousel(sliderId, prevBtnId, nextBtnId, step = 380) {
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
      slider.scrollBy({ left: step, behavior: 'smooth' });
    });

    prevBtn.addEventListener('click', () => {
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

    const step = 380;
    const maxScroll = slider.scrollWidth - slider.clientWidth - 10;

    // Si llega al final, volver al inicio suavemente; de lo contrario, avanzar un paso
    if (slider.scrollLeft >= maxScroll) {
      slider.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      slider.scrollBy({ left: step, behavior: 'smooth' });
    }
  }, intervalTime);
}

window.setupCarousel = setupCarousel;
window.startAutoScroll = startAutoScroll;

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

  // Ensure Lucide icons are initialized on dynamic DOM changes
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

