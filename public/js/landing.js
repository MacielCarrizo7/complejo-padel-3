/**
 * landing.js - Lógica principal de la Landing Page One-Page & Sistema de Turnos en Vivo
 * COMPLEJO PADEL 3
 * Inicialización autónoma y directa de Firebase Firestore sin archivos externos.
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
    horarios: "Lunes a Domingo: 14:00 hs a 01:00 hs",
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
    { id: "c1", nombre: "Pista 1 - Cristal Pro WPT", deporte: "padel", tipo: "Interior Techada", superficie: "Césped Sintético Azul WPT", jugadores: 4, precio: 24000, imagen: "https://images.unsplash.com/photo-1626248801379-51a0748a5f96?auto=format&fit=crop&w=800&q=80" },
    { id: "c2", nombre: "Pista 2 - Panorámica VIP", deporte: "padel", tipo: "Interior Techada", superficie: "Vidrio Templado LED", jugadores: 4, precio: 24000, imagen: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80" },
    { id: "c3", nombre: "Pista 3 - Sunset Open", deporte: "padel", tipo: "Exterior", superficie: "Césped Fibrilado", jugadores: 4, precio: 20000, imagen: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80" },
    { id: "c4", nombre: "Cancha 1 - Monumental F5", deporte: "futbol", tipo: "Interior Techada", superficie: "Sintético Forbex 50mm", jugadores: 10, precio: 28000, imagen: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80" },
    { id: "c5", nombre: "Cancha 2 - Wembley F7", deporte: "futbol", tipo: "Exterior", superficie: "Césped Sintético Pro 50mm", jugadores: 14, precio: 36000, imagen: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=800&q=80" }
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
  if (el("contact-horarios")) el("contact-horarios").textContent = config.horarios || window.state.siteConfig.horarios;

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

// Render Courts Gallery
function renderCanchasGallery(canchas) {
  const container = document.getElementById("courts-grid-container");
  if (!container) return;

  container.innerHTML = canchas.map(c => `
    <div class="court-card" data-sport="${c.deporte}">
      <div class="court-img-wrapper">
        <img src="${c.imagen || 'https://images.unsplash.com/photo-1626248801379-51a0748a5f96?auto=format&fit=crop&w=800&q=80'}" alt="${c.nombre}" class="court-img" loading="lazy">
        <span class="court-badge-type">${c.tipo || 'Profesional'}</span>
      </div>
      <div class="court-body">
        <h3 class="court-title">${c.nombre}</h3>
        <div class="court-specs">
          <div class="court-spec-item">🌱 <span>${c.superficie}</span></div>
          <div class="court-spec-item">👥 <span>${c.jugadores} Jugadores</span></div>
        </div>
        <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:16px;">${c.descripcion || ''}</p>
        <div class="court-price-row">
          <div class="court-price-val">$ ${Number(c.precio).toLocaleString('es-AR')} <span>/ hora</span></div>
          <a href="#reservar" onclick="window.seleccionarCanchaDirecta('${c.id}')" class="btn-primary" style="padding:8px 18px; font-size:0.85rem;">Reservar</a>
        </div>
      </div>
    </div>
  `).join("");
}

window.seleccionarCanchaDirecta = (id) => {
  window.state.selectedCanchaId = id;
  renderBookingCanchas();
  renderBookingHorarios();
};

// ================= BOOKING ENGINE LOGIC =================

function renderBookingCanchas() {
  const grid = document.getElementById("booking-canchas-grid");
  if (!grid) return;

  let filtered = window.state.canchas;
  if (window.state.selectedSport !== 'todos') {
    filtered = filtered.filter(c => c.deporte === window.state.selectedSport);
  }
  if (window.state.selectedLocation !== 'todos') {
    filtered = filtered.filter(c => c.tipo.toLowerCase().includes(window.state.selectedLocation));
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-secondary);">No hay canchas con los filtros seleccionados.</p>`;
    return;
  }

  if (!filtered.some(c => c.id === window.state.selectedCanchaId)) {
    window.state.selectedCanchaId = filtered[0].id;
  }

  grid.innerHTML = filtered.map(c => {
    const isSel = c.id === window.state.selectedCanchaId;
    const isPadel = c.deporte === 'padel';
    return `
      <div class="cancha-select-card ${isSel ? 'selected' : ''}" onclick="window.selectCancha('${c.id}')">
        <strong style="font-size:1.2rem; display:block; margin-bottom:4px; color:#fff;">${isPadel ? '🎾' : '⚽'} ${c.nombre}</strong>
        <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:8px;">${c.tipo} · ${c.superficie}</div>
        <div style="font-size:1.2rem; font-weight:800; color:var(--neon-green);">$ ${Number(c.precio).toLocaleString('es-AR')} <span style="font-size:0.8rem; color:var(--text-muted);">/ h</span></div>
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
  document.getElementById("selected-slot-tags").innerHTML = `<span class="court-badge-type">${cancha.tipo}</span>`;
  
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

function showConfirmation(turno) {
  const box = document.getElementById("confirm-panel-box");
  const content = document.getElementById("confirm-card-content");
  if (!box || !content) return;

  content.innerHTML = `
    <div class="confirm-row"><span>🏟️ Cancha:</span> <strong>${turno.canchaNombre}</strong></div>
    <div class="confirm-row"><span>📅 Fecha:</span> <strong>${formatFechaLarga(turno.fecha)}</strong></div>
    <div class="confirm-row"><span>⏰ Hora:</span> <strong>${turno.hora} hs</strong></div>
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
