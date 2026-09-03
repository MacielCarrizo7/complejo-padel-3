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

window.setupCarousel = setupCarousel;

document.addEventListener('DOMContentLoaded', () => {
  // Touch helper for horizontal scroll sliders
  const noScrollbarElems = document.querySelectorAll('.no-scrollbar');
  noScrollbarElems.forEach(slider => {
    slider.style.webkitOverflowScrolling = 'touch';
  });

  // Initialize Carousels
  setupCarousel('servicios-slider', 'btn-servicios-prev', 'btn-servicios-next');
  setupCarousel('eventos-slider', 'btn-eventos-prev', 'btn-eventos-next');

  // Ensure Lucide icons are initialized on dynamic DOM changes
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

