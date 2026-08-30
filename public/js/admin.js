/**
 * admin.js - Panel de Administración CMS para Complejo Padel 3
 * Inicialización autónoma y directa de Firebase Auth, Firestore y Storage sin dependencias externas.
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Función de Seeding Autónomo
async function seedFirestoreDirect(seedData) {
  try {
    if (seedData.siteConfig) {
      await setDoc(doc(db, "siteConfig", "main"), seedData.siteConfig);
    }
    if (Array.isArray(seedData.servicios)) {
      for (const srv of seedData.servicios) {
        await setDoc(doc(db, "servicios", srv.id), srv);
      }
    }
    if (Array.isArray(seedData.canchas)) {
      for (const cancha of seedData.canchas) {
        await setDoc(doc(db, "canchas", cancha.id), cancha);
      }
    }
    return { success: true };
  } catch (error) {
    console.error("Error al poblar Firestore:", error);
    return { success: false, error: error.message };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 1. Observador de Estado de Autenticación
  onAuthStateChanged(auth, (user) => {
    const authBox = document.getElementById("admin-auth-screen");
    const dashboard = document.getElementById("admin-dashboard");
    const userBadge = document.getElementById("user-email-badge");
    const logoutBtn = document.getElementById("btn-admin-logout");

    if (user) {
      if (authBox) authBox.style.display = "none";
      if (dashboard) dashboard.style.display = "grid";
      if (userBadge) userBadge.textContent = user.email;
      if (logoutBtn) logoutBtn.style.display = "inline-block";
      loadAdminData();
      listenRealtimeTurnos();
    } else {
      if (authBox) authBox.style.display = "block";
      if (dashboard) dashboard.style.display = "none";
      if (userBadge) userBadge.textContent = "";
      if (logoutBtn) logoutBtn.style.display = "none";
    }
  });

  // 2. Manejo de Login Form
  const loginForm = document.getElementById("admin-login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value.trim();
      const password = document.getElementById("login-password").value.trim();
      const errorMsg = document.getElementById("login-error-msg");

      if (errorMsg) errorMsg.style.display = "none";

      try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("✓ Sesión iniciada correctamente.");
      } catch (err) {
        console.error("Error de login:", err);
        if (errorMsg) {
          errorMsg.textContent = "Credenciales incorrectas o usuario no registrado en Firebase Auth.";
          errorMsg.style.display = "block";
        }
      }
    });
  }

  // 3. Manejo de Logout
  const btnLogout = document.getElementById("btn-admin-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      signOut(auth).then(() => showToast("Sesión cerrada correctamente."));
    });
  }

  // 4. Configurar Tabs
  setupTabs();

  // 5. Guardar Configuración de Textos y Enlaces
  const configForm = document.getElementById("admin-config-form");
  if (configForm) {
    configForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await saveConfigData();
    });
  }

  // 6. Configurar Carga de Archivos a Firebase Storage
  setupStorageUploads();

  // 7. Botón de Poblamiento Inicial (Seed)
  const btnSeed = document.getElementById("btn-seed-firestore");
  if (btnSeed) {
    btnSeed.addEventListener("click", async () => {
      if (confirm("¿Deseas poblar/restaurar la base de datos de Firestore con los datos iniciales por defecto de Complejo Padel 3?")) {
        try {
          const defaultSeedData = {
            siteConfig: {
              nombre: "COMPLEJO PADEL 3",
              subtitulo: "El complejo deportivo #1 de Lavalle · Canchas de Pádel & Fútbol · Techadas y Exterior · Buffet & Estacionamiento",
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
              { id: "c1", nombre: "Pista 1 - Cristal Pro WPT", deporte: "padel", tipo: "techada", techada: true, ubicacion: "interior", activa: true, formato: "doble", superficie: "Césped Sintético Azul WPT", jugadores: 4, precio: 24000, imagen: "https://images.unsplash.com/photo-1626248801379-51a0748a5f96?auto=format&fit=crop&w=800&q=80", descripcion: "Cancha de pádel techada de máxima calidad con paredes de cristal templado y luces LED." },
              { id: "c2", nombre: "Pista 2 - Panorámica VIP", deporte: "padel", tipo: "techada", techada: true, ubicacion: "interior", activa: true, formato: "doble", superficie: "Vidrio Panorámico Pro", jugadores: 4, precio: 24000, imagen: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80", descripcion: "Vista sin estructuras traseras para un juego profesional sin puntos ciegos." },
              { id: "c3", nombre: "Pista 3 - Sunset Open", deporte: "padel", tipo: "exterior", techada: false, ubicacion: "exterior", activa: true, formato: "doble", superficie: "Césped Fibrilado Exterior", jugadores: 4, precio: 20000, imagen: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80", descripcion: "Pista al aire libre ideal para partidos atardecidos y torneos de verano." },
              { id: "c4", nombre: "Cancha 1 - Monumental F5", deporte: "futbol", tipo: "techada", techada: true, ubicacion: "interior", activa: true, formato: "f5", superficie: "Sintético Forbex 50mm Techada", jugadores: 10, precio: 28000, imagen: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80", descripcion: "Cancha techada de fútbol 5 con red protectora perimetral e iluminación de alta definición." },
              { id: "c5", nombre: "Cancha 2 - Wembley F7", deporte: "futbol", tipo: "exterior", techada: false, ubicacion: "exterior", activa: true, formato: "f7", superficie: "Césped Sintético Pro 50mm", jugadores: 14, precio: 36000, imagen: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=800&q=80", descripcion: "Espaciosa cancha de fútbol 7 al aire libre, perfecta para ligas y campeonatos." },
              { id: "c6", nombre: "Cancha 3 - San Siro F5", deporte: "futbol", tipo: "exterior", techada: false, ubicacion: "exterior", activa: true, formato: "f5", superficie: "Césped Sintético Premium 50mm", jugadores: 10, precio: 26000, imagen: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80", descripcion: "Cancha de fútbol 5 descubierta de alta velocidad con iluminación LED nocturna." }
            ]
          };

          await seedFirestoreDirect(defaultSeedData);
          showToast("🌱 Firestore poblado correctamente.");
          loadAdminData();
        } catch (err) {
          console.error("Error en seed:", err);
          showToast("⚠️ Ocurrió un error al ejecutar el poblamiento.");
        }
      }
    });
  }
});

// Carga los datos actuales desde Firestore a los formularios del Admin Panel
async function loadAdminData() {
  try {
    const configSnap = await getDoc(doc(db, "siteConfig", "main"));
    if (configSnap.exists()) {
      const data = configSnap.data();
      setInputValue("cfg-hero-title", data.heroTitle || "");
      setInputValue("cfg-hero-subtitle", data.heroSubtitle || "");
      setInputValue("cfg-turnos-url", data.turnosUrl || "");
      setInputValue("cfg-whatsapp", data.whatsappNumber || "");
      setInputValue("cfg-direccion", data.direccion || "");
      setInputValue("cfg-horarios", data.horarios || "");
      setInputValue("cfg-maps-embed", data.googleMapsEmbed || "");
      setInputValue("cfg-maps-url", data.googleMapsUrl || "");

      if (data.logoUrl) {
        const logoPreview = document.getElementById("logo-preview-img");
        if (logoPreview) logoPreview.src = data.logoUrl;
      }
    }

    loadAdminServicios();
    loadAdminCanchas();

  } catch (err) {
    console.error("Error al cargar datos en Admin Panel:", err);
  }
}

function setInputValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

// Escuchar turnos en tiempo real para la agenda
function listenRealtimeTurnos() {
  try {
    onSnapshot(collection(db, "turnos"), (snap) => {
      const turnos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      renderAdminAgenda(turnos);
    });
  } catch (err) {
    console.log("No se pudo iniciar listener de turnos en admin.");
  }
}

function renderAdminAgenda(turnos) {
  const container = document.getElementById("admin-agenda-list");
  if (!container) return;

  const hoyISO = new Date().toISOString().split("T")[0];
  const turnosHoy = turnos.filter(t => t.fecha === hoyISO);
  const ingresosHoy = turnosHoy.reduce((acc, t) => acc + (Number(t.precio) || 0), 0);
  const ingresosTotal = turnos.reduce((acc, t) => acc + (Number(t.precio) || 0), 0);

  const el = (id) => document.getElementById(id);
  if (el("metric-turnos-total")) el("metric-turnos-total").textContent = turnos.length;
  if (el("metric-turnos-hoy")) el("metric-turnos-hoy").textContent = turnosHoy.length;
  if (el("metric-ingresos-hoy")) el("metric-ingresos-hoy").textContent = `$ ${ingresosHoy.toLocaleString('es-AR')}`;
  if (el("metric-ingresos-total")) el("metric-ingresos-total").textContent = `$ ${ingresosTotal.toLocaleString('es-AR')}`;

  if (turnos.length === 0) {
    container.innerHTML = `<p style="color:var(--text-secondary);">No hay turnos registrados en Firestore.</p>`;
    return;
  }

  container.innerHTML = turnos.map(t => `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:14px; background:rgba(0,0,0,0.3); border-radius:10px; border:1px solid var(--border-subtle);">
      <div>
        <strong style="font-size:1.1rem; color:#fff;">${t.deporte === 'padel' ? '🎾' : '⚽'} ${t.canchaNombre}</strong>
        <div style="font-size:0.9rem; color:var(--cyan-electric); margin-top:2px;">📅 ${t.fecha} · ⏰ ${t.hora} hs (${t.duracion || 1}h)</div>
        <div style="font-size:0.85rem; color:var(--text-secondary);">👤 Capitán: ${t.nombre} ${t.whatsapp ? '· 📲 ' + t.whatsapp : ''}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:1.3rem; font-weight:800; color:var(--neon-green); margin-bottom:6px;">$ ${Number(t.precio).toLocaleString('es-AR')}</div>
        <button type="button" class="btn-secondary" onclick="window.cancelarTurnoAdmin('${t.id}')" style="padding:4px 10px; font-size:0.8rem; border-color:#ff4444; color:#ff4444;">Cancelar Turno</button>
      </div>
    </div>
  `).join("");
}

window.cancelarTurnoAdmin = async (id) => {
  if (confirm("¿Confirmas la cancelación de este turno reservado? La cancha quedará libre nuevamente.")) {
    await deleteDoc(doc(db, "turnos", id));
    showToast("Turno cancelado correctamente.");
  }
};

// Guardar cambios en siteConfig/main
async function saveConfigData() {
  const updateData = {
    heroTitle: document.getElementById("cfg-hero-title").value,
    heroSubtitle: document.getElementById("cfg-hero-subtitle").value,
    turnosUrl: document.getElementById("cfg-turnos-url").value,
    whatsappNumber: document.getElementById("cfg-whatsapp").value,
    whatsappDisplay: document.getElementById("cfg-whatsapp").value.replace(/^549/, ""),
    direccion: document.getElementById("cfg-direccion").value,
    horarios: document.getElementById("cfg-horarios").value,
    googleMapsEmbed: document.getElementById("cfg-maps-embed").value,
    googleMapsUrl: document.getElementById("cfg-maps-url").value
  };

  try {
    await setDoc(doc(db, "siteConfig", "main"), updateData, { merge: true });
    showToast("💾 Configuración guardada exitosamente en Firestore.");
  } catch (err) {
    console.error("Error al guardar configuración:", err);
    showToast("⚠️ Error al guardar en Firestore: " + err.message);
  }
}

// Subida directa de imágenes a Firebase Storage
function setupStorageUploads() {
  const logoInput = document.getElementById("logo-file-input");
  if (logoInput) {
    logoInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const progressBox = document.getElementById("logo-upload-progress");
      if (progressBox) progressBox.textContent = "Subiendo archivo a Firebase Storage...";

      try {
        const storageRef = ref(storage, `complejo/branding/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on("state_changed", 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (progressBox) progressBox.textContent = `Subiendo: ${Math.round(progress)}%`;
          },
          (error) => {
            console.error("Error subida:", error);
            showToast("❌ Error al subir imagen a Storage.");
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            await setDoc(doc(db, "siteConfig", "main"), { logoUrl: downloadURL }, { merge: true });
            
            const logoPreview = document.getElementById("logo-preview-img");
            if (logoPreview) logoPreview.src = downloadURL;
            if (progressBox) progressBox.textContent = "¡Carga completada con éxito!";
            showToast("📸 Logo actualizado en Firebase Storage y Firestore.");
          }
        );
      } catch (err) {
        console.error(err);
      }
    });
  }
}

// Carga lista de Servicios en Admin
async function loadAdminServicios() {
  const container = document.getElementById("admin-servicios-list");
  if (!container) return;

  try {
    const querySnap = await getDocs(collection(db, "servicios"));
    const list = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    container.innerHTML = list.map(srv => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:rgba(0,0,0,0.3); border-radius:8px; margin-bottom:8px; border:1px solid var(--border-subtle);">
        <div>
          <strong>${srv.icono || '🏆'} ${srv.titulo}</strong>
          <div style="font-size:0.85rem; color:var(--text-secondary);">${srv.descripcion}</div>
        </div>
        <button type="button" class="btn-secondary" onclick="window.borrarServicio('${srv.id}')" style="padding:4px 10px; font-size:0.8rem; border-color:#ff4444; color:#ff4444;">Eliminar</button>
      </div>
    `).join("");
  } catch (err) {
    console.log("No se pudieron cargar los servicios.");
  }
}

// Carga lista de Canchas en Admin
async function loadAdminCanchas() {
  const container = document.getElementById("admin-canchas-list");
  if (!container) return;

  try {
    const querySnap = await getDocs(collection(db, "canchas"));
    const list = querySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    container.innerHTML = list.map(c => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:rgba(0,0,0,0.3); border-radius:8px; margin-bottom:8px; border:1px solid var(--border-subtle);">
        <div>
          <strong>${c.deporte === 'padel' ? '🎾' : '⚽'} ${c.nombre}</strong>
          <div style="font-size:0.85rem; color:var(--text-secondary);">${c.tipo} · ${c.superficie} · $ ${Number(c.precio).toLocaleString('es-AR')}</div>
        </div>
        <button type="button" class="btn-secondary" onclick="window.borrarCancha('${c.id}')" style="padding:4px 10px; font-size:0.8rem; border-color:#ff4444; color:#ff4444;">Eliminar</button>
      </div>
    `).join("");
  } catch (err) {
    console.log("No se pudieron cargar las canchas.");
  }
}

window.borrarServicio = async (id) => {
  if (confirm("¿Eliminar este servicio?")) {
    await deleteDoc(doc(db, "servicios", id));
    showToast("Servicio eliminado.");
    loadAdminServicios();
  }
};

window.borrarCancha = async (id) => {
  if (confirm("¿Eliminar esta cancha?")) {
    await deleteDoc(doc(db, "canchas", id));
    showToast("Cancha eliminada.");
    loadAdminCanchas();
  }
};

// Navegación de Tabs en Admin
function setupTabs() {
  const tabBtns = document.querySelectorAll(".admin-tab-btn");
  const tabPanels = document.querySelectorAll(".admin-tab-panel");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabPanels.forEach(p => p.style.display = "none");

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.style.display = "block";
    });
  });
}

// Notificaciones Toast de Feedback
function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.innerHTML = `<span>${msg}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}
