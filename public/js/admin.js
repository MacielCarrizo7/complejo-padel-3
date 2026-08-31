// =========================================================
// COMPLEJO PADEL 3 - ADMIN CMS & FIREBASE AUTHENTICATION
// =========================================================

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

function initFirebaseClient() {
  const fbConfig = adminState.config?.firebaseConfig || {
    apiKey: "AIzaSyDemoPadel3KeyComplejo",
    authDomain: "complejo-padel-3.firebaseapp.com",
    projectId: "complejo-padel-3"
  };

  try {
    if (window.firebase && !firebase.apps.length) {
      firebaseApp = firebase.initializeApp(fbConfig);
      firebaseAuth = firebase.auth();

      firebaseAuth.onAuthStateChanged(user => {
        if (user) {
          onAuthSuccess(user);
        } else {
          // Check local stored session fallback
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
    } else if (window.firebase && firebase.apps.length) {
      firebaseAuth = firebase.auth();
    }
  } catch (e) {
    console.warn('Firebase init warning (usando fallback de backend):', e);
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
  btn.innerHTML = '<span>Verificando credenciales...</span> ⏳';

  // 1. Try with Firebase Client SDK
  if (firebaseAuth) {
    try {
      const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4 text-black"></i><span>Iniciar Sesión con Firebase</span>';
      if (window.lucide) window.lucide.createIcons();
      onAuthSuccess(userCredential.user);
      return;
    } catch (fbError) {
      console.warn('Firebase Client Auth attempt error:', fbError.code, fbError.message);
      // If error is wrong password/user not found from active Firebase project, show error
      if (fbError.code === 'auth/wrong-password' || fbError.code === 'auth/user-not-found' || fbError.code === 'auth/invalid-credential') {
        errEl.textContent = 'Email o contraseña incorrectos en Firebase Authentication.';
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4 text-black"></i><span>Iniciar Sesión con Firebase</span>';
        if (window.lucide) window.lucide.createIcons();
        return;
      }
    }
  }

  // 2. Fallback to Express Backend Auth
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
        </select>

        <button class="btn-del-evento p-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all border border-red-500/20" data-id="${ev.id}" title="Eliminar evento">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `;

    container.appendChild(card);
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
}

async function createNewEvento() {
  const titulo = prompt('Título del Evento / Torneo (Ej: Torneo Relámpago Pádel):');
  if (!titulo) return;

  const fecha = prompt('Fecha del evento (Ej: 12 al 14 de Septiembre):', 'Fin de semana');
  const categoria = prompt('Categoría (Ej: 4ta a 7ma Caballeros y Damas):', '4ta a 7ma');
  const premio = prompt('Premios:', '$ 200.000 en Premios + Trofeos');
  const descripcion = prompt('Descripción / Bases del torneo:', 'Torneo con fase de grupos y eliminación directa.');

  const payload = {
    titulo,
    fecha,
    categoria,
    premio,
    descripcion,
    horario: 'Desde las 18:00 hs',
    estado: 'Inscripciones Abiertas',
    whatsappContacto: adminState.config?.whatsapp || ''
  };

  try {
    const res = await fetch('/api/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      adminState.eventos.unshift(data.evento);
      renderEventosTab();
    }
  } catch (e) {
    alert('Error al crear evento.');
  }
}

// ================= TAB 4: GESTIÓN DE SERVICIOS =================

function renderServiciosTab() {
  const container = document.getElementById('admin-servicios-container');
  if (!container) return;
  container.innerHTML = '';

  const servicios = adminState.servicios || [];

  servicios.forEach(srv => {
    const card = document.createElement('div');
    card.className = 'glass-card p-6 border border-slate-800 space-y-3';

    card.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div>
          <h4 class="font-sports text-xl font-bold text-white">${escapeHtml(srv.titulo)}</h4>
          <span class="text-xs text-[#00E676] font-mono">Icono: ${escapeHtml(srv.icono)}</span>
        </div>
        <button class="btn-del-servicio p-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all border border-red-500/20" data-id="${srv.id}" title="Eliminar servicio">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>

      <p class="text-slate-400 text-xs leading-relaxed">${escapeHtml(srv.descripcion)}</p>

      <div class="flex flex-wrap gap-1.5 pt-2">
        ${(srv.tags || []).map(t => `<span class="text-[10px] bg-[#1E293B] text-slate-300 px-2 py-0.5 rounded">${escapeHtml(t)}</span>`).join('')}
      </div>
    `;

    container.appendChild(card);
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
          }
        } catch (e) {}
      }
    });
  });
}

async function createNewServicio() {
  const titulo = prompt('Título del Servicio (Ej: Snack Bar):');
  if (!titulo) return;

  const descripcion = prompt('Descripción del Servicio:');
  const icono = prompt('Icono (Trophy, Flame, Utensils, ShieldCheck, Car, Sparkles):', 'Sparkles');
  const tagsStr = prompt('Etiquetas separadas por comas (Ej: Bebidas, Comidas):', 'Servicio Pro');
  const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);

  try {
    const res = await fetch('/api/servicios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, descripcion, icono, tags })
    });
    const data = await res.json();
    if (data.success) {
      adminState.servicios.push(data.servicio);
      renderServiciosTab();
    }
  } catch (e) {
    alert('Error al crear servicio.');
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

// ================= INITIALIZATION =================

async function initAdmin() {
  await fetchConfig();
  initFirebaseClient();

  setupTabNavigation();

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
}

window.addEventListener('DOMContentLoaded', initAdmin);
