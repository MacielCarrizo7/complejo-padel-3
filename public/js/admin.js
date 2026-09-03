// =========================================================
// COMPLEJO PADEL 3 - ADMIN CMS & FIREBASE AUTHENTICATION
// =========================================================

window.toggleMobileMenu = function() {
  const menu = document.getElementById('mobile-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
};

const ADMIN_SESSION_KEY = 'complejo_padel3_admin_user';

let adminState = {
  config: null,
  turnos: [],
  servicios: [],
  eventos: [],
  metrics: null,
  isAuthorized: false,
  user: null,
  currentTab: 'agenda',
  agendaSubView: 'lista', // 'lista' or 'tactica'
  selectedTacticalFecha: null,
  filters: {
    cancha: 'todas',
    fechaPreset: 'todos',
    deporte: 'todos',
    estado: 'todos',
    search: ''
  }
};

// Utilities
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatDateISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function hoyISO() {
  return formatDateISO(new Date());
}

function formatCurrency(amount) {
  const symbol = adminState.config?.monedaSimbolo || '$';
  return `${symbol} ${Number(amount || 0).toLocaleString('es-AR')}`;
}

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function formatFechaLarga(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DIAS_SEMANA[date.getDay()]} ${d} de ${MESES[m - 1]}`;
}

function formatFechaLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return { dow: DIAS_SEMANA[date.getDay()], num: d };
}

function sonMismoDia(fechaA, fechaB) {
  if (!fechaA || !fechaB) return false;
  if (fechaA === fechaB) return true;
  // Si una contiene a la otra
  if (fechaA.includes(fechaB) || fechaB.includes(fechaA)) return true;
  // Comparar por el número de día del mes (ej: '3' de '2026-09-03' y '3' de 'Jue 3 de septiembre')
  const matchA = String(fechaA).match(/(?:^|\D)(\d{1,2})(?:\D|$)/);
  const matchB = String(fechaB).match(/(?:^|\D)(\d{1,2})(?:\D|$)/);
  return Boolean(matchA && matchB && matchA[1] === matchB[1]);
}
window.sonMismoDia = sonMismoDia;

// Generate Pitch Silhouette SVG
function getCourtSvgHtml(cancha) {
  if (cancha.deporte === 'padel') {
    return `
      <div class="pitch-container pitch-padel">
        <svg class="pitch-svg" viewBox="0 0 200 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="6" width="188" height="78" fill="none" stroke="rgba(0, 210, 255, 0.7)" stroke-width="2" />
          <rect x="8" y="8" width="184" height="74" fill="none" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1" />
          <line x1="38" y1="8" x2="38" y2="82" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
          <line x1="162" y1="8" x2="162" y2="82" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
          <line x1="38" y1="45" x2="162" y2="45" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
          <line x1="100" y1="4" x2="100" y2="86" stroke="#00E676" stroke-width="2.5" stroke-dasharray="3,2" />
          <circle cx="100" cy="5" r="2.5" fill="#00E676" />
          <circle cx="100" cy="85" r="2.5" fill="#00E676" />
        </svg>
        <div class="pitch-indicator">
          <span>🎾 Pádel (4 jug. · 2 vs 2)</span>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="pitch-container pitch-futbol">
        <svg class="pitch-svg" viewBox="0 0 200 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="5" width="190" height="80" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
          <line x1="100" y1="5" x2="100" y2="85" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
          <circle cx="100" cy="45" r="16" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
          <circle cx="100" cy="45" r="1.5" fill="#FFF" />
          <rect x="5" y="22" width="26" height="46" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
          <rect x="169" y="22" width="26" height="46" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" />
        </svg>
        <div class="pitch-indicator">
          <span>⚽ Fútbol ${cancha.jugadores || 5} (${cancha.jugadores || 5} vs ${cancha.jugadores || 5})</span>
        </div>
      </div>
    `;
  }
}

function generarHorarios() {
  const horarios = [];
  const [hIni, mIni] = (adminState.config?.horaInicio || '14:00').split(':').map(Number);
  let [hFin, mFin] = (adminState.config?.horaFin || '24:00').split(':').map(Number);
  if (hFin === 0 && mFin === 0) hFin = 24;

  let inicio = hIni * 60 + (mIni || 0);
  const fin = hFin * 60 + (mFin || 0);
  const dur = 60;

  while (inicio + dur <= fin) {
    const hh = Math.floor(inicio / 60) % 24;
    const mm = inicio % 60;
    horarios.push(`${pad2(hh)}:${pad2(mm)}`);
    inicio += dur;
  }
  return horarios;
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
      ocupados.push(`${pad2(hh)}:${pad2(mStr || 0)}`);
    }
    return ocupados;
  }

  return [String(reserva.horario || reserva.hora || '')].filter(Boolean);
}

function extractDiaNum(f) {
  if (!f) return null;
  const str = String(f).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return parseInt(str.split('-')[2], 10);
  }
  if (/^\d{1,2}\/\d{1,2}/.test(str)) {
    return parseInt(str.split('/')[0], 10);
  }
  const m = str.match(/\b\d{1,2}\b/);
  return m ? parseInt(m[0], 10) : null;
}

function extractMesNum(f) {
  if (!f) return null;
  const str = String(f).trim().toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return parseInt(str.split('-')[1], 10);
  }
  if (/^\d{1,2}\/\d{1,2}/.test(str)) {
    return parseInt(str.split('/')[1], 10);
  }
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  for (let i = 0; i < meses.length; i++) {
    if (str.includes(meses[i])) return i + 1;
  }
  return null;
}

function fechasCoinciden(f1, f2) {
  if (!f1 || !f2) return false;
  const s1 = String(f1).trim();
  const s2 = String(f2).trim();
  if (s1 === s2) return true;

  // Si ambos son formato ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s1) && /^\d{4}-\d{2}-\d{2}$/.test(s2)) {
    return s1 === s2;
  }

  const d1 = extractDiaNum(s1);
  const d2 = extractDiaNum(s2);
  if (d1 === null || d2 === null || d1 !== d2) return false;

  const m1 = extractMesNum(s1);
  const m2 = extractMesNum(s2);
  if (m1 !== null && m2 !== null) {
    return m1 === m2;
  }

  return true;
}

function coincideCancha(rCancha, canchaNombre) {
  if (!rCancha || !canchaNombre) return false;
  if (typeof rCancha === 'object') {
    return matchCancha(rCancha, canchaNombre);
  }
  const s1 = String(rCancha).toLowerCase().trim();
  const s2 = String(canchaNombre).toLowerCase().trim();
  if (s1 === s2) return true;
  if (s1.includes(s2) || s2.includes(s1)) return true;
  const clean1 = s1.replace(/[^a-z0-9]/g, '');
  const clean2 = s2.replace(/[^a-z0-9]/g, '');
  if (clean1 && clean2 && (clean1.includes(clean2) || clean2.includes(clean1))) return true;
  return false;
}

// ================= FIREBASE AUTH INITIALIZATION =================

let firebaseApp = null;
let firebaseAuth = null;
let firebaseFirestore = null;

function initFirebaseClient() {
  const fbConfig = {
    apiKey: "AIzaSyCCjMf1IIcKsLu2wQPqB-UxGa3bmEmVnWs",
    authDomain: "complejo-padel-3.firebaseapp.com",
    projectId: "complejo-padel-3",
    storageBucket: "complejo-padel-3.firebasestorage.app",
    messagingSenderId: "975322009594",
    appId: "1:975322009594:web:e81ead05c09307e7255e43",
    measurementId: "G-RY4RW29MRS"
  };

  try {
    if (window.firebase) {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(fbConfig);
      } else {
        firebaseApp = firebase.app();
      }
      if (firebase.auth) firebaseAuth = firebase.auth();
      if (firebase.firestore) {
        firebaseFirestore = firebase.firestore();
        setupAdminFirestoreListeners();
      }

      if (firebaseAuth) {
        firebaseAuth.onAuthStateChanged(user => {
          if (user) {
            onAuthSuccess(user);
          } else {
            const savedSession = sessionStorage.getItem(ADMIN_SESSION_KEY);
            if (savedSession) {
              try {
                const u = JSON.parse(savedSession);
                onAuthSuccess(u);
                return;
              } catch (e) {}
            }
            onAuthSignedOut();
          }
        });
      }
    }
  } catch (e) {
    console.warn('Error inicializando Firebase SDK:', e);
  }
}

let todasLasReservas = [];
window.todasLasReservas = todasLasReservas;

function actualizarContadoresKPIs(reservas) {
  fetchMetrics().then(() => renderMetricsKpis());
}
window.actualizarContadoresKPIs = actualizarContadoresKPIs;

function setupAdminFirestoreListeners() {
  if (!firebaseFirestore) return;

  // Escucha reactiva en tiempo real de la colección 'servicios'
  firebaseFirestore.collection('servicios').onSnapshot(snapshot => {
    if (!snapshot.empty) {
      const list = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        list.push({
          id: doc.id,
          ...d,
          titulo: d.titulo || d.nombre || '',
          nombre: d.nombre || d.titulo || '',
          tags: d.tags || d.badges || [],
          badges: d.badges || d.tags || []
        });
      });
      adminState.servicios = list;
      if (adminState.currentTab === 'servicios') {
        renderServiciosTab();
      }
    }
  }, err => console.warn('Admin Firestore servicios onSnapshot error:', err));

  // Escucha reactiva en tiempo real de la colección 'eventos'
  firebaseFirestore.collection('eventos').onSnapshot(snapshot => {
    if (!snapshot.empty) {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      adminState.eventos = list;
      if (adminState.currentTab === 'eventos') {
        renderEventosTab();
      }
    }
  }, err => console.warn('Admin Firestore eventos onSnapshot error:', err));

  // Escucha activa en tiempo real de la colección 'reservas' (y 'turnos')
  const handleReservasSnapshot = (snapshot) => {
    todasLasReservas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log("Reservas actualizadas en tiempo real:", todasLasReservas);
    window.todasLasReservas = todasLasReservas;
    window.turnosData = todasLasReservas;
    adminState.turnos = todasLasReservas;

    // Re-renderizar la vista activa de inmediato
    const estaEnSiluetas = !document.getElementById('vista-siluetas-container')?.classList.contains('hidden');
    if (estaEnSiluetas) {
      const diaActivo = document.querySelector('.btn-dia-silueta.activo')?.dataset.date || adminState.selectedTacticalFecha || '2026-09-03';
      renderTacticalPitchesView(diaActivo);
    } else {
      renderAgendaListItems(todasLasReservas);
    }
    actualizarContadoresKPIs(todasLasReservas);
  };

  try {
    firebaseFirestore.collection("reservas").orderBy("creadoEn", "desc").onSnapshot(handleReservasSnapshot, (error) => {
      console.warn("Aviso en query orderBy(creadoEn), escuchando sin ordenamiento:", error);
      firebaseFirestore.collection("reservas").onSnapshot(handleReservasSnapshot, (err) => {
        console.error("Error en escucha tiempo real de reservas:", err);
      });
    });
  } catch (err) {
    firebaseFirestore.collection("reservas").onSnapshot(handleReservasSnapshot, (error) => {
      console.error("Error en escucha tiempo real de reservas:", error);
    });
  }

  // Escucha reactiva sobre 'turnos' como respaldo para unificar ambas colecciones
  try {
    firebaseFirestore.collection("turnos").onSnapshot(snapshot => {
      if (!snapshot.empty && (!todasLasReservas || todasLasReservas.length === 0)) {
        handleReservasSnapshot(snapshot);
      }
    }, err => console.warn('Admin Firestore turnos onSnapshot error:', err));
  } catch (e) {}
}

async function saveToFirestore(docId, data) {
  try {
    if (firebaseFirestore) {
      await firebaseFirestore.collection('complejo_data').doc(docId).set(data, { merge: true });
      if (docId === 'config') {
        await firebaseFirestore.collection('config').doc('general').set(data, { merge: true });
      }
      console.log(`✓ Sincronizado en Firestore (${docId})`);
    }
  } catch (err) {
    console.warn(`Error al guardar en Firestore (${docId}):`, err);
  }
}

async function saveServiceToFirestore(srv) {
  try {
    if (firebaseFirestore && srv && srv.id) {
      await firebaseFirestore.collection('servicios').doc(srv.id).set(srv, { merge: true });
      console.log(`✓ Servicio "${srv.titulo}" guardado en colección 'servicios'`);
    }
  } catch (err) {
    console.warn('Error al guardar servicio en Firestore:', err);
  }
}

async function deleteServiceFromFirestore(id) {
  try {
    if (firebaseFirestore && id) {
      await firebaseFirestore.collection('servicios').doc(id).delete();
      console.log(`✓ Servicio ${id} eliminado de colección 'servicios'`);
    }
  } catch (err) {
    console.warn('Error al eliminar servicio de Firestore:', err);
  }
}

async function saveEventToFirestore(ev) {
  try {
    if (firebaseFirestore && ev && ev.id) {
      await firebaseFirestore.collection('eventos').doc(ev.id).set(ev, { merge: true });
      console.log(`✓ Evento "${ev.titulo}" guardado en colección 'eventos'`);
    }
  } catch (err) {
    console.warn('Error al guardar evento en Firestore:', err);
  }
}

async function deleteEventFromFirestore(id) {
  try {
    if (firebaseFirestore && id) {
      await firebaseFirestore.collection('eventos').doc(id).delete();
      console.log(`✓ Evento ${id} eliminado de colección 'eventos'`);
    }
  } catch (err) {
    console.warn('Error al eliminar evento de Firestore:', err);
  }
}

async function saveTurnoToFirestore(turno) {
  try {
    if (firebaseFirestore && turno && turno.id) {
      await firebaseFirestore.collection('turnos').doc(turno.id).set(turno, { merge: true });
      await firebaseFirestore.collection('reservas').doc(turno.id).set(turno, { merge: true });
      console.log(`✓ Turno "${turno.id}" guardado en colecciones 'turnos' y 'reservas'`);
    }
  } catch (err) {
    console.warn('Error al guardar turno en Firestore:', err);
  }
}

async function deleteTurnoFromFirestore(id) {
  try {
    if (firebaseFirestore && id) {
      await firebaseFirestore.collection('turnos').doc(id).delete();
      await firebaseFirestore.collection('reservas').doc(id).delete();
      console.log(`✓ Turno ${id} eliminado de colecciones 'turnos' y 'reservas'`);
    }
  } catch (err) {
    console.warn('Error al eliminar turno de Firestore:', err);
  }
}

async function syncFromFirestore() {
  try {
    if (!firebaseFirestore) return;

    // Config
    const docCfg = await firebaseFirestore.collection('complejo_data').doc('config').get();
    if (docCfg.exists && docCfg.data().nombre) {
      adminState.config = docCfg.data();
    } else {
      const docGen = await firebaseFirestore.collection('config').doc('general').get();
      if (docGen.exists && docGen.data().nombre) adminState.config = docGen.data();
    }

    // Servicios
    const snapSrv = await firebaseFirestore.collection('servicios').get();
    if (!snapSrv.empty) {
      const list = [];
      snapSrv.forEach(d => list.push(d.data()));
      adminState.servicios = list;
    } else {
      const docSrv = await firebaseFirestore.collection('complejo_data').doc('servicios').get();
      if (docSrv.exists && Array.isArray(docSrv.data().list)) adminState.servicios = docSrv.data().list;
    }

    // Eventos
    const snapEv = await firebaseFirestore.collection('eventos').get();
    if (!snapEv.empty) {
      const list = [];
      snapEv.forEach(d => list.push(d.data()));
      adminState.eventos = list;
    } else {
      const docEv = await firebaseFirestore.collection('complejo_data').doc('eventos').get();
      if (docEv.exists && Array.isArray(docEv.data().list)) adminState.eventos = docEv.data().list;
    }

    // Turnos / Reservas
    const snapTur = await firebaseFirestore.collection('turnos').get();
    if (!snapTur.empty) {
      const list = [];
      snapTur.forEach(d => list.push(d.data()));
      adminState.turnos = list;
    } else {
      const docTur = await firebaseFirestore.collection('complejo_data').doc('turnos').get();
      if (docTur.exists && Array.isArray(docTur.data().list)) adminState.turnos = docTur.data().list;
    }
    window.turnosData = adminState.turnos;
    window.todasLasReservas = adminState.turnos;
  } catch (err) {
    console.warn('Error al sincronizar datos desde Firestore:', err);
  }
}

function onAuthSuccess(user) {
  adminState.isAuthorized = true;
  adminState.user = user;

  const authContainer = document.getElementById('admin-auth-container');
  const dashboardView = document.getElementById('admin-dashboard-view');
  const userBadge = document.getElementById('admin-user-badge');
  const userEmail = document.getElementById('admin-user-email');
  const logoutBtn = document.getElementById('btn-admin-logout');

  authContainer?.classList.add('hidden');
  dashboardView?.classList.remove('hidden');
  logoutBtn?.classList.remove('hidden');

  if (userBadge && userEmail) {
    userBadge.classList.remove('hidden');
    userBadge.classList.add('inline-flex');
    userEmail.textContent = user.email || 'Admin';
  }

  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ email: user.email, uid: user.uid }));
  refreshAllAdminData();
}

function onAuthSignedOut() {
  adminState.isAuthorized = false;
  adminState.user = null;

  const authContainer = document.getElementById('admin-auth-container');
  const dashboardView = document.getElementById('admin-dashboard-view');
  const userBadge = document.getElementById('admin-user-badge');
  const logoutBtn = document.getElementById('btn-admin-logout');

  authContainer?.classList.remove('hidden');
  dashboardView?.classList.add('hidden');
  logoutBtn?.classList.add('hidden');

  if (userBadge) {
    userBadge.classList.add('hidden');
    userBadge.classList.remove('inline-flex');
  }

  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

// ================= LOGIN & PASSWORD RESET =================

async function loginAdmin(e) {
  if (e) e.preventDefault();

  const emailInput = document.getElementById('admin-email-input');
  const passInput = document.getElementById('admin-password-input');
  const errEl = document.getElementById('admin-auth-error');
  const btn = document.getElementById('btn-admin-login');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value : '';

  if (!email || !password) {
    errEl.textContent = 'Por favor completá email y contraseña.';
    return;
  }

  errEl.textContent = '';
  btn.disabled = true;
  btn.innerHTML = '<span>Verificando credenciales con Firebase...</span> ⏳';

  // Standard Firebase Authentication
  if (firebaseAuth) {
    try {
      const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4 text-black"></i><span>Iniciar Sesión con Firebase</span>';
      if (window.lucide) window.lucide.createIcons();
      onAuthSuccess(userCredential.user);
      return;
    } catch (fbError) {
      console.error('Firebase Auth Error:', fbError.code, fbError.message);
      let errorMsg = 'Error al iniciar sesión con Firebase.';
      if (fbError.code === 'auth/wrong-password' || fbError.code === 'auth/user-not-found' || fbError.code === 'auth/invalid-credential') {
        errorMsg = 'Email o contraseña incorrectos en Firebase Authentication.';
      } else if (fbError.code === 'auth/invalid-email') {
        errorMsg = 'El formato del correo electrónico no es válido.';
      } else if (fbError.code === 'auth/user-disabled') {
        errorMsg = 'La cuenta de usuario de Firebase se encuentra deshabilitada.';
      } else if (fbError.code === 'auth/api-key-not-valid') {
        errorMsg = 'Error de API Key de Firebase. Verificá la configuración del proyecto.';
      } else if (fbError.message) {
        errorMsg = fbError.message;
      }

      errEl.textContent = errorMsg;
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4 text-black"></i><span>Iniciar Sesión con Firebase</span>';
      if (window.lucide) window.lucide.createIcons();
      return;
    }
  }

  // Fallback to Express Backend Auth if Firebase SDK is unavailable
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success && data.isAuthorized) {
      onAuthSuccess(data.user);
    } else {
      errEl.textContent = data.message || 'Credenciales de administrador incorrectas.';
    }
  } catch (err) {
    errEl.textContent = 'Error al conectar con el servidor de autenticación.';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4 text-black"></i><span>Iniciar Sesión con Firebase</span>';
    if (window.lucide) window.lucide.createIcons();
  }
}

async function recuperarPasswordFirebase() {
  const emailInput = document.getElementById('admin-email-input');
  const fbEl = document.getElementById('auth-recovery-feedback');
  const email = emailInput ? emailInput.value.trim() : '';

  if (!email) {
    alert('Ingresá tu correo electrónico en el campo superior para enviarte el enlace de restablecimiento.');
    emailInput?.focus();
    return;
  }

  fbEl.classList.remove('hidden');
  fbEl.textContent = 'Enviando correo de restablecimiento... ⏳';
  fbEl.className = 'text-xs mt-2 text-slate-400';

  if (firebaseAuth) {
    try {
      await firebaseAuth.sendPasswordResetEmail(email);
      fbEl.innerHTML = `✓ Se envió un correo de restablecimiento a <strong>${escapeHtml(email)}</strong>.`;
      fbEl.className = 'text-xs mt-2 text-[#00E676]';
      return;
    } catch (e) {
      console.warn('Firebase password reset error:', e);
    }
  }

  fbEl.innerHTML = `✓ Solicitud de restablecimiento procesada para <strong>${escapeHtml(email)}</strong>.`;
  fbEl.className = 'text-xs mt-2 text-[#00E676]';
}

async function logoutAdmin() {
  if (firebaseAuth) {
    try {
      await firebaseAuth.signOut();
    } catch (e) {}
  }
  onAuthSignedOut();
}

// ================= DATA REFRESHING =================

async function refreshAllAdminData() {
  await Promise.all([
    fetchConfig(),
    fetchTurnos(),
    fetchMetrics(),
    fetchServicios(),
    fetchEventos()
  ]);

  renderActiveTabContent();
}

async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.success) {
      adminState.config = data.config;
      syncConfigTabInputs();
    }
  } catch (e) { console.warn(e); }
}

async function fetchTurnos() {
  try {
    const res = await fetch('/api/turnos');
    const data = await res.json();
    if (data.success) adminState.turnos = data.turnos || [];
  } catch (e) { console.warn(e); }
}

async function fetchMetrics() {
  try {
    const res = await fetch('/api/metrics');
    const data = await res.json();
    if (data.success) {
      adminState.metrics = data.metrics;
      renderMetricsKpis();
    }
  } catch (e) { console.warn(e); }
}

async function fetchServicios() {
  try {
    const res = await fetch('/api/servicios');
    const data = await res.json();
    if (data.success) adminState.servicios = data.servicios || [];
  } catch (e) { console.warn(e); }
}

async function fetchEventos() {
  try {
    const res = await fetch('/api/eventos');
    const data = await res.json();
    if (data.success) adminState.eventos = data.eventos || [];
  } catch (e) { console.warn(e); }
}

// ================= TAB MANAGEMENT =================

function setupTabNavigation() {
  document.querySelectorAll('[data-admin-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-admin-tab');
      adminState.currentTab = tabId;

      document.querySelectorAll('[data-admin-tab]').forEach(b => {
        b.classList.remove('active', 'bg-[#00E676]', 'text-black');
        b.classList.add('text-slate-400');
      });

      btn.classList.add('active', 'bg-[#00E676]', 'text-black');
      btn.classList.remove('text-slate-400');

      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
      const activeContent = document.getElementById(`tab-content-${tabId}`);
      if (activeContent) activeContent.classList.remove('hidden');

      renderActiveTabContent();
    });
  });
}

function renderActiveTabContent() {
  if (!adminState.isAuthorized) return;

  switch (adminState.currentTab) {
    case 'agenda':
      renderAgendaTab();
      break;
    case 'canchas':
      renderCanchasTab();
      break;
    case 'eventos':
      renderEventosTab();
      break;
    case 'servicios':
      renderServiciosTab();
      break;
    case 'config':
      renderConfigTab();
      break;
    case 'historias':
      renderHistoriasTab();
      break;
  }

  if (window.lucide) window.lucide.createIcons();
}

// ================= TAB 1: AGENDA & FINANZAS =================

function renderMetricsKpis() {
  const m = adminState.metrics;
  if (!m) return;

  const canchasEl = document.getElementById('metric-canchas');
  const turnosHoyEl = document.getElementById('metric-turnos-hoy');
  const ingHoyEl = document.getElementById('metric-ingresos-hoy');
  const ingTotEl = document.getElementById('metric-ingresos-total');

  if (canchasEl) canchasEl.textContent = m.totalCanchas || 0;
  if (turnosHoyEl) turnosHoyEl.textContent = m.turnosHoy || 0;
  if (ingHoyEl) ingHoyEl.textContent = m.ingresosHoyFormateado || '$ 0';
  if (ingTotEl) ingTotEl.textContent = m.ingresosProyectadosFormateado || '$ 0';
}

function populateAgendaFilters() {
  const selectCancha = document.getElementById('filter-agenda-cancha');
  if (selectCancha) {
    const current = adminState.filters.cancha;
    const canchasList = adminState.config?.canchas || [];
    let html = `<option value="todas">🏪 Todas las canchas (${canchasList.length})</option>`;
    canchasList.forEach(c => {
      const sportEmoji = c.deporte === 'padel' ? '🎾' : '⚽';
      const locEmoji = c.ubicacion === 'interior' ? '🏠' : '☀️';
      html += `<option value="${c.id}" ${c.id === current ? 'selected' : ''}>${sportEmoji} ${escapeHtml(c.nombre)} (${locEmoji})</option>`;
    });
    selectCancha.innerHTML = html;
  }
}

function isTurnoPasado(t) {
  if (!t || !t.fecha) return false;
  try {
    const [y, m, d] = String(t.fecha).split('-').map(Number);
    const dur = Number(t.duracion) || 1;
    let hh = 0;
    let mm = 0;
    if (t.horaFin && t.horaFin.includes(':')) {
      const [hfH, hfM] = String(t.horaFin).split(':').map(Number);
      hh = hfH;
      mm = hfM;
    } else if (t.hora && t.hora.includes(':')) {
      const [hIni, mIni] = String(t.hora).split(':').map(Number);
      hh = (hIni + dur) % 24;
      mm = mIni || 0;
    }
    const endOfTurno = new Date(y, m - 1, d, hh === 0 ? 24 : hh, mm, 0);
    return endOfTurno < new Date();
  } catch (e) {
    return false;
  }
}

function getFilteredTurnos() {
  const { cancha, fechaPreset, deporte, estado, search } = adminState.filters;
  const hoy = hoyISO();
  const now = new Date();

  const estFilter = String(estado || 'todos').toLowerCase().trim();
  const depFilter = String(deporte || 'todos').toLowerCase().trim();
  const canchaFilter = String(cancha || 'todas').toLowerCase().trim();
  const fechaFilt = String(fechaPreset || 'todos').toLowerCase().trim();

  const allTurnos = (adminState.turnos && adminState.turnos.length > 0)
    ? adminState.turnos
    : (window.turnosData || window.todasLasReservas || []);

  return allTurnos.filter(t => {
    // 1. Filtro Deporte
    if (depFilter !== 'todos') {
      const tDep = String(t.deporte || '').toLowerCase().trim();
      if (tDep !== depFilter) return false;
    }

    // 2. Filtro Cancha
    if (canchaFilter !== 'todas') {
      const tCanchaId = String(t.canchaId || '').toLowerCase().trim();
      const tCanchaNom = String(t.canchaNombre || '').toLowerCase().trim();
      if (tCanchaId !== canchaFilter && tCanchaNom !== canchaFilter) return false;
    }

    // 3. Filtro Estado (Normalizado con soporte para 'finalizados', 'confirmados' y 'pendientes')
    if (estFilter !== 'todos') {
      const isConfirmed = Boolean(t.confirmado) || ['confirmado', 'whatsapp', 'confirmed'].includes(String(t.estado || '').toLowerCase().trim());
      const pasado = isTurnoPasado(t);
      if (estFilter === 'finalizados' || estFilter === 'finalizado') {
        if (!pasado) return false;
      } else if (estFilter === 'confirmados' || estFilter === 'confirmado') {
        if (pasado || !isConfirmed) return false;
      } else if (estFilter === 'pendientes' || estFilter === 'pendiente') {
        if (pasado || isConfirmed) return false;
      }
    }

    // 4. Filtro de Fechas (formato local YYYY-MM-DD sin desfase UTC y match tolerante con texto)
    const turnoFecha = String(t.fecha || '').trim();
    if (fechaFilt === 'hoy') {
      if (!fechasCoinciden(turnoFecha, hoy)) return false;
    } else if (fechaFilt === 'manana') {
      const tom = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const manana = `${tom.getFullYear()}-${pad2(tom.getMonth() + 1)}-${pad2(tom.getDate())}`;
      if (!fechasCoinciden(turnoFecha, manana)) return false;
    } else if (fechaFilt === 'semana') {
      const sem = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
      const en7dias = `${sem.getFullYear()}-${pad2(sem.getMonth() + 1)}-${pad2(sem.getDate())}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(turnoFecha) && (turnoFecha < hoy || turnoFecha > en7dias)) return false;
    } else if (fechaFilt === 'todos') {
      // Todos los turnos futuros
      if (/^\d{4}-\d{2}-\d{2}$/.test(turnoFecha) && turnoFecha < hoy) return false;
    }
    // Si es 'todos_historicos' o cualquier otro, muestra todo el historial

    // 5. Búsqueda de texto libre
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = String(t.nombre || '').toLowerCase().includes(q);
      const matchWa = String(t.whatsapp || '').toLowerCase().includes(q);
      const matchTeam = String(t.equipo || '').toLowerCase().includes(q);
      const matchCourt = String(t.canchaNombre || '').toLowerCase().includes(q);
      if (!matchName && !matchWa && !matchTeam && !matchCourt) return false;
    }

    return true;
  });
}

function renderTurnosList() {
  renderAgendaListItems();
}

function renderTurnos() {
  renderTurnosList();
}

function aplicarFiltros() {
  renderTurnosList();
}

function renderSiluetas(diaActivo) {
  renderSiluetasPorDia(diaActivo);
}

function renderTacticalPitchesView(diaActivo) {
  renderSiluetasPorDia(diaActivo);
}

function renderAgendaTab() {
  try {
    populateAgendaFilters();

    const containerLista = document.getElementById('vista-lista-container') || document.getElementById('seccion-lista-turnos') || document.getElementById('admin-agenda-list-view');
    const containerSiluetas = document.getElementById('vista-siluetas-container') || document.getElementById('seccion-siluetas-tacticas') || document.getElementById('admin-tactical-view');
    const btnLista = document.getElementById('btn-vista-lista') || document.getElementById('btn-subview-lista');
    const btnSiluetas = document.getElementById('btn-vista-siluetas') || document.getElementById('btn-subview-tactica');

    if (adminState.agendaSubView === 'lista') {
      if (containerLista) containerLista.classList.remove('hidden');
      if (containerSiluetas) containerSiluetas.classList.add('hidden');
      if (btnLista) {
        btnLista.className = "btn-subview-toggle px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all";
      }
      if (btnSiluetas) {
        btnSiluetas.className = "btn-subview-toggle px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-medium text-xs flex items-center gap-2 hover:bg-slate-850 transition-all";
      }
      renderTurnos();
    } else {
      if (containerLista) containerLista.classList.add('hidden');
      if (containerSiluetas) containerSiluetas.classList.remove('hidden');
      if (btnSiluetas) {
        btnSiluetas.className = "btn-subview-toggle px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all";
      }
      if (btnLista) {
        btnLista.className = "btn-subview-toggle px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-medium text-xs flex items-center gap-2 hover:bg-slate-850 transition-all";
      }
      const diaActivo = document.querySelector('.btn-dia-silueta.activo')?.dataset.date || adminState.selectedTacticalFecha || 'hoy';
      renderSiluetasPorDia(diaActivo);
    }
  } catch (err) {
    console.error('Error en renderAgendaTab:', err);
  }
}

function renderAgendaListItems() {
  const container = document.getElementById('admin-agenda-list-container') || document.getElementById('turnos-list-container');
  const emptyEl = document.getElementById('admin-agenda-empty');
  if (!container || !emptyEl) return;
  container.innerHTML = '';

  const list = getFilteredTurnos().sort((a, b) => {
    const fechaA = String(a?.fecha || a?.dia || '');
    const fechaB = String(b?.fecha || b?.dia || '');
    const fechaComp = fechaA.localeCompare(fechaB);
    if (fechaComp !== 0) return fechaComp;

    const horaA = String(a?.horario || a?.hora || '');
    const horaB = String(b?.horario || b?.hora || '');
    return horaA.localeCompare(horaB);
  });

  if (list.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  let currentDay = null;

  list.forEach(t => {
    const r = t;
    const nombreCliente = r.cliente || r.nombre || 'Cliente sin nombre';
    const telCliente = r.telefono || r.whatsapp || 'Sin teléfono';
    const nombreCancha = r.cancha || r.canchaNombre || 'Cancha general';
    const fechaMostrar = r.fechaTexto || r.fecha || 'Fecha no definida';
    const horarioMostrar = r.horario || (r.hora ? `${r.hora} hs` : 'Horario no definido');
    const precioMostrar = (Number(r.precio) || 0).toLocaleString('es-AR');

    if (r.fecha !== currentDay) {
      currentDay = r.fecha;
      const dayHeader = document.createElement('div');
      dayHeader.className = 'pt-4 pb-2 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-[#00E676] flex items-center gap-2';
      dayHeader.innerHTML = `<i data-lucide="calendar" class="w-4 h-4"></i><span>${escapeHtml(fechaMostrar)}</span>`;
      container.appendChild(dayHeader);
    }

    const card = document.createElement('div');
    card.className = 'glass-card reserva-card p-4 sm:p-5 border border-slate-800/90 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 hover:border-slate-700/80 group';
    card.setAttribute('data-turno-card', r.id);

    const isPadel = (r.deporte || '').toLowerCase().includes('padel');
    const isConfirmed = Boolean(r.confirmado) || ['confirmado', 'whatsapp', 'confirmed'].includes(String(r.estado || '').toLowerCase().trim());
    const pasado = isTurnoPasado(r);
    const isPendiente = !isConfirmed && !pasado && (String(r.estado || 'pendiente').toLowerCase().trim() === 'pendiente');

    // Botón WhatsApp "Consultar Asistencia" para turnos pendientes
    let cleanPhone = String(telCliente).replace(/\D/g, '');
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('54')) {
      cleanPhone = '549' + cleanPhone;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = '549' + cleanPhone.substring(1);
    }
    const msgAsistencia = encodeURIComponent(`Hola ${nombreCliente}! Te escribimos desde el complejo para confirmar si vas a asistir a tu turno en ${nombreCancha} el día ${fechaMostrar} a las ${horarioMostrar}. ¿Nos confirmás? Muchas gracias!`);
    const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${msgAsistencia}` : '#';

    // Badge de estado
    let badgeHtml = '';
    if (pasado) {
      badgeHtml = `<div id="badge-status-${r.id}" class="estado-badge flex items-center gap-1 font-bold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs"><span>🏁 Finalizado</span></div>`;
    } else if (isConfirmed) {
      badgeHtml = `<div id="badge-status-${r.id}" class="estado-badge flex items-center gap-1 font-bold text-[#00E676] bg-[#00E676]/10 px-2.5 py-1 rounded-lg border border-[#00E676]/30 text-xs"><span>✓ Confirmado</span></div>`;
    } else {
      badgeHtml = `<div id="badge-status-${r.id}" class="estado-badge flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30 text-xs"><span>⏳ Pendiente</span></div>`;
    }

    // Bloque de acciones
    let actionsHtml = '';
    if (pasado) {
      actionsHtml = `
        <button class="btn-liberar-cancha px-3.5 py-2 rounded-xl bg-[#161F30] hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-500 font-sports font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5" data-id="${r.id}" title="Eliminar del historial">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          <span>Eliminar</span>
        </button>
      `;
    } else {
      actionsHtml = `
        ${(isPendiente && cleanPhone) ? `
        <a href="${whatsappLink}" target="_blank" class="btn-consultar-asistencia px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/30 flex items-center gap-1 text-xs font-semibold" title="Consultar asistencia por WhatsApp">
          💬 Consultar Asistencia
        </a>` : ''}

        <button id="btn-confirm-${r.id}" class="btn-confirmar btn-confirm-turno px-4 py-2.5 rounded-xl bg-[#00E676] hover:bg-[#00E676]/90 text-black font-sports font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,230,118,0.25)] flex items-center gap-1.5 ${isConfirmed ? 'hidden' : ''}" data-id="${r.id}">
          <i data-lucide="check" class="w-4 h-4 stroke-[3] text-black"></i>
          <span>✓ CONFIRMAR</span>
        </button>

        <button class="btn-liberar-cancha px-4 py-2.5 rounded-xl bg-[#161F30] hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-500 font-sports font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5" data-id="${r.id}" title="Liberar Cancha">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
          <span>Liberar Cancha</span>
        </button>
      `;
    }

    card.innerHTML = `
      <div class="flex items-start sm:items-center gap-4 flex-1 min-w-0">
        <!-- Ícono del deporte en recuadro redondeado oscuro con borde sutil -->
        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#0B0F19] border border-slate-700/60 flex items-center justify-center shrink-0 shadow-inner">
          <span class="text-2xl sm:text-3xl select-none leading-none">${isPadel ? '🎾' : '⚽'}</span>
        </div>

        <div class="space-y-1.5 flex-1 min-w-0">
          <!-- Encabezado del turno: Cancha | Fecha | Horario -->
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-sports font-bold text-white text-base sm:text-lg tracking-wide uppercase truncate">
              ${escapeHtml(nombreCancha)}
            </h3>
            <span class="px-2.5 py-0.5 rounded-lg bg-[#162032] border border-slate-700/80 text-slate-300 text-xs font-semibold">
              📅 Fecha: ${escapeHtml(fechaMostrar)}
            </span>
            <span class="px-2.5 py-0.5 rounded-lg bg-[#00E676]/10 border border-[#00E676]/30 text-[#00E676] text-xs font-mono font-bold">
              ⏰ Horario: ${escapeHtml(horarioMostrar)}
            </span>
          </div>

          <!-- Datos del cliente: Cliente | Tel | Precio -->
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
            <div class="flex items-center gap-1.5 font-bold text-slate-100">
              <span class="text-sm">👤</span>
              <span>Cliente: <strong class="uppercase text-white">${escapeHtml(nombreCliente)}</strong></span>
            </div>
            <div class="flex items-center gap-1.5 text-slate-300">
              <span class="text-sm">📱</span>
              <span>Tel: <strong class="font-mono text-slate-200">${escapeHtml(telCliente)}</strong></span>
            </div>
            <div class="flex items-center gap-1 font-bold text-[#00E676]">
              <span>💰</span>
              <span>Precio: $${precioMostrar}</span>
            </div>
            ${badgeHtml}
          </div>
        </div>
      </div>

      <!-- Acciones a la derecha -->
      <div class="flex items-center gap-2.5 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80 w-full md:w-auto justify-end flex-wrap">
        ${actionsHtml}
      </div>
    `;

    container.appendChild(card);
  });
}

function exportAgendaToCSV() {
  let listToExport = getFilteredTurnos();
  if (!listToExport || listToExport.length === 0) {
    listToExport = adminState.turnos || [];
  }
  if (!listToExport || listToExport.length === 0) {
    alert('No hay turnos registrados en la base de datos para exportar.');
    return;
  }

  const headers = ["Fecha", "Hora", "Cliente", "Teléfono", "Cancha", "Deporte", "Estado", "Precio", "Duración"].join(";") + "\r\n";
  const rows = listToExport.map(reserva => {
    const isConfirmed = Boolean(reserva.confirmado) || ['confirmado', 'whatsapp', 'confirmed'].includes(String(reserva.estado || '').toLowerCase().trim());
    const pasado = isTurnoPasado(reserva);
    const estadoTxt = pasado ? 'Finalizado' : (isConfirmed ? 'Confirmado' : 'Pendiente');
    const horaTxt = reserva.hora ? `${reserva.hora}${reserva.horaFin ? ` a ${reserva.horaFin}` : ''}` : (reserva.horario || '');

    return [
      reserva.fecha || '',
      horaTxt,
      reserva.nombre || reserva.cliente || 'Sin nombre',
      reserva.whatsapp || reserva.telefono || '',
      `"${(reserva.canchaNombre || reserva.cancha || '').replace(/"/g, '""')}"`,
      reserva.deporte || 'Pádel',
      estadoTxt,
      reserva.precio || '0',
      reserva.duracion ? `${reserva.duracion}h` : '1h'
    ].join(';');
  });

  const csvContent = "\uFEFF" + headers + rows.join("\r\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `agenda_turnos_${hoyISO()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function renderSiluetasPorDia(fecha) {
  try {
    const pitchesGrid = document.getElementById('siluetas-grid') || document.getElementById('admin-tactical-pitches-grid');
    const fechasCont = document.getElementById('admin-tactical-fechas');
    if (!pitchesGrid) {
      console.warn('Contenedor siluetas-grid no encontrado en el DOM');
      return;
    }

    // Normalizar fecha
    if (!fecha || fecha === 'hoy') {
      fecha = hoyISO();
    }
    adminState.selectedTacticalFecha = fecha;

    const allTurnos = adminState.turnos || window.turnosData || window.todasLasReservas || [];

    // 1. Selector de fechas (próximos 14 días + días con turnos)
    if (fechasCont) {
      const proximas = [];
      const hoyDate = new Date();
      hoyDate.setHours(0, 0, 0, 0);
      for (let i = 0; i < 14; i++) {
        const d = new Date(hoyDate);
        d.setDate(hoyDate.getDate() + i);
        proximas.push(formatDateISO(d));
      }
      const fechasSet = new Set([...proximas, ...allTurnos.map(t => t.fecha).filter(Boolean)]);
      const fechas = Array.from(fechasSet).sort();

      fechasCont.innerHTML = '';
      fechas.forEach(iso => {
        const { dow, num } = formatFechaLabel(iso);
        const isSelected = iso === fecha;
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.setAttribute('data-date', iso);
        pill.className = `btn-dia-silueta min-w-[65px] px-3 py-2 rounded-xl text-center border font-sports transition-all flex-shrink-0 ${isSelected ? 'activo bg-[#00E676] text-black border-[#00E676] font-bold shadow-[0_0_15px_rgba(0,230,118,0.4)]' : 'bg-[#161F30] text-slate-300 border-slate-700 hover:text-white'}`;
        pill.innerHTML = `
          <div class="text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-black' : 'text-slate-400'}">${dow}</div>
          <div class="text-lg font-bold leading-none mt-0.5 ${isSelected ? 'text-black' : 'text-white'}">${num}</div>
        `;
        pill.addEventListener('click', () => {
          try {
            renderSiluetasPorDia(iso);
          } catch (e) {
            console.error('Error al cambiar día de silueta:', e);
          }
        });
        fechasCont.appendChild(pill);
      });
    }

    // 2. Canchas: asegurar las 6 canchas activas del complejo
    const DEFAULT_CANCHAS = [
      { id: 'c1', deporte: 'padel', nombre: 'Pista 1 - Cristal Pro', ubicacion: 'interior', superficie: 'Césped Sintético Azul WPT', jugadores: 4, precio: 24000 },
      { id: 'c2', deporte: 'padel', nombre: 'Pista 2 - Panorámica', ubicacion: 'interior', superficie: 'Vidrio Panorámico LED', jugadores: 4, precio: 24000 },
      { id: 'c3', deporte: 'padel', nombre: 'Pista 3 - Sunset Open', ubicacion: 'exterior', superficie: 'Césped Texturado Fibrilado', jugadores: 4, precio: 20000 },
      { id: 'c4', deporte: 'futbol', nombre: 'Cancha 1 - Monumental F5', ubicacion: 'interior', superficie: 'Sintético Forbex 50mm Techada', jugadores: 5, precio: 28000 },
      { id: 'c5', deporte: 'futbol', nombre: 'Cancha 2 - Wembley F7', ubicacion: 'exterior', superficie: 'Césped Sintético Pro Iluminación LED', jugadores: 7, precio: 36000 },
      { id: 'c6', deporte: 'futbol', nombre: 'Cancha 3 - San Siro F5', ubicacion: 'exterior', superficie: 'Césped Sintético Premium', jugadores: 5, precio: 26000 }
    ];

    const canchas = (adminState.config?.canchas && adminState.config.canchas.length > 0)
      ? adminState.config.canchas
      : DEFAULT_CANCHAS;

    pitchesGrid.innerHTML = '';
    const slots = generarHorarios();

    canchas.forEach(cancha => {
      const card = document.createElement('div');
      card.className = 'glass-card p-5 border border-slate-800 space-y-4 rounded-2xl bg-[#161F30]/70 backdrop-blur-sm';

      const pitchSvg = getCourtSvgHtml(cancha);

      let slotsHtml = '';
      slots.forEach(horaSlot => {
        const turno = (todasLasReservas && todasLasReservas.length > 0 ? todasLasReservas : allTurnos).find(r => {
          if (!r || r.estado === 'cancelado' || r.estado === 'liberado') return false;

          const matchCancha = (r.cancha || r.canchaNombre || '').toLowerCase().includes(cancha.nombre.toLowerCase().trim()) ||
                              cancha.nombre.toLowerCase().trim().includes((r.cancha || r.canchaNombre || '').toLowerCase()) ||
                              (typeof coincideCancha === 'function' && coincideCancha(r, cancha));

          const matchFecha = sonMismoDia(r.fecha || r.fechaTexto, fecha);
          const matchHora = (r.hora === horaSlot) || (r.horario || '').includes(horaSlot) || (typeof getHorasOcupadas === 'function' && getHorasOcupadas(r).includes(horaSlot));

          return matchCancha && matchFecha && matchHora;
        });

        if (turno) {
          const clienteNombre = String(turno.cliente || turno.nombre || 'CLIENTE').toUpperCase();
          slotsHtml += `
            <button type="button" disabled class="w-full px-2.5 py-1.5 rounded-lg border bg-rose-950/40 text-rose-400 border-rose-800 text-xs font-bold flex items-center justify-between opacity-95 cursor-not-allowed shadow-inner" title="Ocupado - ${escapeHtml(clienteNombre)}">
              <span>🔴 ${horaSlot} OCUPADO - ${escapeHtml(clienteNombre)}</span>
            </button>
          `;
        } else {
          slotsHtml += `
            <button type="button" class="w-full px-2.5 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center justify-between hover:bg-emerald-900/30 hover:border-emerald-400 transition-colors cursor-pointer" title="Libre">
              <span>⚪ ${horaSlot} LIBRE</span>
            </button>
          `;
        }
      });

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <h4 class="font-sports text-lg font-bold text-white uppercase">${escapeHtml(cancha.nombre)}</h4>
          <span class="font-bebas text-xl text-[#00E676]">${formatCurrency(cancha.precio)} / h</span>
        </div>
        ${pitchSvg}
        <div>
          <div class="text-[11px] font-bold text-slate-400 uppercase mb-2 flex items-center justify-between">
            <span>Horarios del día (${fecha}):</span>
            <span class="text-[10px] text-slate-500 lowercase">60 min por turno</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            ${slotsHtml}
          </div>
        </div>
      `;

      pitchesGrid.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.error('Error en renderSiluetasPorDia:', err);
  }
}

// Aliases para compatibilidad global
function renderSiluetas(diaActivo) {
  renderSiluetasPorDia(diaActivo);
}

function renderTacticalPitchesView(diaActivo) {
  renderSiluetasPorDia(diaActivo);
}

window.renderSiluetasPorDia = renderSiluetasPorDia;
window.renderSiluetas = renderSiluetasPorDia;
window.renderTacticalPitchesView = renderSiluetasPorDia;
window.renderTurnosList = renderTurnosList;
window.renderTurnos = renderTurnosList;
window.aplicarFiltros = renderTurnosList;

// ================= TAB 2: GESTIÓN DE CANCHAS =================

function renderCanchasTab() {
  const container = document.getElementById('admin-canchas-manager-container');
  if (!container) return;
  container.innerHTML = '';

  const canchas = adminState.config?.canchas || [];

  canchas.forEach((cancha, index) => {
    const item = document.createElement('div');
    item.className = 'glass-card p-5 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end';

    const isPadel = cancha.deporte === 'padel';

    item.innerHTML = `
      <div class="lg:col-span-2">
        <label class="block text-[11px] font-bold text-slate-400 uppercase mb-1">Nombre de Cancha</label>
        <input type="text" value="${escapeHtml(cancha.nombre)}" data-idx="${index}" data-field="nombre" class="w-full px-3 py-2 rounded-lg bg-[#1E293B] border border-slate-700 text-white text-xs focus:outline-none focus:border-[#00E676]">
      </div>

      <div>
        <label class="block text-[11px] font-bold text-slate-400 uppercase mb-1">Deporte</label>
        <select data-idx="${index}" data-field="deporte" class="w-full px-3 py-2 rounded-lg bg-[#1E293B] border border-slate-700 text-white text-xs focus:outline-none focus:border-[#00E676]">
          <option value="padel" ${isPadel ? 'selected' : ''}>🎾 Pádel</option>
          <option value="futbol" ${!isPadel ? 'selected' : ''}>⚽ Fútbol</option>
        </select>
      </div>

      <div>
        <label class="block text-[11px] font-bold text-slate-400 uppercase mb-1">Ubicación</label>
        <select data-idx="${index}" data-field="ubicacion" class="w-full px-3 py-2 rounded-lg bg-[#1E293B] border border-slate-700 text-white text-xs focus:outline-none focus:border-[#00E676]">
          <option value="interior" ${cancha.ubicacion === 'interior' ? 'selected' : ''}>🏠 Interior Techada</option>
          <option value="exterior" ${cancha.ubicacion === 'exterior' ? 'selected' : ''}>☀️ Exterior</option>
        </select>
      </div>

      <div>
        <label class="block text-[11px] font-bold text-[#00E676] uppercase mb-1">Precio / Turno ($)</label>
        <input type="number" min="0" step="500" value="${cancha.precio || 20000}" data-idx="${index}" data-field="precio" class="w-full px-3 py-2 rounded-lg bg-[#1E293B] border border-slate-700 text-[#00E676] font-bold text-xs focus:outline-none focus:border-[#00E676]">
      </div>

      <div class="flex items-center gap-2">
        <button type="button" class="btn-del-cancha w-full py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-xs font-bold border border-red-500/30 transition-all flex items-center justify-center gap-1" data-del-idx="${index}">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          <span>Eliminar</span>
        </button>
      </div>
    `;

    container.appendChild(item);
  });

  container.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      const field = e.target.dataset.field;
      if (adminState.config?.canchas[idx]) {
        if (field === 'precio' || field === 'jugadores') {
          adminState.config.canchas[idx][field] = Number(e.target.value) || 0;
        } else {
          adminState.config.canchas[idx][field] = e.target.value.trim();
        }

        if (field === 'deporte') {
          if (e.target.value === 'padel') {
            adminState.config.canchas[idx].jugadores = 4;
            adminState.config.canchas[idx].superficie = 'Césped Sintético Azul WPT';
          } else {
            adminState.config.canchas[idx].jugadores = 5;
            adminState.config.canchas[idx].superficie = 'Césped Sintético 50mm';
          }
          renderCanchasTab();
        }
      }
    });
  });

  container.querySelectorAll('.btn-del-cancha').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.delIdx);
      if ((adminState.config?.canchas?.length || 0) <= 1) {
        alert('El complejo debe tener al menos una cancha configurada.');
        return;
      }
      const c = adminState.config.canchas[idx];
      if (confirm(`¿Eliminar la cancha "${c.nombre}"?`)) {
        adminState.config.canchas.splice(idx, 1);
        renderCanchasTab();
      }
    });
  });
}

function addNewCancha() {
  const num = (adminState.config?.canchas?.length || 0) + 1;
  const isPadel = num % 2 !== 0;
  const nueva = {
    id: `c_${Date.now()}`,
    deporte: isPadel ? 'padel' : 'futbol',
    nombre: isPadel ? `Pista ${num} - Cristal Pro` : `Cancha ${num} - Sintético`,
    ubicacion: 'interior',
    superficie: isPadel ? 'Césped Sintético Azul WPT' : 'Sintético 50mm',
    jugadores: isPadel ? 4 : 5,
    precio: isPadel ? 24000 : 28000
  };
  if (!adminState.config.canchas) adminState.config.canchas = [];
  adminState.config.canchas.push(nueva);
  renderCanchasTab();
}

async function saveCanchasConfig() {
  const btn = document.getElementById('btn-save-canchas');
  btn.disabled = true;
  btn.textContent = 'Guardando Canchas... ⏳';

  try {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminState.config)
    });
    const data = await res.json();
    if (data.success) {
      adminState.config = data.config;
      saveToFirestore('config', adminState.config);
      btn.textContent = '✓ ¡Canchas Guardadas!';
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save" class="w-4 h-4 text-black"></i><span>Guardar Cambios de Canchas</span>';
        if (window.lucide) window.lucide.createIcons();
      }, 2000);
    } else {
      alert(data.message || 'Error al guardar canchas.');
      btn.disabled = false;
    }
  } catch (e) {
    alert('Error al conectar con el servidor.');
    btn.disabled = false;
  }
}

// ================= TAB 3: GESTIÓN DE EVENTOS & TORNEOS =================

function renderEventosTab() {
  const container = document.getElementById('admin-eventos-container');
  if (!container) return;
  container.innerHTML = '';

  const eventos = adminState.eventos || [];

  if (eventos.length === 0) {
    container.innerHTML = '<p class="text-slate-400 col-span-full text-center">No hay eventos ni torneos creados. Hacé clic en "Crear Nuevo Evento".</p>';
    return;
  }

  eventos.forEach(ev => {
    const card = document.createElement('div');
    card.className = 'glass-card p-6 border border-slate-800 space-y-4';

    card.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div>
          <span class="text-xs font-bold text-[#00E676] uppercase">${escapeHtml(ev.fecha)}</span>
          <h4 class="font-sports text-xl font-bold text-white mt-0.5">${escapeHtml(ev.titulo)}</h4>
          <span class="text-xs text-slate-400">${escapeHtml(ev.categoria || '')} · ${escapeHtml(ev.horario || '')}</span>
        </div>
        <span class="px-2.5 py-1 rounded-full text-xs font-bold ${ev.estado === 'Inscripciones Abiertas' ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'}">
          ${escapeHtml(ev.estado)}
        </span>
      </div>

      <p class="text-slate-300 text-xs leading-relaxed">${escapeHtml(ev.descripcion)}</p>

      ${ev.premio ? `
      <div class="p-2.5 rounded-lg bg-[#0B0F19] text-xs font-bold text-amber-300 border border-amber-500/30 flex items-center gap-2">
        <span>🏆 Premio: ${escapeHtml(ev.premio)}</span>
      </div>` : ''}

      <div class="pt-4 border-t border-slate-800 flex items-center justify-between">
        <select class="select-estado-evento px-3 py-1.5 rounded-lg bg-[#1E293B] border border-slate-700 text-white text-xs" data-id="${ev.id}">
          <option value="Inscripciones Abiertas" ${ev.estado === 'Inscripciones Abiertas' ? 'selected' : ''}>Inscripciones Abiertas</option>
          <option value="Últimos Cupos" ${ev.estado === 'Últimos Cupos' ? 'selected' : ''}>Últimos Cupos</option>
          <option value="Cupos Agotados" ${ev.estado === 'Cupos Agotados' ? 'selected' : ''}>Cupos Agotados</option>
          <option value="Finalizado" ${ev.estado === 'Finalizado' ? 'selected' : ''}>Finalizado</option>
          <option value="Consultar Disponibilidad / Reservas Abiertas" ${ev.estado === 'Consultar Disponibilidad / Reservas Abiertas' ? 'selected' : ''}>Consultar Disponibilidad / Reservas Abiertas</option>
        </select>

        <div class="flex items-center gap-2">
          <button class="btn-edit-evento p-2 rounded-lg bg-[#00E5FF]/10 hover:bg-[#00E5FF] text-[#00E5FF] hover:text-black transition-all border border-[#00E5FF]/30" data-id="${ev.id}" title="Editar evento">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button class="btn-del-evento p-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all border border-red-500/20" data-id="${ev.id}" title="Eliminar evento">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // Edit Event Button Handlers
  container.querySelectorAll('.btn-edit-evento').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      openEditEventoModal(id);
    });
  });

  container.querySelectorAll('.select-estado-evento').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const id = sel.dataset.id;
      const nuevoEstado = e.target.value;
      try {
        await fetch(`/api/eventos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: nuevoEstado })
        });
        const ev = adminState.eventos.find(x => x.id === id);
        if (ev) ev.estado = nuevoEstado;
        renderEventosTab();
      } catch (err) {}
    });
  });

  container.querySelectorAll('.btn-del-evento').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const ev = adminState.eventos.find(x => x.id === id);
      if (!ev) return;

      if (confirm(`¿Eliminar el evento "${ev.titulo}"?`)) {
        try {
          // Eliminación DIRECTA en Cloud Firestore sin depender de servidor local
          if (firebaseFirestore) {
            await firebaseFirestore.collection('eventos').doc(id).delete();
            console.log(`✓ Evento ${id} eliminado directamente en Firestore`);
          }
          adminState.eventos = adminState.eventos.filter(x => x.id !== id);
          saveToFirestore('eventos', { list: adminState.eventos });
          renderEventosTab();
        } catch (err) {
          console.error('Error al eliminar evento en Firestore:', err);
          adminState.eventos = adminState.eventos.filter(x => x.id !== id);
          renderEventosTab();
        }
      }
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

function openEditEventoModal(id) {
  const ev = (adminState.eventos || []).find(e => e.id === id);
  const modal = document.getElementById('modal-edit-evento');
  if (!modal) return;

  if (ev) {
    document.getElementById('edit-evento-id').value = ev.id;
    document.getElementById('edit-evento-titulo').value = ev.titulo || '';
    document.getElementById('edit-evento-categoria').value = ev.categoria || '';
    document.getElementById('edit-evento-estado').value = ev.estado || 'Inscripciones Abiertas';
    document.getElementById('edit-evento-fecha').value = ev.fecha || '';
    document.getElementById('edit-evento-horario').value = ev.horario || '';
    document.getElementById('edit-evento-premio').value = ev.premio || '';
    document.getElementById('edit-evento-descripcion').value = ev.descripcion || '';
    document.getElementById('edit-evento-imagen').value = ev.imagen || '';
    document.getElementById('edit-evento-whatsapp').value = ev.whatsappContacto || '';
  } else {
    // New Event mode
    document.getElementById('edit-evento-id').value = '';
    document.getElementById('edit-evento-titulo').value = '';
    document.getElementById('edit-evento-categoria').value = '4ta a 7ma';
    document.getElementById('edit-evento-estado').value = 'Inscripciones Abiertas';
    document.getElementById('edit-evento-fecha').value = 'Fin de semana';
    document.getElementById('edit-evento-horario').value = 'Desde las 18:00 hs';
    document.getElementById('edit-evento-premio').value = '$ 200.000 en Premios + Trofeos';
    document.getElementById('edit-evento-descripcion').value = 'Torneo con fase de grupos y eliminación directa.';
    document.getElementById('edit-evento-imagen').value = 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80';
    document.getElementById('edit-evento-whatsapp').value = adminState.config?.whatsapp || '';
  }

  modal.classList.remove('hidden');
}

function closeEditEventoModal() {
  const modal = document.getElementById('modal-edit-evento');
  if (modal) modal.classList.add('hidden');
}

function createNewEvento() {
  openEditEventoModal(null);
}

// ================= TAB 4: GESTIÓN DE SERVICIOS =================

function renderServiciosTab() {
  const container = document.getElementById('admin-servicios-container');
  if (!container) return;
  container.innerHTML = '';

  const servicios = adminState.servicios || [];

  servicios.forEach(srv => {
    const card = document.createElement('div');
    card.className = 'glass-card overflow-hidden flex flex-col justify-between border border-slate-800 group transition-all hover:border-[#00E676]/40';

    const defaultImg = 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80';
    const imgUrl = srv.imagen || defaultImg;
    const catBadge = srv.categoria || 'SERVICIO';

    card.innerHTML = `
      <div>
        <div class="relative h-40 w-full overflow-hidden">
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(srv.titulo)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
          <div class="absolute inset-0 bg-gradient-to-t from-[#161F30] via-transparent to-transparent"></div>
          <div class="absolute top-3 left-3">
            <span class="badge-neon font-bold text-[10px] backdrop-blur-md uppercase">${escapeHtml(catBadge)}</span>
          </div>
          <div class="absolute top-3 right-3 flex items-center gap-1 bg-[#161F30]/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-xs text-[#00E676] font-mono">
            <span>Icono: ${escapeHtml(srv.icono)}</span>
          </div>
        </div>

        <div class="p-6 space-y-3">
          <div class="flex items-start justify-between gap-4">
            <h4 class="font-sports text-xl font-bold text-white uppercase">${escapeHtml(srv.titulo)}</h4>
            <div class="flex items-center gap-2 shrink-0">
              <button class="btn-edit-servicio p-2 rounded-lg bg-[#00E5FF]/10 hover:bg-[#00E5FF] text-[#00E5FF] hover:text-black transition-all border border-[#00E5FF]/30" data-id="${srv.id}" title="Editar servicio">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button class="btn-del-servicio p-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all border border-red-500/20" data-id="${srv.id}" title="Eliminar servicio">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
          <p class="text-slate-300 text-xs leading-relaxed">${escapeHtml(srv.descripcion)}</p>
        </div>
      </div>

      <div class="p-6 pt-0">
        <div class="flex flex-wrap gap-1.5 pt-3 border-t border-slate-800">
          ${(srv.tags || []).map(t => `<span class="text-[10px] bg-[#1E293B] text-slate-300 px-2 py-0.5 rounded border border-slate-700/60">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // Edit Service Button Handlers
  container.querySelectorAll('.btn-edit-servicio').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      openEditServicioModal(id);
    });
  });

  container.querySelectorAll('.btn-del-servicio').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const srv = adminState.servicios.find(x => x.id === id);
      if (!srv) return;

      if (confirm(`¿Eliminar el servicio "${srv.titulo || srv.nombre}"?`)) {
        try {
          // Eliminación DIRECTA en Cloud Firestore sin pasar por endpoints de Render
          if (firebaseFirestore) {
            await firebaseFirestore.collection('servicios').doc(id).delete();
            console.log(`✓ Documento ${id} eliminado directamente en Firestore`);
          }

          // Actualizar estado local inmediatamente
          adminState.servicios = adminState.servicios.filter(x => x.id !== id);
          saveToFirestore('servicios', { list: adminState.servicios });
          renderServiciosTab();
        } catch (e) {
          console.error('Error al eliminar servicio en Firestore:', e);
          adminState.servicios = adminState.servicios.filter(x => x.id !== id);
          renderServiciosTab();
        }
      }
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

function updateServicioImagePreview(url) {
  const img = document.getElementById('edit-servicio-imagen-preview');
  const placeholder = document.getElementById('edit-servicio-imagen-placeholder');
  if (!img || !placeholder) return;

  if (url && url.trim()) {
    img.src = url.trim();
    img.classList.remove('hidden');
    placeholder.classList.add('hidden');
    img.onerror = () => {
      img.classList.add('hidden');
      placeholder.classList.remove('hidden');
    };
  } else {
    img.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }
}

function openEditServicioModal(id) {
  const srv = (adminState.servicios || []).find(s => s.id === id);
  const modal = document.getElementById('modal-edit-servicio');
  if (!modal) return;

  if (srv) {
    document.getElementById('edit-servicio-id').value = srv.id;
    document.getElementById('edit-servicio-titulo').value = srv.titulo || '';
    document.getElementById('edit-servicio-icono').value = srv.icono || 'Sparkles';
    document.getElementById('edit-servicio-categoria').value = srv.categoria || 'COMODIDADES';
    document.getElementById('edit-servicio-imagen').value = srv.imagen || '';
    document.getElementById('edit-servicio-descripcion').value = srv.descripcion || '';
    document.getElementById('edit-servicio-tags').value = (srv.tags || []).join(', ');
    updateServicioImagePreview(srv.imagen || '');
  } else {
    // New Service mode
    document.getElementById('edit-servicio-id').value = '';
    document.getElementById('edit-servicio-titulo').value = '';
    document.getElementById('edit-servicio-icono').value = 'Sparkles';
    document.getElementById('edit-servicio-categoria').value = 'COMODIDADES';
    document.getElementById('edit-servicio-imagen').value = 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80';
    document.getElementById('edit-servicio-descripcion').value = '';
    document.getElementById('edit-servicio-tags').value = '';
    updateServicioImagePreview('https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80');
  }

  modal.classList.remove('hidden');
}

function closeEditServicioModal() {
  const modal = document.getElementById('modal-edit-servicio');
  if (modal) modal.classList.add('hidden');
}

function createNewServicio() {
  openEditServicioModal(null);
}

// ================= TAB 5: CONFIGURACIÓN & TEXTOS =================

function syncConfigTabInputs() {
  const cfg = adminState.config;
  if (!cfg) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('cfg-admin-email', cfg.adminEmail || 'admin@complejopadel3.com');
  setVal('cfg-nombre', cfg.nombre);
  setVal('cfg-subtitulo', cfg.subtitulo);
  setVal('cfg-direccion', cfg.direccion);
  setVal('cfg-maps', cfg.maps);
  setVal('cfg-whatsapp', cfg.whatsapp);
  setVal('cfg-hora-inicio', cfg.horaInicio || '14:00');
  setVal('cfg-hora-fin', cfg.horaFin || '24:00');

  document.querySelectorAll('#cfg-dias-container input').forEach(chk => {
    chk.checked = (cfg.diasActivos || []).includes(parseInt(chk.value));
  });
}

function renderConfigTab() {
  syncConfigTabInputs();
}

async function saveGeneralConfig() {
  const adminEmail = document.getElementById('cfg-admin-email').value.trim() || 'admin@complejopadel3.com';
  const adminPassword = document.getElementById('cfg-admin-password').value.trim();
  const nombre = document.getElementById('cfg-nombre').value.trim() || 'COMPLEJO PADEL 3';
  const subtitulo = document.getElementById('cfg-subtitulo').value.trim();
  const direccion = document.getElementById('cfg-direccion').value.trim();
  const maps = document.getElementById('cfg-maps').value.trim();
  const whatsapp = document.getElementById('cfg-whatsapp').value.trim();
  const horaInicio = document.getElementById('cfg-hora-inicio').value || '14:00';
  const horaFin = document.getElementById('cfg-hora-fin').value || '24:00';
  const diasActivos = Array.from(document.querySelectorAll('#cfg-dias-container input:checked')).map(c => parseInt(c.value));

  const payload = {
    adminEmail,
    nombre,
    subtitulo,
    direccion,
    maps,
    whatsapp,
    horaInicio,
    horaFin,
    diasActivos,
    canchas: adminState.config.canchas
  };

  if (adminPassword && adminPassword.length >= 6) {
    payload.adminPassword = adminPassword;
  }

  const saveBtn = document.getElementById('btn-save-general-config');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando en Servidor... ⏳';

  try {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      adminState.config = data.config;
      saveToFirestore('config', adminState.config);
      saveBtn.textContent = '✓ ¡Configuración Guardada!';
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i data-lucide="save" class="w-4 h-4 text-black"></i><span>Guardar Configuración General</span>';
        if (window.lucide) window.lucide.createIcons();
      }, 2000);
    } else {
      alert(data.message || 'Error al guardar configuración.');
      saveBtn.disabled = false;
    }
  } catch (e) {
    alert('Error al conectar con el servidor.');
    saveBtn.disabled = false;
  }
}

// Mobile Menu Handler for Admin
function setupMobileMenu() {
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const iconOpen = document.getElementById('menu-icon-open');
  const iconClose = document.getElementById('menu-icon-close');

  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = mobileMenu.classList.contains('hidden');
      mobileMenu.classList.toggle('hidden');
      mobileMenu.classList.toggle('flex');
      if (iconOpen && iconClose) {
        if (willOpen) {
          iconOpen.classList.add('hidden');
          iconClose.classList.remove('hidden');
        } else {
          iconOpen.classList.remove('hidden');
          iconClose.classList.add('hidden');
        }
      }
    });

    // Wire up admin mobile tab buttons to switch tabs
    mobileMenu.querySelectorAll('.admin-mobile-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.adminTab;
        const desktopTabBtn = document.querySelector(`.admin-tab-btn[data-admin-tab="${targetTab}"]`);
        if (desktopTabBtn) {
          desktopTabBtn.click();
        }
      });
    });

    // Cerrar automáticamente al hacer clic en cualquier enlace del menú
    mobileMenu.querySelectorAll('a, button').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('flex');
        if (iconOpen && iconClose) {
          iconOpen.classList.remove('hidden');
          iconClose.classList.add('hidden');
        }
      });
    });

    // Cerrar si se toca fuera del menú
    document.addEventListener('click', (e) => {
      if (!mobileMenu.contains(e.target) && !mobileBtn.contains(e.target)) {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('flex');
        if (iconOpen && iconClose) {
          iconOpen.classList.remove('hidden');
          iconClose.classList.add('hidden');
        }
      }
    });
  }
}

// ================= INITIALIZATION =================

async function initAdmin() {
  await fetchConfig();
  initFirebaseClient();
  await syncFromFirestore();

  setupTabNavigation();
  setupMobileMenu();

  // Auth listeners
  document.getElementById('form-admin-login')?.addEventListener('submit', loginAdmin);
  document.getElementById('btn-forgot-password')?.addEventListener('click', recuperarPasswordFirebase);
  document.getElementById('btn-admin-logout')?.addEventListener('click', logoutAdmin);

  // Agenda Filter listeners
  document.getElementById('admin-search-query')?.addEventListener('input', (e) => {
    adminState.filters.search = e.target.value.trim();
    renderAgendaListItems();
  });

  document.getElementById('filter-agenda-cancha')?.addEventListener('change', (e) => {
    adminState.filters.cancha = e.target.value;
    renderAgendaListItems();
  });

  document.getElementById('filter-agenda-fecha-preset')?.addEventListener('change', (e) => {
    adminState.filters.fechaPreset = e.target.value;
    renderAgendaListItems();
  });

  document.getElementById('filter-agenda-deporte')?.addEventListener('change', (e) => {
    adminState.filters.deporte = e.target.value;
    renderAgendaListItems();
  });

  document.getElementById('filter-agenda-estado')?.addEventListener('change', (e) => {
    adminState.filters.estado = e.target.value;
    renderAgendaListItems();
  });

  // View Switcher: "Lista de Turnos" vs "Vista Siluetas Tácticas"
  const btnLista = document.getElementById('btn-vista-lista') || document.querySelector('[data-view="lista"]') || document.getElementById('btn-subview-lista');
  const btnSiluetas = document.getElementById('btn-vista-siluetas') || document.querySelector('[data-view="siluetas"]') || document.getElementById('btn-subview-tactica');
  const containerLista = document.getElementById('vista-lista-container') || document.getElementById('seccion-lista-turnos') || document.getElementById('admin-agenda-list-view');
  const containerSiluetas = document.getElementById('vista-siluetas-container') || document.getElementById('seccion-siluetas-tacticas') || document.getElementById('admin-tactical-view');

  btnSiluetas?.addEventListener('click', () => {
    try {
      console.log('Cambiando a vista siluetas...');
      adminState.agendaSubView = 'tactica';
      if (btnSiluetas) btnSiluetas.className = "px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold flex items-center gap-2 shadow-lg";
      if (btnLista) btnLista.className = "px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-medium flex items-center gap-2 hover:bg-slate-850";

      if (containerLista) containerLista.classList.add('hidden');
      if (containerSiluetas) containerSiluetas.classList.remove('hidden');

      // Obtener el día activo actual del selector (ej: '2026-08-30' o el data-date del botón marcado)
      const diaActivo = document.querySelector('.btn-dia-silueta.activo')?.dataset.date || adminState.selectedTacticalFecha || 'hoy';
      renderSiluetasPorDia(diaActivo);
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error('Error al cambiar a vista siluetas:', err);
    }
  });

  btnLista?.addEventListener('click', () => {
    try {
      console.log('Cambiando a vista lista...');
      adminState.agendaSubView = 'lista';
      if (btnLista) btnLista.className = "px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold flex items-center gap-2 shadow-lg";
      if (btnSiluetas) btnSiluetas.className = "px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-medium flex items-center gap-2 hover:bg-slate-850";

      if (containerSiluetas) containerSiluetas.classList.add('hidden');
      if (containerLista) containerLista.classList.remove('hidden');

      // Volver a renderizar la lista completa sin perder los datos
      renderTurnosList();
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error('Error al cambiar a vista lista:', err);
    }
  });

  // Global Event Delegation for Turnos & Reservas actions (Confirmar y Liberar)
  document.addEventListener('click', async (e) => {
    // 1. Botón Confirmar
    const btnConfirmar = e.target.closest('.btn-confirmar, .btn-confirm-turno');
    if (btnConfirmar) {
      const id = btnConfirmar.getAttribute('data-id');
      if (!id) return console.error('No se encontró el ID de la reserva');

      btnConfirmar.disabled = true;
      btnConfirmar.textContent = 'Actualizando...';

      try {
        const t = adminState.turnos.find(x => x.id === id);
        if (t) {
          t.confirmado = true;
          t.estado = 'confirmado';
        }

        if (firebaseFirestore) {
          const updateData = {
            estado: 'confirmado',
            confirmado: true,
            updatedAt: new Date().toISOString()
          };
          try {
            await firebaseFirestore.collection('reservas').doc(id).update(updateData);
          } catch (e) {
            await firebaseFirestore.collection('reservas').doc(id).set(updateData, { merge: true });
          }
          try {
            await firebaseFirestore.collection('turnos').doc(id).update(updateData);
          } catch (e) {
            await firebaseFirestore.collection('turnos').doc(id).set(updateData, { merge: true });
          }
          console.log(`✓ Reserva ${id} confirmada en Firestore`);
        }

        fetch(`/api/turnos/${id}/confirmar`, { method: 'PATCH' }).catch(() => null);

        // Actualizar UI localmente de inmediato:
        const card = btnConfirmar.closest('.reserva-card, .glass-card') || btnConfirmar.parentElement;
        const badgePendiente = card?.querySelector('.estado-badge') || document.getElementById(`badge-status-${id}`);
        if (badgePendiente) {
          badgePendiente.className = "estado-badge flex items-center gap-1 font-bold text-[#00E676] bg-[#00E676]/10 px-2.5 py-0.5 rounded-lg border border-[#00E676]/30 text-xs";
          badgePendiente.innerHTML = "<span>✓ Confirmado</span>";
        }
        btnConfirmar.remove(); // Remueve el botón Confirmar dejando solo Liberar Cancha
        const btnConsultar = card?.querySelector('.btn-consultar-asistencia');
        if (btnConsultar) btnConsultar.remove();
        fetchMetrics().then(() => renderMetricsKpis());
      } catch (err) {
        console.error('Error al confirmar reserva en Firestore:', err);
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = '<i data-lucide="check" class="w-4 h-4 stroke-[3] text-black"></i><span>✓ CONFIRMAR</span>';
        if (window.lucide) window.lucide.createIcons();
      }
      return;
    }

    // 2. Botón Liberar Cancha
    const btnLiberar = e.target.closest('.btn-liberar-cancha');
    if (btnLiberar) {
      const id = btnLiberar.getAttribute('data-id');
      if (!id) return;
      const t = adminState.turnos.find(x => x.id === id);

      if (confirm('¿Deseas liberar este turno?')) {
        try {
          const container = document.getElementById('admin-agenda-list-container') || document.getElementById('turnos-list-container');
          const emptyEl = document.getElementById('admin-agenda-empty');
          const card = container ? container.querySelector(`[data-turno-card="${id}"]`) : btnLiberar.closest('.reserva-card, .glass-card');
          if (card) {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
              card.remove();
              if (container && container.querySelectorAll('[data-turno-card]').length === 0 && emptyEl) {
                emptyEl.classList.remove('hidden');
              }
            }, 300);
          }

          adminState.turnos = adminState.turnos.filter(x => x.id !== id);

          if (firebaseFirestore) {
            await firebaseFirestore.collection('reservas').doc(id).delete().catch(() => null);
            await firebaseFirestore.collection('turnos').doc(id).delete().catch(() => null);
            console.log(`✓ Turno ${id} eliminado de Firestore`);
          }

          fetch(`/api/turnos/${id}`, { method: 'DELETE' }).catch(() => null);
          saveToFirestore('turnos', { list: adminState.turnos });
          fetchMetrics().then(() => renderMetricsKpis());
        } catch (err) {
          console.warn('Error al liberar cancha en Firestore:', err);
        }
      }
    }
  });

  // Export listeners
  document.getElementById('btn-export-csv')?.addEventListener('click', exportAgendaToCSV);
  document.getElementById('btn-print-agenda')?.addEventListener('click', () => window.print());

  // Court actions
  document.getElementById('btn-add-cancha')?.addEventListener('click', addNewCancha);
  document.getElementById('btn-save-canchas')?.addEventListener('click', saveCanchasConfig);

  // Event actions
  document.getElementById('btn-add-evento')?.addEventListener('click', createNewEvento);

  // Service actions
  document.getElementById('btn-add-servicio')?.addEventListener('click', createNewServicio);

  // Config actions
  document.getElementById('btn-save-general-config')?.addEventListener('click', saveGeneralConfig);

  // Story Generator Quick Button (Agenda toolbar)
  document.getElementById('btn-open-story-generator')?.addEventListener('click', () => {
    const historiasTabBtn = document.querySelector('[data-admin-tab="historias"]');
    if (historiasTabBtn) {
      historiasTabBtn.click();
    }
  });

  // Event Edit Modal Listeners
  document.getElementById('btn-close-edit-evento')?.addEventListener('click', closeEditEventoModal);
  document.getElementById('btn-cancel-edit-evento')?.addEventListener('click', closeEditEventoModal);
  document.getElementById('modal-edit-evento')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-edit-evento') closeEditEventoModal();
  });

  document.getElementById('form-edit-evento')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-evento-id').value.trim();
    const titulo = document.getElementById('edit-evento-titulo').value.trim();
    const categoria = document.getElementById('edit-evento-categoria').value.trim();
    const estado = document.getElementById('edit-evento-estado').value;
    const fecha = document.getElementById('edit-evento-fecha').value.trim();
    const horario = document.getElementById('edit-evento-horario').value.trim();
    const premio = document.getElementById('edit-evento-premio').value.trim();
    const descripcion = document.getElementById('edit-evento-descripcion').value.trim();
    const imagen = document.getElementById('edit-evento-imagen').value.trim();
    const whatsappContacto = document.getElementById('edit-evento-whatsapp').value.trim();

    const eventId = id || (firebaseFirestore ? firebaseFirestore.collection('eventos').doc().id : `ev_${Date.now()}`);

    const payload = {
      id: eventId,
      titulo,
      categoria,
      estado,
      fecha,
      horario,
      premio,
      descripcion,
      imagen,
      whatsappContacto,
      activo: true,
      updatedAt: new Date()
    };

    try {
      // Guardado DIRECTO en Cloud Firestore con { merge: true }
      if (firebaseFirestore) {
        await firebaseFirestore.collection('eventos').doc(eventId).set(payload, { merge: true });
        console.log(`✓ Evento guardado directamente en Firestore con { merge: true }:`, eventId);
      }

      const idx = adminState.eventos.findIndex(x => x.id === eventId);
      if (idx !== -1) {
        adminState.eventos[idx] = { ...adminState.eventos[idx], ...payload };
      } else {
        adminState.eventos.unshift(payload);
      }

      saveToFirestore('eventos', { list: adminState.eventos });
      closeEditEventoModal();
      renderEventosTab();
      alert(id ? '✓ Evento actualizado exitosamente en Firestore.' : '✓ Evento creado exitosamente en Firestore.');
    } catch (err) {
      console.error('Error al guardar evento en Firestore:', err);
      alert('Error al guardar evento en Firestore: ' + (err.message || ''));
    }
  });

  // Service Edit Modal Listeners
  document.getElementById('btn-close-edit-servicio')?.addEventListener('click', closeEditServicioModal);
  document.getElementById('btn-cancel-edit-servicio')?.addEventListener('click', closeEditServicioModal);
  document.getElementById('modal-edit-servicio')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-edit-servicio') closeEditServicioModal();
  });

  document.getElementById('edit-servicio-imagen')?.addEventListener('input', (e) => {
    updateServicioImagePreview(e.target.value);
  });
  document.getElementById('edit-servicio-imagen')?.addEventListener('change', (e) => {
    updateServicioImagePreview(e.target.value);
  });

  document.getElementById('form-edit-servicio')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-servicio-id').value.trim();
    const titulo = document.getElementById('edit-servicio-titulo').value.trim();
    const icono = document.getElementById('edit-servicio-icono').value;
    const categoria = document.getElementById('edit-servicio-categoria').value.trim() || 'COMODIDADES';
    const imagen = document.getElementById('edit-servicio-imagen').value.trim();
    const descripcion = document.getElementById('edit-servicio-descripcion').value.trim();
    const tagsStr = document.getElementById('edit-servicio-tags').value.trim();
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Generar ID único si es nuevo servicio
    const serviceId = id || (firebaseFirestore ? firebaseFirestore.collection('servicios').doc().id : `srv_${Date.now()}`);

    const payload = {
      id: serviceId,
      titulo,
      nombre: titulo,
      icono: icono || 'Sparkles',
      categoria,
      imagen: imagen || 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
      descripcion,
      tags,
      badges: tags,
      activo: true,
      updatedAt: new Date()
    };

    try {
      // Guardado DIRECTO en Cloud Firestore con { merge: true } (sin endpoints locales efímeros)
      if (firebaseFirestore) {
        await firebaseFirestore.collection('servicios').doc(serviceId).set(payload, { merge: true });
        console.log(`✓ Servicio guardado directamente en Firestore con { merge: true }:`, serviceId);
      }

      // Actualizar estado en memoria de la app
      const idx = adminState.servicios.findIndex(x => x.id === serviceId);
      if (idx !== -1) {
        adminState.servicios[idx] = { ...adminState.servicios[idx], ...payload };
      } else {
        adminState.servicios.push(payload);
      }

      saveToFirestore('servicios', { list: adminState.servicios });
      closeEditServicioModal();
      renderServiciosTab();
      alert(id ? '✓ Servicio actualizado exitosamente en Firestore.' : '✓ Servicio creado exitosamente en Firestore.');
    } catch (err) {
      console.error('Error al guardar servicio en Firestore:', err);
      alert('Error al guardar servicio en Firestore: ' + (err.message || ''));
    }
  });

  // Story Generator Mode Buttons
  const btnModeGeneral = document.getElementById('btn-story-mode-general');
  const btnModeCancha = document.getElementById('btn-story-mode-cancha');
  const boxCanchaSelect = document.getElementById('story-cancha-selector-box');

  btnModeGeneral?.addEventListener('click', () => {
    storyState.mode = 'general';
    btnModeGeneral.className = 'story-mode-btn active px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center gap-1 bg-[#00E676] text-black border-[#00E676]';
    btnModeCancha.className = 'story-mode-btn px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-700 bg-[#161F30] text-slate-300 hover:text-white transition-all text-center flex flex-col items-center gap-1';
    boxCanchaSelect?.classList.add('hidden');
    syncStorySummary();
    renderStoryCanvas();
  });

  btnModeCancha?.addEventListener('click', () => {
    storyState.mode = 'cancha';
    btnModeCancha.className = 'story-mode-btn active px-3 py-2.5 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center gap-1 bg-[#00E676] text-black border-[#00E676]';
    btnModeGeneral.className = 'story-mode-btn px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-700 bg-[#161F30] text-slate-300 hover:text-white transition-all text-center flex flex-col items-center gap-1';
    boxCanchaSelect?.classList.remove('hidden');
    syncStorySummary();
    renderStoryCanvas();
  });

  // Story Sport Filters (Todos, Pádel, Fútbol)
  const btnSportTodos = document.getElementById('btn-story-sport-todos');
  const btnSportPadel = document.getElementById('btn-story-sport-padel');
  const btnSportFutbol = document.getElementById('btn-story-sport-futbol');

  const updateStorySportButtonsActive = (activeBtn) => {
    [btnSportTodos, btnSportPadel, btnSportFutbol].forEach(b => {
      if (b) b.className = 'btn-story-sport py-2 rounded-xl bg-[#1E293B] hover:bg-[#2A3B53] text-slate-300 border border-slate-700 text-xs font-semibold transition-all text-center';
    });
    if (activeBtn) {
      activeBtn.className = 'btn-story-sport active py-2 rounded-xl bg-[#00E676] text-black font-bold text-xs transition-all text-center';
    }
  };

  btnSportTodos?.addEventListener('click', () => {
    storyState.deporte = 'todos';
    updateStorySportButtonsActive(btnSportTodos);
    syncStorySummary();
    renderStoryCanvas();
  });

  btnSportPadel?.addEventListener('click', () => {
    storyState.deporte = 'padel';
    updateStorySportButtonsActive(btnSportPadel);
    syncStorySummary();
    renderStoryCanvas();
  });

  btnSportFutbol?.addEventListener('click', () => {
    storyState.deporte = 'futbol';
    updateStorySportButtonsActive(btnSportFutbol);
    syncStorySummary();
    renderStoryCanvas();
  });

  // Story Date Quick Buttons
  const btnDateToday = document.getElementById('btn-story-date-today');
  const btnDateTomorrow = document.getElementById('btn-story-date-tomorrow');
  const btnDateAfter = document.getElementById('btn-story-date-after');
  const inputStoryDate = document.getElementById('story-fecha-select');

  function updateStoryDateButtonsActive(activeBtn) {
    [btnDateToday, btnDateTomorrow, btnDateAfter].forEach(b => {
      if (b) b.className = 'px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#2A3B53] text-slate-300 border border-slate-700 text-xs font-bold transition-all';
    });
    if (activeBtn) {
      activeBtn.className = 'px-3 py-1.5 rounded-lg bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 text-xs font-bold transition-all';
    }
  }

  btnDateToday?.addEventListener('click', () => {
    storyState.fecha = hoyISO();
    if (inputStoryDate) inputStoryDate.value = storyState.fecha;
    updateStoryDateButtonsActive(btnDateToday);
    syncStorySummary();
    renderStoryCanvas();
  });

  btnDateTomorrow?.addEventListener('click', () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    storyState.fecha = formatDateISO(d);
    if (inputStoryDate) inputStoryDate.value = storyState.fecha;
    updateStoryDateButtonsActive(btnDateTomorrow);
    syncStorySummary();
    renderStoryCanvas();
  });

  btnDateAfter?.addEventListener('click', () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    storyState.fecha = formatDateISO(d);
    if (inputStoryDate) inputStoryDate.value = storyState.fecha;
    updateStoryDateButtonsActive(btnDateAfter);
    syncStorySummary();
    renderStoryCanvas();
  });

  inputStoryDate?.addEventListener('change', (e) => {
    storyState.fecha = e.target.value;
    updateStoryDateButtonsActive(null);
    syncStorySummary();
    renderStoryCanvas();
  });

  // Story Court Select Listener
  document.getElementById('story-cancha-select')?.addEventListener('change', (e) => {
    storyState.canchaId = e.target.value;
    syncStorySummary();
    renderStoryCanvas();
  });

  // Action Buttons - Generate Canvas in Real Time
  document.getElementById('btn-generate-story-canvas')?.addEventListener('click', () => {
    syncStorySummary();
    renderStoryCanvas();
  });

  document.getElementById('btn-download-story-png')?.addEventListener('click', downloadStoryPNG);
  document.getElementById('btn-download-story-png-quick')?.addEventListener('click', downloadStoryPNG);
  document.getElementById('btn-copy-story-clipboard')?.addEventListener('click', copyStoryToClipboard);
  document.getElementById('canvas-story')?.addEventListener('click', downloadStoryPNG);
}

// =========================================================
// TAB 6: GENERADOR DE HISTORIAS INSTAGRAM (1080 x 1920 PX)
// =========================================================

let storyState = {
  mode: 'general', // 'general' | 'cancha'
  deporte: 'todos', // 'todos' | 'padel' | 'futbol'
  fecha: hoyISO(),
  canchaId: null,
  logoImage: null
};

// Helper: Rounded Rectangle for Canvas
function drawRoundedRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function preloadStoryLogo() {
  if (storyState.logoImage && storyState.logoImage.complete && storyState.logoImage.naturalWidth > 0) {
    return Promise.resolve(storyState.logoImage);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'assets/logo.png';
    img.onload = () => {
      storyState.logoImage = img;
      resolve(img);
    };
    img.onerror = () => {
      resolve(null);
    };
  });
}

function getTurnosLibresParaCancha(canchaId, fecha) {
  const slots = generarHorarios();
  const ocupados = new Set();

  (adminState.turnos || []).forEach(t => {
    if (t.canchaId === canchaId && t.fecha === fecha) {
      const dur = Number(t.duracion) || 1;
      const [hStr, mStr] = t.hora.split(':').map(Number);
      for (let i = 0; i < dur; i++) {
        const hh = (hStr + i) % 24;
        ocupados.add(`${pad2(hh)}:${pad2(mStr || 0)}`);
      }
    }
  });

  return slots.filter(h => !ocupados.has(h));
}

function renderHistoriasTab() {
  const selectCancha = document.getElementById('story-cancha-select');
  if (selectCancha) {
    let canchas = adminState.config?.canchas || [];
    if (storyState.deporte === 'padel') {
      canchas = canchas.filter(c => c.deporte === 'padel');
    } else if (storyState.deporte === 'futbol') {
      canchas = canchas.filter(c => c.deporte === 'futbol');
    }

    let html = '';
    canchas.forEach(c => {
      const emoji = c.deporte === 'padel' ? '🎾' : '⚽';
      html += `<option value="${c.id}" ${c.id === storyState.canchaId ? 'selected' : ''}>${emoji} ${escapeHtml(c.nombre)} (${c.ubicacion})</option>`;
    });
    selectCancha.innerHTML = html;
    if (!storyState.canchaId && canchas.length > 0) {
      storyState.canchaId = canchas[0].id;
    }
  }

  const fechaInput = document.getElementById('story-fecha-select');
  if (fechaInput) {
    fechaInput.value = storyState.fecha;
  }

  syncStorySummary();
  renderStoryCanvas();
}

function syncStorySummary() {
  const summaryText = document.getElementById('story-summary-text');
  const summaryDetails = document.getElementById('story-summary-details');
  if (!summaryText || !summaryDetails) return;

  let canchas = adminState.config?.canchas || [];
  if (storyState.deporte === 'padel') {
    canchas = canchas.filter(c => c.deporte === 'padel');
  } else if (storyState.deporte === 'futbol') {
    canchas = canchas.filter(c => c.deporte === 'futbol');
  }

  let totalLibres = 0;
  const details = [];

  if (storyState.mode === 'general') {
    canchas.forEach(c => {
      const libres = getTurnosLibresParaCancha(c.id, storyState.fecha);
      totalLibres += libres.length;
      details.push(`• ${c.nombre}: ${libres.length} libres`);
    });
    const depLabel = storyState.deporte === 'padel' ? 'Pádel' : (storyState.deporte === 'futbol' ? 'Fútbol' : 'Todas las Canchas');
    summaryText.textContent = `${totalLibres} turnos libres (${depLabel}) para ${formatFechaLarga(storyState.fecha)}`;
    summaryDetails.textContent = details.join(' | ');
  } else {
    const cancha = canchas.find(c => c.id === storyState.canchaId) || canchas[0];
    if (cancha) {
      const libres = getTurnosLibresParaCancha(cancha.id, storyState.fecha);
      summaryText.textContent = `${libres.length} turnos libres para ${cancha.nombre}`;
      summaryDetails.textContent = libres.length > 0 ? `Horarios disponibles: ${libres.join(', ')}` : 'Cancha completa sin turnos libres para esta fecha.';
    }
  }
}

async function renderStoryCanvas() {
  const canvas = document.getElementById('canvas-story');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Preload Logo
  await preloadStoryLogo();

  const width = 1080;
  const height = 1920;
  canvas.width = width;
  canvas.height = height;

  // 1. BASE BACKGROUND: Clean White with subtle athletic geometry
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Subtle athletic watermark diagonal lines
  ctx.save();
  ctx.strokeStyle = '#F1F5F9';
  ctx.lineWidth = 2;
  for (let i = -1080; i < 3000; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 1920, 1920);
    ctx.stroke();
  }
  ctx.restore();

  // 2. HEADER: Top curved blue banner (#0072CE)
  ctx.save();
  const gradBlue = ctx.createLinearGradient(0, 0, width, 300);
  gradBlue.addColorStop(0, '#0072CE');
  gradBlue.addColorStop(0.6, '#0060B2');
  gradBlue.addColorStop(1, '#004B8C');
  ctx.fillStyle = gradBlue;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width, 0);
  ctx.lineTo(width, 250);
  ctx.bezierCurveTo(740, 310, 340, 200, 0, 275);
  ctx.closePath();
  ctx.fill();

  // Lime Green (#62B400) border accent line under the curve
  ctx.strokeStyle = '#62B400';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(0, 281);
  ctx.bezierCurveTo(340, 206, 740, 316, width, 256);
  ctx.stroke();

  // Orange (#FF6A00) secondary subtle accent line
  ctx.strokeStyle = '#FF6A00';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 290);
  ctx.bezierCurveTo(340, 215, 740, 325, width, 265);
  ctx.stroke();

  // Header Texts
  ctx.textAlign = 'center';

  // Sub-badge top
  ctx.font = 'bold 24px "Outfit", "Inter", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillText('COMPLEJO PADEL 3 · LAVALLE', width / 2, 70);

  // Stylized extra-bold italic "TURNOS DISPONIBLES"
  ctx.font = 'italic 900 68px "Oswald", "Bebas Neue", "Arial Black", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 4;
  ctx.fillText('TURNOS DISPONIBLES', width / 2, 155);
  ctx.shadowColor = 'transparent';

  // Sub headline
  ctx.font = 'bold 24px "Outfit", "Inter", sans-serif';
  ctx.fillStyle = '#A3E635';
  const subHeadline = storyState.deporte === 'futbol'
    ? '⚡ RESERVÁ TU CANCHA DE FÚTBOL HOY Y JUGÁ CON AMIGOS ⚽'
    : (storyState.deporte === 'padel'
      ? '⚡ RESERVÁ TU CANCHA DE PÁDEL HOY Y JUGÁ CON AMIGOS 🎾'
      : '⚡ RESERVÁ TU CANCHA HOY Y JUGÁ CON AMIGOS 🎾⚽');
  ctx.fillText(subHeadline, width / 2, 205);
  ctx.restore();

  // 3. LATERAL CURVED ACCENTS (Verde Lima #62B400 y Naranja #FF6A00)
  ctx.save();
  // Upper right green flourish
  ctx.fillStyle = '#62B400';
  ctx.beginPath();
  ctx.moveTo(width, 420);
  ctx.bezierCurveTo(980, 470, 980, 580, width, 630);
  ctx.closePath();
  ctx.fill();

  // Mid left orange flourish
  ctx.fillStyle = '#FF6A00';
  ctx.beginPath();
  ctx.moveTo(0, 840);
  ctx.bezierCurveTo(90, 890, 90, 1000, 0, 1050);
  ctx.closePath();
  ctx.fill();

  // Lower right blue flourish
  ctx.fillStyle = '#0072CE';
  ctx.beginPath();
  ctx.moveTo(width, 1260);
  ctx.bezierCurveTo(1010, 1310, 1010, 1400, width, 1450);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 4. DATE RIBBON
  const fechaLargaTexto = formatFechaLarga(storyState.fecha).toUpperCase();
  ctx.save();
  const datePillWidth = 720;
  const datePillHeight = 64;
  const datePillX = (width - datePillWidth) / 2;
  const datePillY = 315;

  ctx.fillStyle = '#0B0F19';
  drawRoundedRect(ctx, datePillX, datePillY, datePillWidth, datePillHeight, 32, true, false);
  ctx.strokeStyle = '#62B400';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, datePillX, datePillY, datePillWidth, datePillHeight, 32, false, true);

  ctx.font = 'bold 28px "Oswald", "Bebas Neue", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(`📅 FECHA: ${fechaLargaTexto}`, width / 2, datePillY + 42);
  ctx.restore();

  // 5. CONTENT BLOCKS
  if (storyState.mode === 'general') {
    renderCanvasGeneralMode(ctx, width, height);
  } else {
    renderCanvasIndividualMode(ctx, width, height);
  }

  // 6. FOOTER (Pie de página con logo oficial)
  renderCanvasFooter(ctx, width, height);
}

function renderCanvasGeneralMode(ctx, width, height) {
  let canchas = adminState.config?.canchas || [];
  if (storyState.deporte === 'padel') {
    canchas = canchas.filter(c => c.deporte === 'padel');
  } else if (storyState.deporte === 'futbol') {
    canchas = canchas.filter(c => c.deporte === 'futbol');
  }

  const courtThemes = [
    { name: 'Azul Indoor', primary: '#0072CE', bgTint: '#F0F7FF', badgeText: 'INDOOR TECHADA' },
    { name: 'Verde Indoor', primary: '#62B400', bgTint: '#F4FBF0', badgeText: 'INDOOR PANORÁMICA' },
    { name: 'Naranja Outdoor', primary: '#FF6A00', bgTint: '#FFF8F2', badgeText: 'OUTDOOR AIRE LIBRE' },
    { name: 'Cian Fútbol', primary: '#00838F', bgTint: '#F0FDFA', badgeText: 'FÚTBOL SINTÉTICO' }
  ];

  const displayCanchas = canchas.slice(0, 3);
  const cardX = 60;
  const cardWidth = width - 120; // 960px
  let currentY = 405;
  const cardSpacing = 24;
  const availableHeight = 1240;
  const cardHeight = Math.min(380, Math.floor((availableHeight - (displayCanchas.length - 1) * cardSpacing) / Math.max(1, displayCanchas.length)));

  displayCanchas.forEach((cancha, idx) => {
    const theme = courtThemes[idx % courtThemes.length];
    const libres = getTurnosLibresParaCancha(cancha.id, storyState.fecha);

    // Draw Card Container
    ctx.save();
    ctx.fillStyle = theme.bgTint;
    drawRoundedRect(ctx, cardX, currentY, cardWidth, cardHeight, 24, true, false);

    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 3.5;
    drawRoundedRect(ctx, cardX, currentY, cardWidth, cardHeight, 24, false, true);

    // Top Header Inside Card
    const sportIcon = cancha.deporte === 'padel' ? '🎾' : '⚽';
    ctx.font = 'bold 34px "Oswald", "Bebas Neue", sans-serif';
    ctx.fillStyle = '#0B0F19';
    ctx.textAlign = 'left';
    ctx.fillText(`${sportIcon} ${cancha.nombre.toUpperCase()}`, cardX + 30, currentY + 48);

    // Court Tag Badge
    const tagText = cancha.ubicacion === 'interior' ? 'INDOOR TECHADA' : 'OUTDOOR';
    ctx.font = 'bold 18px "Outfit", "Inter", sans-serif';
    const tagWidth = ctx.measureText(tagText).width + 24;
    const tagX = cardX + cardWidth - tagWidth - 30;
    const tagY = currentY + 22;

    ctx.fillStyle = theme.primary;
    drawRoundedRect(ctx, tagX, tagY, tagWidth, 34, 17, true, false);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(tagText, tagX + tagWidth / 2, tagY + 24);

    // Dotted Dividing Line
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(cardX + 25, currentY + 74);
    ctx.lineTo(cardX + cardWidth - 25, currentY + 74);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Time Slots Pills
    const slotContainerY = currentY + 95;
    const slotHeight = 56;
    const slotGapX = 14;
    const slotGapY = 12;
    const cols = 5;
    const slotWidth = Math.floor((cardWidth - 50 - (cols - 1) * slotGapX) / cols);

    if (libres.length === 0) {
      // No free slots
      ctx.fillStyle = '#FEE2E2';
      drawRoundedRect(ctx, cardX + 30, slotContainerY + 20, cardWidth - 60, 64, 18, true, false);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, cardX + 30, slotContainerY + 20, cardWidth - 60, 64, 18, false, true);

      ctx.font = 'bold 24px "Oswald", "Bebas Neue", sans-serif';
      ctx.fillStyle = '#DC2626';
      ctx.textAlign = 'center';
      ctx.fillText('🔴 SIN TURNOS LIBRES DISPONIBLES (COMPLETO)', cardX + cardWidth / 2, slotContainerY + 60);
    } else {
      // Draw pills
      const maxSlotsToShow = Math.min(libres.length, 10);
      for (let sIdx = 0; sIdx < maxSlotsToShow; sIdx++) {
        const row = Math.floor(sIdx / cols);
        const col = sIdx % cols;
        const pillX = cardX + 25 + col * (slotWidth + slotGapX);
        const pillY = slotContainerY + row * (slotHeight + slotGapY);

        if (pillY + slotHeight > currentY + cardHeight - 15) break;

        // Slot Button Pill
        ctx.fillStyle = theme.primary;
        drawRoundedRect(ctx, pillX, pillY, slotWidth, slotHeight, 16, true, false);

        ctx.font = 'bold 24px "Oswald", "Bebas Neue", "Arial Black", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(`${libres[sIdx]}hs`, pillX + slotWidth / 2, pillY + 37);
      }

      if (libres.length > 10) {
        ctx.font = 'bold 18px "Outfit", sans-serif';
        ctx.fillStyle = theme.primary;
        ctx.textAlign = 'right';
        ctx.fillText(`+ ${libres.length - 10} horarios más disponibles`, cardX + cardWidth - 30, currentY + cardHeight - 14);
      }
    }

    ctx.restore();
    currentY += cardHeight + cardSpacing;
  });
}

function renderCanvasIndividualMode(ctx, width, height) {
  const canchas = adminState.config?.canchas || [];
  const cancha = canchas.find(c => c.id === storyState.canchaId) || canchas[0];
  if (!cancha) return;

  const libres = getTurnosLibresParaCancha(cancha.id, storyState.fecha);
  const isPadel = cancha.deporte === 'padel';
  const themeColor = isPadel ? (cancha.ubicacion === 'interior' ? '#0072CE' : '#FF6A00') : '#62B400';
  const bgTint = isPadel ? '#F0F7FF' : '#F4FBF0';

  const cardX = 60;
  const cardY = 410;
  const cardWidth = width - 120; // 960px
  const cardHeight = 1220;

  ctx.save();
  // Hero Card Container
  ctx.fillStyle = bgTint;
  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 32, true, false);

  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 32, false, true);

  // Large Court Title
  const sportEmoji = isPadel ? '🎾' : '⚽';
  ctx.font = 'bold 50px "Oswald", "Bebas Neue", sans-serif';
  ctx.fillStyle = '#0B0F19';
  ctx.textAlign = 'center';
  ctx.fillText(`${sportEmoji} ${cancha.nombre.toUpperCase()}`, width / 2, cardY + 75);

  // Surface & Features Badges
  const badges = [
    cancha.ubicacion === 'interior' ? '🏠 INDOOR TECHADA' : '☀️ OUTDOOR',
    cancha.superficie || 'CÉSPED SINTÉTICO',
    `${cancha.jugadores || 4} JUGADORES`,
    `$ ${Number(cancha.precio || 20000).toLocaleString('es-AR')} / HORA`
  ];

  let badgeY = cardY + 115;
  const badgeHeight = 42;
  ctx.font = 'bold 19px "Outfit", "Inter", sans-serif';

  // Center badges
  let totalBadgesWidth = badges.reduce((acc, b) => acc + ctx.measureText(b).width + 30, 0) + (badges.length - 1) * 12;
  let startX = (width - totalBadgesWidth) / 2;

  badges.forEach(badgeText => {
    const bw = ctx.measureText(badgeText).width + 30;
    ctx.fillStyle = themeColor;
    drawRoundedRect(ctx, startX, badgeY, bw, badgeHeight, 21, true, false);

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, startX + bw / 2, badgeY + 28);
    startX += bw + 12;
  });

  // Dotted Dividing Line
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(cardX + 40, cardY + 190);
  ctx.lineTo(cardX + cardWidth - 40, cardY + 190);
  ctx.stroke();
  ctx.setLineDash([]);

  // Title for Slots
  ctx.font = 'bold 30px "Oswald", "Bebas Neue", sans-serif';
  ctx.fillStyle = '#0B0F19';
  ctx.textAlign = 'center';
  ctx.fillText('HORARIOS DISPONIBLES PARA ESTA FECHA:', width / 2, cardY + 245);

  // Large Slots Grid (3 columns)
  const slotGridY = cardY + 275;
  const cols = 3;
  const slotWidth = 260;
  const slotHeight = 72;
  const gapX = 35;
  const gapY = 22;
  const gridStartX = (width - (cols * slotWidth + (cols - 1) * gapX)) / 2;

  if (libres.length === 0) {
    ctx.fillStyle = '#FEE2E2';
    drawRoundedRect(ctx, cardX + 50, slotGridY + 80, cardWidth - 100, 120, 24, true, false);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, cardX + 50, slotGridY + 80, cardWidth - 100, 120, 24, false, true);

    ctx.font = 'bold 34px "Oswald", "Bebas Neue", sans-serif';
    ctx.fillStyle = '#DC2626';
    ctx.textAlign = 'center';
    ctx.fillText('🔴 CANCHA COMPLETA · SIN TURNOS LIBRES', width / 2, slotGridY + 155);
  } else {
    libres.forEach((slot, sIdx) => {
      const row = Math.floor(sIdx / cols);
      const col = sIdx % cols;
      const px = gridStartX + col * (slotWidth + gapX);
      const py = slotGridY + row * (slotHeight + gapY);

      if (py + slotHeight > cardY + cardHeight - 20) return;

      // Slot Button Pill
      ctx.fillStyle = themeColor;
      drawRoundedRect(ctx, px, py, slotWidth, slotHeight, 22, true, false);

      ctx.font = 'bold 34px "Oswald", "Bebas Neue", "Arial Black", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(`${slot} hs`, px + slotWidth / 2, py + 48);
    });
  }

  ctx.restore();
}

function renderCanvasFooter(ctx, width, height) {
  ctx.save();
  // Dark bottom container with sleek curve
  const gradFoot = ctx.createLinearGradient(0, 1660, width, height);
  gradFoot.addColorStop(0, '#0B0F19');
  gradFoot.addColorStop(1, '#070A10');
  ctx.fillStyle = gradFoot;

  ctx.beginPath();
  ctx.moveTo(0, 1690);
  ctx.bezierCurveTo(340, 1650, 740, 1720, width, 1670);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Lime green top border curve
  ctx.strokeStyle = '#62B400';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 1690);
  ctx.bezierCurveTo(340, 1650, 740, 1720, width, 1670);
  ctx.stroke();

  // Footer Left Content
  ctx.textAlign = 'left';
  ctx.font = 'bold 40px "Oswald", "Bebas Neue", sans-serif';
  ctx.fillStyle = '#00E676';
  ctx.fillText('📅 RESERVÁ TU TURNO', 70, 1765);

  ctx.font = 'bold 28px "Outfit", "Inter", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  const phone = adminState.config?.whatsapp || '+54 9 11 1234-5678';
  ctx.fillText(`📲 WhatsApp: ${phone}`, 70, 1815);

  ctx.font = '500 22px "Outfit", "Inter", sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('📍 Complejo Padel 3 · Lavalle, Mendoza', 70, 1855);

  // Official Logo Drawing (Right corner)
  const logoSize = 150;
  const logoX = 860;
  const logoY = 1715;

  ctx.fillStyle = '#161F30';
  drawRoundedRect(ctx, logoX - 10, logoY - 10, logoSize + 20, logoSize + 20, 28, true, false);
  ctx.strokeStyle = '#62B400';
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, logoX - 10, logoY - 10, logoSize + 20, logoSize + 20, 28, false, true);

  if (storyState.logoImage && storyState.logoImage.complete && storyState.logoImage.naturalWidth > 0) {
    ctx.drawImage(storyState.logoImage, logoX, logoY, logoSize, logoSize);
  } else {
    ctx.font = 'bold 28px "Oswald", sans-serif';
    ctx.fillStyle = '#00E676';
    ctx.textAlign = 'center';
    ctx.fillText('PADEL 3', logoX + logoSize / 2, logoY + logoSize / 2 + 10);
  }

  ctx.restore();
}

function downloadStoryPNG() {
  const canvas = document.getElementById('canvas-story');
  if (!canvas) return;

  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const link = document.createElement('a');
  link.download = `historia-padel3-${storyState.fecha}-${storyState.mode}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function copyStoryToClipboard() {
  const canvas = document.getElementById('canvas-story');
  if (!canvas) return;

  if (navigator.clipboard && window.ClipboardItem) {
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        alert('✓ ¡Imagen de la historia copiada al portapapeles! Ya podés pegarla en WhatsApp Web o Instagram.');
      }, 'image/png');
    } catch (e) {
      downloadStoryPNG();
    }
  } else {
    downloadStoryPNG();
  }
}

window.addEventListener('DOMContentLoaded', initAdmin);
