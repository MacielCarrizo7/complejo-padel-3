/**
 * landing.js - Lógica principal de la Landing Page One-Page & Sistema de Turnos con Siluetas Tácticas
 * COMPLEJO PADEL 3
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  doc, 
  collection, 
  onSnapshot, 
  addDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initSportsParticles } from "./particles.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCjMf1IIcKsLu2wQPqB-UxGa3bmEmVnWs",
  authDomain: "complejo-padel-3.firebaseapp.com",
  projectId: "complejo-padel-3",
  storageBucket: "complejo-padel-3.firebasestorage.app",
  messagingSenderId: "975322009594",
  appId: "1:975322009594:web:e81ead05c09307e7255e43",
  measurementId: "G-RY4RW29MRS"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Global State
window.state = {
  siteConfig: {
    nombre: "COMPLEJO PADEL 3",
    subtitulo: "El complejo deportivo #1 de Lavalle · Canchas de Pádel & Fútbol · Techadas y Exterior",
    heroTitle: "VIVE LA PASIÓN DEL PÁDEL Y FÚTBOL",
    heroSubtitle: "Canchas de última generación con iluminación LED profesional, superficie sintética de nivel mundial y el mejor ambiente deportivo de Lavalle.",
    turnosUrl: "#reservar",
    whatsappNumber: "5492613831173",
    whatsappDisplay: "2613831173",
    direccion: "Tulumaya, Lavalle, Mendoza",
    googleMapsEmbed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d13426.654812356!2d-68.59972!3d-32.72194!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x967e35c2e0b5b82d%3A0x4a1801c801e0a20!2sTulumaya%2C%20Mendoza!5e0!3m2!1ses!2sar!4v1700000000000!5m2!1ses!2sar",
    googleMapsUrl: "https://maps.google.com/?q=Tulumaya,+Lavalle,+Mendoza",
    horarios: "14:00 hs a 24:00 hs",
    horaInicio: "14:00",
    horaFin: "24:00",
    heroBadge: "SISTEMA DE TURNOS Y RESERVAS EN VIVO",
    logoUrl: "assets/logo.png"
  },
  servicios: [
    { id: "s1", icono: "🎾", titulo: "Canchas de Pádel", descripcion: "Pistas panorámicas con césped sintético oficial WPT, cristal templado y luces LED." },
    { id: "s2", icono: "⚽", titulo: "Cancha de Fútbol", descripcion: "Canchas de Fútbol 5 y Fútbol 7 techadas y al aire libre con césped Forbex 50mm." },
    { id: "s3", icono: "🌮", titulo: "Snack bar", descripcion: "Buffet equipado para el tercer tiempo: minutas, picadas, pizzas y bebidas heladas." },
    { id: "s4", icono: "🚗", titulo: "Estacionamiento privado", descripcion: "Predio cerrado, iluminado y monitoreado con seguridad sin costo adicional." },
    { id: "s5", icono: "👈", titulo: "Turnos: 2613831173", descripcion: "Reserva inmediata de turnos vía WhatsApp o desde el botón de la web." },
    { id: "s6", icono: "📍", titulo: "Tulumaya, Lavalle, Mendoza", descripcion: "Fácil acceso en la mejor zona deportiva del departamento de Lavalle." }
  ],
  canchas: [
    { id: "c1", nombre: "Pista 1 - Cristal Pro", deporte: "padel", ubicacion: "interior", formato: "doble", jugadores: 4, superficie: "Césped Sintético Azul WPT", precio: 24000 },
    { id: "c2", nombre: "Pista 2 - Panorámica", deporte: "padel", ubicacion: "interior", formato: "doble", jugadores: 4, superficie: "Vidrio Panorámico LED", precio: 24000 },
    { id: "c3", nombre: "Pista 3 - Sunset Open", deporte: "padel", ubicacion: "exterior", formato: "doble", jugadores: 4, superficie: "Césped Texturado Fibrilado", precio: 20000 },
    { id: "c4", nombre: "Cancha 1 - Monumental F5", deporte: "futbol", ubicacion: "interior", formato: "f5", jugadores: 10, superficie: "Sintético Forbex 50mm", precio: 28000 },
    { id: "c5", nombre: "Cancha 2 - Wembley F7", deporte: "futbol", ubicacion: "exterior", formato: "f7", jugadores: 14, superficie: "Césped Sintético Pro 50mm", precio: 36000 }
  ],
  turnos: [],
  selectedSport: 'todos',
  selectedLocation: 'todos',
  selectedDuration: 1,
  selectedCanchaId: 'c1',
  selectedFecha: null,
  selectedHora: null,
  lastBooking: null
};

const DIAS_ADELANTE = 14;
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function pad2(n) { return String(n).padStart(2, '0'); }
function formatDateISO(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function hoyISO() { return formatDateISO(new Date()); }

function formatFechaLarga(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DIAS_SEMANA[date.getDay()]} ${d} de ${MESES[m - 1]}`;
}

// Generador de Silueta Táctica SVG (Pádel vs Fútbol)
function getCourtSvgHtml(cancha) {
  if (cancha.deporte === 'padel') {
    const isSingle = cancha.formato === 'simple' || cancha.jugadores === 2;
    return `
      <div class="pitch-container pitch-padel">
        <svg class="pitch-svg" viewBox="0 0 200 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Glass perimeter back and side walls with neon glow -->
          <rect x="6" y="6" width="188" height="78" fill="none" stroke="rgba(0, 229, 255, 0.7)" stroke-width="2" />
          <rect x="8" y="8" width="184" height="74" fill="none" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1" />
          <!-- Service boxes -->
          <line x1="38" y1="8" x2="38" y2="82" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
          <line x1="162" y1="8" x2="162" y2="82" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
          <line x1="38" y1="45" x2="162" y2="45" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
          <!-- Center Net with metallic posts -->
          <line x1="100" y1="4" x2="100" y2="86" stroke="#00ff66" stroke-width="2.5" stroke-dasharray="3,2" />
          <circle cx="100" cy="5" r="2.5" fill="#00ff66" />
          <circle cx="100" cy="85" r="2.5" fill="#00ff66" />
        </svg>
        <div class="pitch-indicator">
          <span>🎾 ${isSingle ? 'Pádel Simple (1 vs 1 · 2 jug.)' : 'Pádel Doble (2 vs 2 · 4 jug.)'}</span>
        </div>
      </div>
    `;
  } else {
    const numJug = cancha.jugadores ? Math.round(cancha.jugadores / 2) : (cancha.formato ? parseInt(cancha.formato.replace(/\D/g, '')) : 5) || 5;
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
          <span>⚽ Fútbol ${numJug} (${numJug} vs ${numJug})</span>
        </div>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 1. Particle Canvas
  initSportsParticles("hero-canvas");

  // 2. Initial Date setup
  window.state.selectedFecha = hoyISO();

  // 3. Render base
  renderConfig(window.state.siteConfig);
  renderServicios(window.state.servicios);
  renderCanchasGallery(window.state.canchas);
  renderBookingCanchas();
  renderBookingFechas();
  renderBookingHorarios();

  // 4. Firestore Realtime Listeners
  listenFirestoreUpdates();

  // 5. Setup Form Actions
  setupBookingFormActions();
  setupFilterButtons();
});

// Render Config Data
function renderConfig(config) {
  if (!config) return;

  const el = (id) => document.getElementById(id);

  if (el("hero-title")) el("hero-title").innerHTML = config.heroTitle || window.state.siteConfig.heroTitle;
  if (el("hero-subtitle")) el("hero-subtitle").textContent = config.heroSubtitle || window.state.siteConfig.heroSubtitle;
  if (el("hero-badge-text")) el("hero-badge-text").textContent = config.heroBadge || window.state.siteConfig.heroBadge;
  
  if (config.logoUrl && el("brand-logo-img")) el("brand-logo-img").src = config.logoUrl;
  if (config.logoUrl && el("hero-logo-img")) el("hero-logo-img").src = config.logoUrl;

  const waNum = config.whatsappNumber || "5492613831173";
  const waUrl = `https://wa.me/${waNum}?text=Hola!%20Quiero%20consultar%20turnos%20en%20Complejo%20Padel%203`;
  if (el("whatsapp-floating-link")) el("whatsapp-floating-link").href = waUrl;

  if (el("contact-direccion")) el("contact-direccion").textContent = config.direccion || window.state.siteConfig.direccion;
  if (el("contact-phone")) el("contact-phone").textContent = `Turnos: ${config.whatsappDisplay || "2613831173"}`;
  if (el("contact-phone-box")) el("contact-phone-box").textContent = config.whatsappDisplay || "2613831173";
  if (el("contact-horarios")) el("contact-horarios").textContent = config.horarios || "14:00 hs a 24:00 hs";

  if (el("google-map-iframe") && config.googleMapsEmbed) {
    el("google-map-iframe").src = config.googleMapsEmbed;
  }
  if (el("google-map-direct-link") && config.googleMapsUrl) {
    el("google-map-direct-link").href = config.googleMapsUrl;
  }
}

// Render Services Grid
function renderServicios(servicios) {
  const container = document.getElementById("services-grid-container");
  if (!container) return;

  container.innerHTML = servicios.map(srv => `
    <div class="service-card">
      <div class="service-icon-box">${srv.icono || '🏆'}</div>
      <h3 class="service-card-title">${srv.titulo}</h3>
      <p class="service-card-desc">${srv.descripcion}</p>
    </div>
  `).join("");
}

// Render Courts Gallery in Section
function renderCanchasGallery(canchas) {
  const container = document.getElementById("courts-grid-container");
  if (!container) return;

  container.innerHTML = canchas.map(c => {
    const isPadel = c.deporte === 'padel';
    const locLabel = c.ubicacion === 'interior' ? '🏠 Interior Techada' : '☀️ Exterior';
    const formatLabel = isPadel 
      ? (c.formato === 'simple' ? '🎾 Pádel Simple' : '🎾 Pádel Doble') 
      : `⚽ Fútbol ${c.jugadores ? Math.round(c.jugadores / 2) : 5}`;

    return `
      <div class="court-card" data-sport="${c.deporte}">
        <div class="court-img-wrapper">
          <img src="${c.imagen || (isPadel ? 'https://images.unsplash.com/photo-1626248801379-51a0748a5f96?auto=format&fit=crop&w=800&q=80' : 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80')}" alt="${c.nombre}" class="court-img" loading="lazy">
          <span class="court-badge-type">${locLabel}</span>
        </div>
        <div class="court-body">
          <h3 class="court-title">${c.nombre}</h3>
          <div class="court-specs">
            <div class="court-spec-item">🌱 <span>${c.superficie || 'Césped Sintético Pro'}</span></div>
            <div class="court-spec-item">👥 <span>${formatLabel}</span></div>
          </div>
          <div class="court-price-row">
            <div class="court-price-val">$ ${Number(c.precio).toLocaleString('es-AR')} <span>/ turno</span></div>
            <a href="#reservar" onclick="window.seleccionarCanchaDirecta('${c.id}')" class="btn-primary" style="padding:8px 18px; font-size:0.85rem;">Reservar</a>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

window.seleccionarCanchaDirecta = (id) => {
  window.state.selectedCanchaId = id;
  renderBookingCanchas();
  renderBookingHorarios();
};

// ================= BOOKING ENGINE & TACTICAL SILHOUETTES =================

function renderBookingCanchas() {
  const grid = document.getElementById("booking-canchas-grid");
  if (!grid) return;

  let filtered = window.state.canchas;
  if (window.state.selectedSport !== 'todos') {
    filtered = filtered.filter(c => c.deporte === window.state.selectedSport);
  }
  if (window.state.selectedLocation !== 'todos') {
    filtered = filtered.filter(c => c.ubicacion === window.state.selectedLocation);
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-secondary); grid-column:1/-1;">No hay canchas disponibles con los filtros seleccionados.</p>`;
    return;
  }

  if (!filtered.some(c => c.id === window.state.selectedCanchaId)) {
    window.state.selectedCanchaId = filtered[0].id;
  }

  grid.innerHTML = filtered.map(c => {
    const isSel = c.id === window.state.selectedCanchaId;
    const isPadel = c.deporte === 'padel';
    const pitchSvg = getCourtSvgHtml(c);
    const locBadge = c.ubicacion === 'interior' ? '🏠 Techada' : '☀️ Exterior';
    const locClass = c.ubicacion === 'interior' ? 'badge-interior' : 'badge-exterior';
    const sportBadge = isPadel 
      ? (c.formato === 'simple' ? '🎾 Simple (2 jug.)' : '🎾 Doble (4 jug.)')
      : `⚽ Fútbol ${c.jugadores ? Math.round(c.jugadores / 2) : 5}`;

    return `
      <div class="cancha-select-card ${isSel ? 'selected' : ''}" onclick="window.selectCancha('${c.id}')">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong style="font-size:1.2rem; color:#fff;">${c.nombre}</strong>
        </div>
        
        <div class="cancha-tags-row">
          <span class="cancha-sport-badge ${isPadel ? 'badge-padel' : 'badge-futbol'}">${sportBadge}</span>
          <span class="${locClass}">${locBadge}</span>
          <span class="badge-duration">⏱️ 1h a 2h</span>
        </div>

        ${pitchSvg}

        <div class="cancha-surface-info">🌱 ${c.superficie || 'Césped Pro WPT'}</div>

        <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
          <div class="cancha-price-tag">$ ${Number(c.precio).toLocaleString('es-AR')} <span class="hour-label">/ hora</span></div>
          <span style="font-size:0.75rem; color:var(--neon-green); font-weight:700;">${isSel ? '✓ SELECCIONADA' : 'Elegir ➔'}</span>
        </div>
      </div>
    `;
  }).join("");
}

window.selectCancha = (id) => {
  window.state.selectedCanchaId = id;
  window.state.selectedHora = null;
  document.getElementById("booking-form-box").style.display = "none";
  renderBookingCanchas();
  renderBookingHorarios();
};

function renderBookingFechas() {
  const cont = document.getElementById("booking-fechas-row");
  if (!cont) return;

  const fechas = [];
  const hoy = new Date();
  for (let i = 0; i < DIAS_ADELANTE; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    fechas.push(formatDateISO(d));
  }

  cont.innerHTML = fechas.map(iso => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const isAct = iso === window.state.selectedFecha;
    return `
      <button type="button" class="fecha-pill ${isAct ? 'active' : ''}" onclick="window.selectFecha('${iso}')">
        <div class="dow">${DIAS_SEMANA[dt.getDay()]}</div>
        <div class="num">${d}</div>
      </button>
    `;
  }).join("");
}

window.selectFecha = (iso) => {
  window.state.selectedFecha = iso;
  window.state.selectedHora = null;
  document.getElementById("booking-form-box").style.display = "none";
  renderBookingFechas();
  renderBookingHorarios();
};

function renderBookingHorarios() {
  const grid = document.getElementById("booking-horarios-grid");
  const vacio = document.getElementById("sin-horarios");
  if (!grid) return;

  grid.innerHTML = "";

  const horasBase = ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00"];
  const cancha = window.state.canchas.find(c => c.id === window.state.selectedCanchaId);
  const dur = window.state.selectedDuration || 1;

  // Horas ocupadas
  const ocupados = new Set();
  window.state.turnos
    .filter(t => t.canchaId === window.state.selectedCanchaId && t.fecha === window.state.selectedFecha)
    .forEach(t => {
      ocupados.add(t.hora);
      if (t.duracion === 2) {
        const [h] = t.hora.split(':').map(Number);
        ocupados.add(`${pad2((h + 1) % 24)}:00`);
      }
    });

  horasBase.forEach(h => {
    const isOccupied = ocupados.has(h);
    const isSel = h === window.state.selectedHora;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `horario-btn ${isSel ? 'selected' : ''}`;
    btn.disabled = isOccupied;
    btn.innerHTML = `<span>${h} hs</span>`;
    
    btn.onclick = () => {
      window.state.selectedHora = h;
      renderBookingHorarios();
      showBookingForm(cancha, h, dur);
    };

    grid.appendChild(btn);
  });
}

function showBookingForm(cancha, hora, dur) {
  const formBox = document.getElementById("booking-form-box");
  const confirmBox = document.getElementById("confirm-panel-box");
  if (confirmBox) confirmBox.style.display = "none";
  if (!formBox || !cancha) return;

  formBox.style.display = "block";
  document.getElementById("selected-slot-label").textContent = `${cancha.nombre} · ${formatFechaLarga(window.state.selectedFecha)} · ${hora} hs`;
  document.getElementById("selected-slot-tags").innerHTML = `
    <span class="cancha-sport-badge ${cancha.deporte === 'padel' ? 'badge-padel' : 'badge-futbol'}">${cancha.deporte === 'padel' ? '🎾 Pádel' : '⚽ Fútbol'}</span>
    <span class="${cancha.ubicacion === 'interior' ? 'badge-interior' : 'badge-exterior'}">${cancha.ubicacion === 'interior' ? '🏠 Techada' : '☀️ Exterior'}</span>
    ${dur === 2 ? '<span class="badge-duration" style="color:var(--neon-green);">⏱️ Turno Doble (2hs)</span>' : ''}
  `;
  
  const total = Number(cancha.precio) * dur;
  document.getElementById("selected-slot-price-val").textContent = `$ ${total.toLocaleString('es-AR')}`;
}

function setupBookingFormActions() {
  const btnSubmit = document.getElementById("btn-reservar-submit");
  if (btnSubmit) {
    btnSubmit.addEventListener("click", async () => {
      const nombre = document.getElementById("cliente-nombre").value.trim();
      const whatsapp = document.getElementById("cliente-whatsapp").value.trim();
      const equipo = document.getElementById("cliente-equipo").value.trim();
      const errorEl = document.getElementById("form-error");

      if (!nombre) {
        errorEl.textContent = "Por favor ingresá el nombre del capitán o jugador.";
        return;
      }
      errorEl.textContent = "";

      const cancha = window.state.canchas.find(c => c.id === window.state.selectedCanchaId);
      const nuevoTurno = {
        canchaId: cancha.id,
        canchaNombre: cancha.nombre,
        deporte: cancha.deporte,
        fecha: window.state.selectedFecha,
        hora: window.state.selectedHora,
        duracion: window.state.selectedDuration,
        nombre,
        whatsapp,
        equipo,
        precio: Number(cancha.precio) * window.state.selectedDuration,
        ts: Date.now()
      };

      try {
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Procesando...";

        await addDoc(collection(db, "turnos"), nuevoTurno);
        window.state.lastBooking = nuevoTurno;

        document.getElementById("booking-form-box").style.display = "none";
        showConfirmation(nuevoTurno);
      } catch (err) {
        console.error(err);
        errorEl.textContent = "Error al guardar la reserva en Firestore: " + err.message;
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Confirmar Reserva de Turno 🎾⚽";
      }
    });
  }

  const btnWs = document.getElementById("btn-confirmar-whatsapp");
  if (btnWs) {
    btnWs.addEventListener("click", () => {
      const last = window.state.lastBooking;
      if (!last) return;

      const waNum = window.state.siteConfig.whatsappNumber || "5492613831173";
      const text = `*RESERVA COMPLEJO PADEL 3*\n\nJugador: ${last.nombre}\nCancha: ${last.canchaNombre}\nFecha: ${formatFechaLarga(last.fecha)}\nHora: ${last.hora} hs\nTotal: $${last.precio.toLocaleString('es-AR')}\n\nHola! Quiero confirmar mi turno.`;
      window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(text)}`, "_blank");
    });
  }

  const btnOtro = document.getElementById("btn-reservar-otro");
  if (btnOtro) {
    btnOtro.addEventListener("click", () => {
      document.getElementById("confirm-panel-box").style.display = "none";
    });
  }
}

function setupFilterButtons() {
  // Filtro Deporte
  document.querySelectorAll('[data-filter-sport]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-sport]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.state.selectedSport = btn.getAttribute('data-filter-sport');
      renderBookingCanchas();
    });
  });

  // Filtro Ubicación
  document.querySelectorAll('[data-filter-location]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-location]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.state.selectedLocation = btn.getAttribute('data-filter-location');
      renderBookingCanchas();
    });
  });

  // Selector Duración 1h vs 2h
  document.querySelectorAll('[data-duration]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-duration]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.state.selectedDuration = parseInt(btn.getAttribute('data-duration')) || 1;
      window.state.selectedHora = null;
      document.getElementById('booking-form-box').style.display = 'none';
      renderBookingHorarios();
    });
  });
}

function showConfirmation(turno) {
  const box = document.getElementById("confirm-panel-box");
  const content = document.getElementById("confirm-card-content");
  if (!box || !content) return;

  content.innerHTML = `
    <div class="confirm-row"><span>🏟️ Cancha:</span> <strong>${turno.canchaNombre}</strong></div>
    <div class="confirm-row"><span>📅 Fecha:</span> <strong>${formatFechaLarga(turno.fecha)}</strong></div>
    <div class="confirm-row"><span>⏰ Hora:</span> <strong>${turno.hora} hs (${turno.duracion}h)</strong></div>
    <div class="confirm-row"><span>👤 Capitán:</span> <strong>${turno.nombre}</strong></div>
    <div class="confirm-row"><span>💰 Total:</span> <strong style="color:var(--neon-green);">$ ${turno.precio.toLocaleString('es-AR')}</strong></div>
  `;

  box.style.display = "block";
}

// Escuchar actualizaciones en Firestore
function listenFirestoreUpdates() {
  try {
    onSnapshot(doc(db, "siteConfig", "main"), (snap) => {
      if (snap.exists()) {
        window.state.siteConfig = snap.data();
        renderConfig(window.state.siteConfig);
      }
    });

    onSnapshot(collection(db, "servicios"), (snap) => {
      if (!snap.empty) {
        window.state.servicios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderServicios(window.state.servicios);
      }
    });

    onSnapshot(collection(db, "canchas"), (snap) => {
      if (!snap.empty) {
        window.state.canchas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCanchasGallery(window.state.canchas);
        renderBookingCanchas();
      }
    });

    onSnapshot(collection(db, "turnos"), (snap) => {
      window.state.turnos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderBookingHorarios();
    });
  } catch (err) {
    console.log("ℹ️ Modo autónomo activo.");
  }
}
