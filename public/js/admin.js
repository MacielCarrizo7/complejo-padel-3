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
      if (firebase.firestore) firebaseFirestore = firebase.firestore();

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
          }
        });
      }
    }
  } catch (e) {
    console.warn('Error inicializando Firebase SDK:', e);
  }
}

async function saveToFirestore(docId, data) {
  try {
    if (firebaseFirestore) {
      await firebaseFirestore.collection('complejo_data').doc(docId).set(data, { merge: true });
      console.log(`✓ Sincronizado en Firestore (${docId})`);
    }
  } catch (err) {
    console.warn(`Error al guardar en Firestore (${docId}):`, err);
  }
}

async function syncFromFirestore() {
  try {
    if (!firebaseFirestore) return;
    const docCfg = await firebaseFirestore.collection('complejo_data').doc('config').get();
    if (docCfg.exists && docCfg.data().nombre) adminState.config = docCfg.data();

    const docSrv = await firebaseFirestore.collection('complejo_data').doc('servicios').get();
    if (docSrv.exists && Array.isArray(docSrv.data().list)) adminState.servicios = docSrv.data().list;

    const docEv = await firebaseFirestore.collection('complejo_data').doc('eventos').get();
    if (docEv.exists && Array.isArray(docEv.data().list)) adminState.eventos = docEv.data().list;

    const docTur = await firebaseFirestore.collection('complejo_data').doc('turnos').get();
    if (docTur.exists && Array.isArray(docTur.data().list)) adminState.turnos = docTur.data().list;
  } catch (err) {
    console.warn('Error al sincronizar datos desde Firestore:', err);
  }
}
          onAuthSignedOut();
        }
      });
    } else if (window.firebase && firebase.apps.length) {
      firebaseAuth = firebase.auth();
    }
  } catch (e) {
    console.warn('Firebase init warning:', e);
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
    let html = '<option value="todas">🏟️ Todas las canchas</option>';
    (adminState.config?.canchas || []).forEach(c => {
      const sportEmoji = c.deporte === 'padel' ? '🎾' : '⚽';
      const locEmoji = c.ubicacion === 'interior' ? '🏠' : '☀️';
      html += `<option value="${c.id}" ${c.id === current ? 'selected' : ''}>${sportEmoji} ${escapeHtml(c.nombre)} (${locEmoji})</option>`;
    });
    selectCancha.innerHTML = html;
  }
}

function getFilteredTurnos() {
  const { cancha, fechaPreset, deporte, estado, search } = adminState.filters;
  const hoy = hoyISO();

  return (adminState.turnos || []).filter(t => {
    if (deporte !== 'todos' && t.deporte !== deporte) return false;
    if (cancha !== 'todas' && t.canchaId !== cancha) return false;
    if (estado === 'confirmados' && !t.confirmado) return false;
    if (estado === 'pendientes' && t.confirmado) return false;

    if (fechaPreset === 'hoy' && t.fecha !== hoy) return false;
    if (fechaPreset === 'manana') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      if (t.fecha !== formatDateISO(d)) return false;
    }
    if (fechaPreset === 'semana') {
      const d7 = new Date();
      d7.setDate(d7.getDate() + 7);
      if (t.fecha < hoy || t.fecha > formatDateISO(d7)) return false;
    }
    if (fechaPreset === 'todos' && t.fecha < hoy) return false;

    if (search) {
      const q = search.toLowerCase();
      const matchName = String(t.nombre || '').toLowerCase().includes(q);
      const matchWa = String(t.whatsapp || '').toLowerCase().includes(q);
      const matchTeam = String(t.equipo || '').toLowerCase().includes(q);
      const matchCourt = String(t.canchaNombre || '').toLowerCase().includes(q);
      if (!matchName && !matchWa && !matchTeam && !matchCourt) return false;
    }

    return true;
  });
}

function renderAgendaTab() {
  populateAgendaFilters();

  const listView = document.getElementById('admin-agenda-list-view');
  const tacticalView = document.getElementById('admin-tactical-view');

  if (adminState.agendaSubView === 'lista') {
    listView.classList.remove('hidden');
    tacticalView.classList.add('hidden');
    renderAgendaListItems();
  } else {
    listView.classList.add('hidden');
    tacticalView.classList.remove('hidden');
    renderTacticalPitchesView();
  }
}

function renderAgendaListItems() {
  const container = document.getElementById('admin-agenda-list-container');
  const emptyEl = document.getElementById('admin-agenda-empty');
  if (!container || !emptyEl) return;
  container.innerHTML = '';

  const list = getFilteredTurnos().sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    return a.hora.localeCompare(b.hora);
  });

  if (list.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  let currentDay = null;

  list.forEach(t => {
    if (t.fecha !== currentDay) {
      currentDay = t.fecha;
      const dayHeader = document.createElement('div');
      dayHeader.className = 'pt-4 pb-2 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-[#00E676] flex items-center gap-2';
      dayHeader.innerHTML = `<i data-lucide="calendar" class="w-4 h-4"></i><span>${formatFechaLarga(t.fecha)}</span>`;
      container.appendChild(dayHeader);
    }

    const card = document.createElement('div');
    card.className = 'glass-card p-5 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group';

    const isPadel = t.deporte === 'padel';
    const dur = Number(t.duracion) || 1;
    const [hStr, mStr] = t.hora.split(':').map(Number);
    const nextH = (hStr + dur) % 24;
    const horaFin = t.horaFin || `${pad2(nextH)}:${pad2(mStr)}`;

    card.innerHTML = `
      <div class="flex items-start gap-4">
        <div class="w-14 h-14 rounded-xl bg-[#0B0F19] border border-slate-700 flex flex-col items-center justify-center shrink-0">
          <span class="font-sports text-lg font-bold text-white leading-none">${t.hora}</span>
          <span class="text-[10px] text-slate-400 font-semibold">${dur}h</span>
        </div>

        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-bold text-white text-base">${escapeHtml(t.nombre)}</span>
            ${t.equipo ? `<span class="text-xs text-[#00E5FF] font-semibold">(${escapeHtml(t.equipo)})</span>` : ''}
            <span class="px-2 py-0.5 rounded text-[11px] font-bold ${t.confirmado ? 'bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}">
              ${t.confirmado ? '✓ WhatsApp Confirmado' : '⏳ Pendiente'}
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>🏟️ <strong>${escapeHtml(t.canchaNombre)}</strong></span>
            <span>⏰ ${t.hora} a ${horaFin} hs</span>
            <span>📞 ${escapeHtml(t.whatsapp || 'Sin teléfono')}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 self-end md:self-center">
        <div class="text-right">
          <div class="font-bebas text-2xl text-[#00E676]">${formatCurrency(t.precio)}</div>
          <div class="text-[10px] text-slate-400 font-semibold">${dur === 2 ? 'Turno Doble' : '1 Hora'}</div>
        </div>

        <button class="btn-toggle-confirm p-2.5 rounded-xl bg-[#1E293B] hover:bg-[#00E676] text-slate-300 hover:text-black transition-all" data-id="${t.id}" title="${t.confirmado ? 'Marcar como pendiente' : 'Marcar como confirmado'}">
          <i data-lucide="${t.confirmado ? 'check-circle-2' : 'clock'}" class="w-4 h-4"></i>
        </button>

        <button class="btn-cancel-turno p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all border border-red-500/20" data-id="${t.id}" title="Cancelar turno y liberar cancha">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  // Attach event handlers
  container.querySelectorAll('.btn-cancel-turno').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const turno = adminState.turnos.find(t => t.id === id);
      if (!turno) return;

      if (confirm(`¿Cancelar el turno de ${turno.nombre} (${turno.canchaNombre} - ${formatFechaLarga(turno.fecha)} ${turno.hora} hs)?\nLa cancha quedará liberada al instante.`)) {
        try {
          const res = await fetch(`/api/turnos/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await res.json();
          if (data.success) {
            adminState.turnos = adminState.turnos.filter(t => t.id !== id);
            await fetchMetrics();
            renderActiveTabContent();
          } else {
            alert(data.message || 'Error al cancelar turno.');
          }
        } catch (e) {
          alert('Error de conexión al cancelar turno.');
        }
      }
    });
  });

  container.querySelectorAll('.btn-toggle-confirm').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      try {
        const res = await fetch(`/api/turnos/${id}/confirmar`, { method: 'PATCH' });
        const data = await res.json();
        if (data.success) {
          const t = adminState.turnos.find(x => x.id === id);
          if (t) t.confirmado = true;
          renderActiveTabContent();
        }
      } catch (e) {}
    });
  });
}

function exportAgendaToCSV() {
  const filtered = getFilteredTurnos();
  if (filtered.length === 0) {
    alert('No hay turnos para exportar con los filtros actuales.');
    return;
  }

  const headers = ['ID', 'Fecha', 'Hora_Inicio', 'Hora_Fin', 'Duracion_Hs', 'Cancha', 'Deporte', 'Ubicacion', 'Jugador', 'WhatsApp', 'Equipo', 'Precio_Total', 'Estado'];
  const rows = filtered.map(t => [
    `"${t.id}"`,
    `"${t.fecha}"`,
    `"${t.hora}"`,
    `"${t.horaFin || ''}"`,
    `"${t.duracion || 1}"`,
    `"${(t.canchaNombre || '').replace(/"/g, '""')}"`,
    `"${t.deporte || ''}"`,
    `"${t.ubicacion || ''}"`,
    `"${(t.nombre || '').replace(/"/g, '""')}"`,
    `"${(t.whatsapp || '').replace(/"/g, '""')}"`,
    `"${(t.equipo || '').replace(/"/g, '""')}"`,
    `"${t.precio || 0}"`,
    `"${t.confirmado ? 'Confirmado' : 'Pendiente'}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `turnos_complejo_padel3_${hoyISO()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function renderTacticalPitchesView() {
  const fechasCont = document.getElementById('admin-tactical-fechas');
  const pitchesGrid = document.getElementById('admin-tactical-pitches-grid');
  if (!fechasCont || !pitchesGrid) return;

  const fechas = Array.from(new Set(adminState.turnos.map(t => t.fecha))).sort();
  if (!fechas.includes(hoyISO())) fechas.unshift(hoyISO());

  if (!adminState.selectedTacticalFecha || !fechas.includes(adminState.selectedTacticalFecha)) {
    adminState.selectedTacticalFecha = fechas[0];
  }

  fechasCont.innerHTML = '';
  fechas.forEach(iso => {
    const { dow, num } = formatFechaLabel(iso);
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `fecha-pill-modern ${iso === adminState.selectedTacticalFecha ? 'active' : ''}`;
    pill.innerHTML = `<div class="dow">${dow}</div><div class="num">${num}</div>`;
    pill.addEventListener('click', () => {
      adminState.selectedTacticalFecha = iso;
      renderTacticalPitchesView();
    });
    fechasCont.appendChild(pill);
  });

  pitchesGrid.innerHTML = '';
  const canchas = adminState.config?.canchas || [];

  canchas.forEach(cancha => {
    const card = document.createElement('div');
    card.className = 'glass-card p-5 border border-slate-800 space-y-4';

    const pitchSvg = getCourtSvgHtml(cancha);
    const slots = generarHorarios();

    let slotsHtml = '';
    slots.forEach(h => {
      const turno = adminState.turnos.find(t => {
        if (t.canchaId !== cancha.id || t.fecha !== adminState.selectedTacticalFecha) return false;
        if (t.hora === h) return true;
        if (Array.isArray(t.horasCubiertas)) return t.horasCubiertas.includes(h);
        return false;
      });

      if (turno) {
        slotsHtml += `
          <div class="px-2.5 py-1.5 rounded-lg bg-[#00E676]/20 border border-[#00E676]/40 text-[#00E676] text-xs font-bold flex items-center justify-between" title="Reservado por ${escapeHtml(turno.nombre)}">
            <span>🟢 ${h}</span>
            <span class="text-[10px] text-white font-normal truncate max-w-[80px]">${escapeHtml(turno.nombre)}</span>
          </div>
        `;
      } else {
        slotsHtml += `
          <div class="px-2.5 py-1.5 rounded-lg bg-[#1E293B]/60 border border-slate-800 text-slate-400 text-xs flex items-center justify-between">
            <span>⚪ ${h}</span>
            <span class="text-[10px] text-slate-500">Libre</span>
          </div>
        `;
      }
    });

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <h4 class="font-sports text-lg font-bold text-white">${escapeHtml(cancha.nombre)}</h4>
        <span class="font-bebas text-xl text-[#00E676]">${formatCurrency(cancha.precio)} / h</span>
      </div>
      ${pitchSvg}
      <div>
        <div class="text-[11px] font-bold text-slate-400 uppercase mb-2">Horarios del día:</div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          ${slotsHtml}
        </div>
      </div>
    `;

    pitchesGrid.appendChild(card);
  });
}

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
          const res = await fetch(`/api/eventos/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            adminState.eventos = adminState.eventos.filter(x => x.id !== id);
            renderEventosTab();
          }
        } catch (err) {}
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

      if (confirm(`¿Eliminar el servicio "${srv.titulo}"?`)) {
        try {
          const res = await fetch(`/api/servicios/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            adminState.servicios = adminState.servicios.filter(x => x.id !== id);
            renderServiciosTab();
            saveToFirestore('servicios', { list: adminState.servicios });
          }
        } catch (e) {}
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

  // Subview toggle listeners
  document.getElementById('btn-subview-lista')?.addEventListener('click', () => {
    adminState.agendaSubView = 'lista';
    document.getElementById('btn-subview-lista').className = 'px-4 py-2 rounded-lg bg-[#00E676] text-black font-bold text-xs flex items-center gap-1.5 transition-all';
    document.getElementById('btn-subview-tactica').className = 'px-4 py-2 rounded-lg bg-[#161F30] text-slate-300 hover:text-white font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-all';
    renderAgendaTab();
  });

  document.getElementById('btn-subview-tactica')?.addEventListener('click', () => {
    adminState.agendaSubView = 'tactica';
    document.getElementById('btn-subview-tactica').className = 'px-4 py-2 rounded-lg bg-[#00E676] text-black font-bold text-xs flex items-center gap-1.5 transition-all';
    document.getElementById('btn-subview-lista').className = 'px-4 py-2 rounded-lg bg-[#161F30] text-slate-300 hover:text-white font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-all';
    renderAgendaTab();
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
    const id = document.getElementById('edit-evento-id').value;
    const titulo = document.getElementById('edit-evento-titulo').value.trim();
    const categoria = document.getElementById('edit-evento-categoria').value.trim();
    const estado = document.getElementById('edit-evento-estado').value;
    const fecha = document.getElementById('edit-evento-fecha').value.trim();
    const horario = document.getElementById('edit-evento-horario').value.trim();
    const premio = document.getElementById('edit-evento-premio').value.trim();
    const descripcion = document.getElementById('edit-evento-descripcion').value.trim();
    const imagen = document.getElementById('edit-evento-imagen').value.trim();
    const whatsappContacto = document.getElementById('edit-evento-whatsapp').value.trim();

    const payload = {
      titulo,
      categoria,
      estado,
      fecha,
      horario,
      premio,
      descripcion,
      imagen,
      whatsappContacto
    };

    try {
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/eventos/${id}` : '/api/eventos';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (id) {
          const idx = adminState.eventos.findIndex(x => x.id === id);
          if (idx !== -1) adminState.eventos[idx] = data.evento;
        } else {
          adminState.eventos.unshift(data.evento);
        }
        closeEditEventoModal();
        renderEventosTab();
        saveToFirestore('eventos', { list: adminState.eventos });
        alert(id ? '✓ Evento actualizado exitosamente.' : '✓ Evento creado exitosamente.');
      } else {
        alert(data.message || 'Error al guardar evento.');
      }
    } catch (err) {
      alert('Error de conexión al guardar evento.');
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
    const id = document.getElementById('edit-servicio-id').value;
    const titulo = document.getElementById('edit-servicio-titulo').value.trim();
    const icono = document.getElementById('edit-servicio-icono').value;
    const categoria = document.getElementById('edit-servicio-categoria').value.trim() || 'COMODIDADES';
    const imagen = document.getElementById('edit-servicio-imagen').value.trim();
    const descripcion = document.getElementById('edit-servicio-descripcion').value.trim();
    const tagsStr = document.getElementById('edit-servicio-tags').value.trim();
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

    const payload = { titulo, icono, categoria, imagen, descripcion, tags };

    try {
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/servicios/${id}` : '/api/servicios';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (id) {
          const idx = adminState.servicios.findIndex(x => x.id === id);
          if (idx !== -1) adminState.servicios[idx] = data.servicio;
        } else {
          adminState.servicios.push(data.servicio);
        }
        closeEditServicioModal();
        renderServiciosTab();
        saveToFirestore('servicios', { list: adminState.servicios });
        alert(id ? '✓ Servicio actualizado exitosamente.' : '✓ Servicio creado exitosamente.');
      } else {
        alert(data.message || 'Error al guardar servicio.');
      }
    } catch (err) {
      alert('Error de conexión al guardar servicio.');
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
