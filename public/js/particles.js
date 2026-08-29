/**
 * particles.js - Engine de partículas deportivas 2D en Canvas
 * Crea un efecto visual de explosión de polvo y destellos de neón (Verde Neón y Azul Eléctrico)
 * alrededor del elemento central de Hero para Complejo Padel 3.
 */

export function initSportsParticles(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = canvas.width = canvas.parentElement.clientWidth || window.innerWidth;
  let height = canvas.height = canvas.parentElement.clientHeight || window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = canvas.parentElement.clientWidth || window.innerWidth;
    height = canvas.height = canvas.parentElement.clientHeight || window.innerHeight;
  });

  const colors = [
    'rgba(0, 255, 102, ',   // Neon Green
    'rgba(0, 229, 255, ',   // Cyan Neon
    'rgba(255, 170, 0, ',   // Warm Orange Accent
    'rgba(255, 255, 255, '  // White Sparkles
  ];

  const numParticles = Math.min(Math.floor(width / 12), 110);
  const particles = [];

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 10;
      this.radius = Math.random() * 2.5 + 0.8;
      this.colorBase = colors[Math.floor(Math.random() * colors.length)];
      this.alpha = Math.random() * 0.6 + 0.2;
      this.speedY = -(Math.random() * 0.8 + 0.2);
      this.speedX = (Math.random() - 0.5) * 0.6;
      this.pulse = Math.random() * 0.02 + 0.005;
      this.pulseDir = Math.random() > 0.5 ? 1 : -1;
      this.isBall = Math.random() > 0.92; // 8% chance of being a glowing mini padel ball
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      this.alpha += this.pulse * this.pulseDir;
      if (this.alpha >= 0.8) this.pulseDir = -1;
      if (this.alpha <= 0.15) this.pulseDir = 1;

      if (this.y < -20 || this.x < -20 || this.x > width + 20) {
        this.reset(false);
      }
    }

    draw() {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.colorBase + this.alpha + ')';

      if (this.isBall) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00ff66';
      } else {
        ctx.shadowBlur = 6;
        ctx.shadowColor = this.colorBase.includes('0, 255') ? '#00ff66' : '#00e5ff';
      }

      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < numParticles; i++) {
    particles.push(new Particle());
  }

  // Interactive mouse burst
  let mouseX = width / 2;
  let mouseY = height / 2;
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  let animationFrameId;
  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Subtle radial glow behind central hero
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, Math.max(width, height) / 1.5);
    gradient.addColorStop(0, 'rgba(0, 229, 255, 0.06)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 102, 0.03)');
    gradient.addColorStop(1, 'rgba(11, 15, 25, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    animationFrameId = requestAnimationFrame(animate);
  }

  animate();

  return () => {
    cancelAnimationFrame(animationFrameId);
  };
}
