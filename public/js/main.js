// =========================================================
// COMPLEJO PADEL 3 - MOBILE-FIRST UI & NAVIGATION HELPERS
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Smooth scroll to anchor targets for bottom floating navigation bar
  const bottomNavLinks = document.querySelectorAll('nav.fixed a[href^="#"]');
  bottomNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // 2. Ensure Lucide icons are initialized on dynamic DOM changes
  if (window.lucide) {
    window.lucide.createIcons();
  }
});
