/**
 * admin.js - Panel de Administración CMS para Complejo Padel 3
 * Maneja Autenticación por Firebase Auth, Firestore, agenda de turnos y subida de archivos a Firebase Storage.
 */

import { auth, db, storage } from "./firebaseConfig.js";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc,
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

import { seedFirestore } from "../../seed.js";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Observador de Estado de Autenticación
  onAuthStateChanged(auth, (user) => {
    const authBox = document.getElementById("admin-auth-screen");
    const dashboard = document.getElementById("admin-dashboard");
    const userBadge = document.getElementById("user-email-badge");

    if (user) {
      if (authBox) authBox.style.display = "none";
      if (dashboard) dashboard.style.display = "grid";
      if (userBadge) userBadge.textContent = user.email;
      loadAdminData();
      listenRealtimeTurnos();
    } else {
      if (authBox) authBox.style.display = "block";
      if (dashboard) dashboard.style.display = "none";
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
          const response = await fetch("./seed.json");
          const seedJson = await response.json();
          await seedFirestore(seedJson);
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
