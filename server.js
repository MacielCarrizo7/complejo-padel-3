const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initial default state
const DEFAULT_STATE = {
  config: {
    nombre: 'COMPLEJO PADEL 3',
    subtitulo: 'Canchas de Pádel & Fútbol · Techadas y Exterior · Buffet y Estacionamiento',
    direccion: 'Lavalle, Mendoza · Complejo Deportivo',
    maps: 'https://maps.google.com/?q=Lavalle+Mendoza',
    whatsapp: '5491112345678',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@complejopadel3.com',
    adminPassword: process.env.ADMIN_PASSWORD || 'admin1234',
    firebaseConfig: {
      apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyCCjMf1IIcKsLu2wQPqB-UxGa3bmEmVnWs',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'complejo-padel-3.firebaseapp.com',
      projectId: process.env.FIREBASE_PROJECT_ID || 'complejo-padel-3',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'complejo-padel-3.firebasestorage.app',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '975322009594',
      appId: process.env.FIREBASE_APP_ID || '1:975322009594:web:e81ead05c09307e7255e43',
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-RY4RW29MRS'
    },
    horaInicio: '14:00',
    horaFin: '24:00',
    diasActivos: [1, 2, 3, 4, 5, 6, 0], // Lunes a Domingo
    monedaSimbolo: '$',
    canchas: [
      {
        id: 'c1',
        deporte: 'padel',
        nombre: 'Pista 1 - Cristal Pro',
        ubicacion: 'interior',
        superficie: 'Césped Sintético Azul WPT',
        jugadores: 4,
        precio: 24000
      },
      {
        id: 'c2',
        deporte: 'padel',
        nombre: 'Pista 2 - Panorámica',
        ubicacion: 'interior',
        superficie: 'Vidrio Panorámico LED',
        jugadores: 4,
        precio: 24000
      },
      {
        id: 'c3',
        deporte: 'padel',
        nombre: 'Pista 3 - Sunset Open',
        ubicacion: 'exterior',
        superficie: 'Césped Texturado Fibrilado',
        jugadores: 4,
        precio: 20000
      },
      {
        id: 'c4',
        deporte: 'futbol',
        nombre: 'Cancha 1 - Monumental F5',
        ubicacion: 'interior',
        superficie: 'Sintético Forbex 50mm Techada',
        jugadores: 5,
        precio: 28000
      },
      {
        id: 'c5',
        deporte: 'futbol',
        nombre: 'Cancha 2 - Wembley F7',
        ubicacion: 'exterior',
        superficie: 'Césped Sintético Pro Iluminación LED',
        jugadores: 7,
        precio: 36000
      },
      {
        id: 'c6',
        deporte: 'futbol',
        nombre: 'Cancha 3 - San Siro F5',
        ubicacion: 'exterior',
        superficie: 'Césped Sintético Premium',
        jugadores: 5,
        precio: 26000
      }
    ]
  },
  servicios: [
    {
      id: 'srv_1',
      titulo: 'Canchas de Pádel WPT',
      categoria: 'PÁDEL PRO',
      imagen: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
      descripcion: 'Pistas panorámicas con césped sintético oficial WPT, cristal templado e iluminación LED proyectada sin sombras.',
      icono: 'Trophy',
      tags: ['4 Canchas Panorámicas', 'Césped WPT', 'Techadas & Exterior'],
      activo: true
    },
    {
      id: 'srv_2',
      titulo: 'Canchas de Fútbol 5 & 7',
      categoria: 'FÚTBOL PREMIUM',
      imagen: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
      descripcion: 'Canchas de fútbol con césped sintético de alta densidad 50mm, amortiguación premium e iluminación LED.',
      icono: 'Flame',
      tags: ['Fútbol 5 y 7', 'Sintético 50mm', 'Torneos & Partidos'],
      activo: true
    },
    {
      id: 'srv_3',
      titulo: 'Snack Bar & Tercer Tiempo',
      categoria: 'GASTRONOMÍA',
      imagen: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      descripcion: 'Disfrutá del mejor tercer tiempo con amigos en nuestro buffet equipado. Bebidas frías, picadas, comidas y pantallas HD.',
      icono: 'Utensils',
      tags: ['Bebidas Frías', 'Comidas Rápida', 'Pantallas HD'],
      activo: true
    },
    {
      id: 'srv_4',
      titulo: 'Vestuarios & Duchas',
      categoria: 'COMODIDADES',
      imagen: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
      descripcion: 'Instalaciones sanitarias completas con duchas de agua caliente, lockers individuales y máxima higiene permanente.',
      icono: 'ShieldCheck',
      tags: ['Duchas Agua Caliente', 'Lockers Seguros', 'Higiene Pro'],
      activo: true
    },
    {
      id: 'srv_5',
      titulo: 'Estacionamiento Privado',
      categoria: 'SEGURIDAD',
      imagen: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
      descripcion: 'Predio con estacionamiento monitoreado dentro del complejo con fácil acceso a las canchas.',
      icono: 'Car',
      tags: ['Seguridad Monitoreada', 'Acceso Directo', 'Gratuito'],
      activo: true
    },
    {
      id: 'srv_6',
      titulo: 'Ayuda Médica & Seguro',
      categoria: 'SALUD & SEGURIDAD',
      imagen: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
      descripcion: 'Área protegida con servicio de emergencia médica y botiquín de primeros auxilios ante cualquier eventualidad.',
      icono: 'HeartPulse',
      tags: ['Área Protegida', 'Servicio Urgencias', 'Primeros Auxilios'],
      activo: true
    },
    {
      id: 'srv_7',
      titulo: 'Alquiler de Paletas & Indumentaria',
      categoria: 'EQUIPAMIENTO',
      imagen: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80',
      descripcion: 'Equipamiento oficial de primeras marcas (Bullpadel, Head, Nox) y venta de accesorios para tu partido.',
      icono: 'Sparkles',
      tags: ['Paletas Pro', 'Tubos Presurizados', 'Grip Nuevo'],
      activo: true
    }
  ],
  eventos: [
    {
      id: 'ev_1',
      titulo: 'Gran Torneo Apertura Pádel 2026',
      categoria: '4ta a 7ma Caballeros y Damas',
      fecha: '12 al 14 de Septiembre',
      horario: 'Desde las 18:00 hs',
      estado: 'Inscripciones Abiertas',
      descripcion: 'Torneo de fin de semana con fase de grupos y llaves de eliminación directa. Premios en efectivo, indumentaria oficial y trofeos para campeones y subcampeones.',
      premio: '$ 250.000 en Premios + Trofeos',
      imagen: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
      whatsappContacto: '5491112345678',
      activo: true
    },
    {
      id: 'ev_2',
      titulo: 'Clínica Intensiva de Smash & Bandeja',
      categoria: 'Nivel Inicial e Intermedio',
      fecha: 'Sábado 19 de Septiembre',
      horario: '10:00 a 13:00 hs',
      estado: 'Últimos Cupos',
      descripcion: 'Entrenamiento técnico y táctico con profesores federados. Corrección de golpes de ataque, posicionamiento en pista y videoanálisis.',
      premio: 'Incluye hidratación y kit de entrenamiento',
      imagen: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80',
      whatsappContacto: '5491112345678',
      activo: true
    },
    {
      id: 'ev_3',
      titulo: 'Torneo Relámpago Fútbol 7 Nocturno',
      categoria: 'Libre Masculino (Equipos 7 a 10 jug.)',
      fecha: 'Viernes 25 de Septiembre',
      horario: 'Desde las 20:00 hs',
      estado: 'Inscripciones Abiertas',
      descripcion: 'Copa nocturna bajo iluminación LED. Mínimo 3 partidos garantizados por equipo, asado para el campeón y consumición incluida en el buffet.',
      premio: 'Copa Campeón + Asado completo para 10 personas',
      imagen: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
      whatsappContacto: '5491112345678',
      activo: true
    },
    {
      id: 'ev_4',
      titulo: 'CUMPLEAÑOS & EVENTOS INFANTILES',
      categoria: 'Eventos Sociales & Festejos',
      fecha: 'Todos los fines de semana',
      horario: 'Turnos de 3 a 4 hs',
      estado: 'Consultar Disponibilidad / Reservas Abiertas',
      descripcion: 'Festejá tu cumple en el complejo: uso de canchas de fútbol/pádel, espacio techado para pelotero, castillo inflable, mesa dulce, vajilla y coordinador deportivo.',
      premio: 'Incluye vajilla, coordinador deportivo y pelotero techado',
      imagen: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80',
      whatsappContacto: '5491112345678',
      activo: true
    }
  ],
  turnos: []
};

// Database helper functions
function loadDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      saveDatabase(DEFAULT_STATE);
      return DEFAULT_STATE;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(raw);
    
    if (!data.config) data.config = DEFAULT_STATE.config;
    if (!data.config.canchas) data.config.canchas = DEFAULT_STATE.config.canchas;
    if (!data.config.adminEmail) data.config.adminEmail = DEFAULT_STATE.config.adminEmail;
    if (!data.config.adminPassword) data.config.adminPassword = DEFAULT_STATE.config.adminPassword;
    if (!data.config.firebaseConfig) data.config.firebaseConfig = DEFAULT_STATE.config.firebaseConfig;
    if (!Array.isArray(data.turnos)) data.turnos = [];
    if (!Array.isArray(data.eventos)) data.eventos = DEFAULT_STATE.eventos;
    if (!Array.isArray(data.servicios)) data.servicios = DEFAULT_STATE.servicios;
    
    return data;
  } catch (error) {
    console.error('Error al leer base de datos, usando fallback:', error);
    return DEFAULT_STATE;
  }
}

function saveDatabase(data) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error al guardar en base de datos:', error);
    return false;
  }
}

let db = loadDatabase();

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatCurrency(amount, symbol = '$') {
  return `${symbol} ${Number(amount || 0).toLocaleString('es-AR')}`;
}

// ================= FIRESTORE CLOUD INTEGRATION (PERMANENTE EN RENDER) =================
const FIRESTORE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'complejo-padel-3';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents`;

function fsFieldsToJs(fields) {
  const res = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if (v.stringValue !== undefined) res[k] = v.stringValue;
    else if (v.integerValue !== undefined) res[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) res[k] = Number(v.doubleValue);
    else if (v.booleanValue !== undefined) res[k] = v.booleanValue;
    else if (v.arrayValue !== undefined) res[k] = (v.arrayValue.values || []).map(x => fsFieldsToJs({ val: x }).val);
    else if (v.mapValue !== undefined) res[k] = fsFieldsToJs(v.mapValue.fields);
    else res[k] = null;
  }
  return res;
}

function jsValToFs(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(jsValToFs) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = jsValToFs(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function fetchTurnosFromFirestoreCloud() {
  try {
    const res = await fetch(`${FIRESTORE_BASE_URL}/turnos?pageSize=300`);
    if (!res.ok) {
      console.warn(`[Firestore Cloud] Respuesta ${res.status} al consultar turnos`);
      return db.turnos || [];
    }
    const data = await res.json();
    const docs = (data.documents || []).map(doc => {
      const docId = doc.name.split('/').pop();
      return { id: docId, ...fsFieldsToJs(doc.fields) };
    });
    return docs;
  } catch (err) {
    console.warn('[Firestore Cloud] Error al leer turnos:', err.message);
    return db.turnos || [];
  }
}

async function saveTurnoToFirestoreCloud(turno) {
  try {
    const fields = {};
    for (const [k, v] of Object.entries(turno)) {
      fields[k] = jsValToFs(v);
    }
    const body = JSON.stringify({ fields });

    await Promise.all([
      fetch(`${FIRESTORE_BASE_URL}/turnos/${turno.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body
      }).catch(e => console.warn('[Firestore Cloud] Error guardando en /turnos:', e.message)),
      fetch(`${FIRESTORE_BASE_URL}/reservas/${turno.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body
      }).catch(e => console.warn('[Firestore Cloud] Error guardando en /reservas:', e.message))
    ]);

    console.log(`✓ [Firestore Cloud] Turno ${turno.id} persistido permanentemente en la nube`);
    return true;
  } catch (err) {
    console.error('[Firestore Cloud] Error al guardar turno:', err.message);
    return false;
  }
}

async function deleteTurnoFromFirestoreCloud(id) {
  try {
    await Promise.all([
      fetch(`${FIRESTORE_BASE_URL}/turnos/${id}`, { method: 'DELETE' }).catch(() => null),
      fetch(`${FIRESTORE_BASE_URL}/reservas/${id}`, { method: 'DELETE' }).catch(() => null)
    ]);
    console.log(`✓ [Firestore Cloud] Turno ${id} eliminado de la nube`);
    return true;
  } catch (err) {
    console.error('[Firestore Cloud] Error al eliminar turno:', err.message);
    return false;
  }
}

async function updateTurnoInFirestoreCloud(id, patchFields) {
  try {
    const fields = {};
    for (const [k, v] of Object.entries(patchFields)) {
      fields[k] = jsValToFs(v);
    }
    const body = JSON.stringify({ fields });

    await Promise.all([
      fetch(`${FIRESTORE_BASE_URL}/turnos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body
      }).catch(() => null),
      fetch(`${FIRESTORE_BASE_URL}/reservas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body
      }).catch(() => null)
    ]);
    console.log(`✓ [Firestore Cloud] Turno ${id} actualizado en la nube`);
    return true;
  } catch (err) {
    console.error('[Firestore Cloud] Error al actualizar turno:', err.message);
    return false;
  }
}

// ================= ADMIN ROUTING =================
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ================= API ENDPOINTS =================

// 1. GET /api/config
app.get('/api/config', (req, res) => {
  const publicConfig = { ...db.config };
  res.json({
    success: true,
    config: {
      ...publicConfig,
      adminPassword: undefined // Never leak raw password
    }
  });
});

// 2. PUT /api/config (Update configuration & courts with prices)
app.put('/api/config', (req, res) => {
  const { nombre, subtitulo, direccion, maps, whatsapp, horaInicio, horaFin, diasActivos, adminEmail, adminPassword, canchas } = req.body;

  if (nombre) db.config.nombre = String(nombre).trim();
  if (subtitulo !== undefined) db.config.subtitulo = String(subtitulo).trim();
  if (direccion !== undefined) db.config.direccion = String(direccion).trim();
  if (maps !== undefined) db.config.maps = String(maps).trim();
  if (whatsapp !== undefined) db.config.whatsapp = String(whatsapp).trim();
  if (horaInicio) db.config.horaInicio = horaInicio;
  if (horaFin) db.config.horaFin = horaFin;
  if (adminEmail) db.config.adminEmail = String(adminEmail).trim();
  if (adminPassword && String(adminPassword).trim().length >= 6) {
    db.config.adminPassword = String(adminPassword).trim();
  }
  if (Array.isArray(diasActivos)) db.config.diasActivos = diasActivos.map(Number);

  if (Array.isArray(canchas)) {
    db.config.canchas = canchas.map((c, i) => ({
      id: c.id || `c_${Date.now()}_${i}`,
      deporte: (c.deporte === 'padel' || c.deporte === 'futbol') ? c.deporte : 'padel',
      nombre: String(c.nombre || `Cancha ${i + 1}`).trim(),
      ubicacion: (c.ubicacion === 'exterior' || c.ubicacion === 'interior') ? c.ubicacion : 'interior',
      superficie: String(c.superficie || 'Césped Sintético').trim(),
      jugadores: Number(c.jugadores) || (c.deporte === 'padel' ? 4 : 5),
      precio: Number(c.precio) >= 0 ? Number(c.precio) : 20000
    }));
  }

  saveDatabase(db);

  res.json({
    success: true,
    message: 'Configuración guardada exitosamente.',
    config: {
      ...db.config,
      adminPassword: undefined
    }
  });
});

// 3. POST /api/admin/login (Verify Admin Email & Password)
app.post('/api/admin/login', (req, res) => {
  const { email, password, firebaseUid } = req.body;

  // If verified by Firebase on client with valid UID
  if (firebaseUid && email) {
    return res.json({
      success: true,
      message: 'Autenticación con Firebase exitosa.',
      isAuthorized: true,
      user: { email, uid: firebaseUid }
    });
  }

  const registeredEmail = (db.config.adminEmail || 'admin@complejopadel3.com').toLowerCase();
  const registeredPassword = db.config.adminPassword || 'admin1234';

  if (email && String(email).trim().toLowerCase() === registeredEmail && String(password) === registeredPassword) {
    return res.json({
      success: true,
      message: 'Inicio de sesión de administrador exitoso.',
      isAuthorized: true,
      user: {
        email: registeredEmail,
        uid: 'admin_local_session'
      }
    });
  }

  res.status(401).json({
    success: false,
    message: 'Email o contraseña incorrectos. Verificá tus credenciales de Firebase.',
    isAuthorized: false
  });
});

// 4. GET /api/canchas
app.get('/api/canchas', (req, res) => {
  const { deporte, ubicacion } = req.query;
  let canchas = [...(db.config.canchas || [])];

  if (deporte && deporte !== 'todos') {
    canchas = canchas.filter(c => c.deporte === deporte);
  }
  if (ubicacion && ubicacion !== 'todos') {
    canchas = canchas.filter(c => c.ubicacion === ubicacion);
  }

  res.json({ success: true, canchas });
});

// Helper: get all 1-hour slots covered by a booking
function getHorasCubiertas(horaInicioStr, duracionHoras = 1) {
  const [hStr, mStr] = horaInicioStr.split(':').map(Number);
  const slots = [];
  for (let i = 0; i < duracionHoras; i++) {
    const hh = (hStr + i) % 24;
    slots.push(`${pad2(hh)}:${pad2(mStr || 0)}`);
  }
  return slots;
}

// 5. GET /api/turnos (Lee directamente desde Firestore Cloud permanente)
app.get('/api/turnos', async (req, res) => {
  try {
    const { fecha, canchaId, deporte } = req.query;
    let list = await fetchTurnosFromFirestoreCloud();

    if (list && list.length > 0) {
      db.turnos = list;
    } else {
      list = db.turnos || [];
    }

    if (fecha) {
      list = list.filter(t => t.fecha === fecha);
    }
    if (canchaId) {
      list = list.filter(t => t.canchaId === canchaId);
    }
    if (deporte) {
      list = list.filter(t => (t.deporte || '').toLowerCase() === deporte.toLowerCase());
    }

    list.sort((a, b) => {
      const fechaA = String(a?.fecha || a?.dia || '');
      const fechaB = String(b?.fecha || b?.dia || '');
      const fechaComp = fechaA.localeCompare(fechaB);
      if (fechaComp !== 0) return fechaComp;

      const horaA = String(a?.horario || a?.hora || '');
      const horaB = String(b?.horario || b?.hora || '');
      return horaA.localeCompare(horaB);
    });

    res.json({ success: true, turnos: list });
  } catch (err) {
    console.error('Error en GET /api/turnos:', err);
    res.json({ success: true, turnos: db.turnos || [] });
  }
});

// 6. POST /api/turnos (Crea y persiste en Firestore Cloud en las colecciones 'turnos' y 'reservas')
app.post('/api/turnos', async (req, res) => {
  try {
    const { canchaId, fecha, hora, nombre, whatsapp, equipo, duracion } = req.body;

    if (!canchaId || !fecha || !hora || !nombre || !String(nombre).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos obligatorios para la reserva (cancha, fecha, horario y nombre).'
      });
    }

    const cancha = (db.config.canchas || []).find(c => c.id === canchaId);
    if (!cancha) {
      return res.status(404).json({ success: false, message: 'La cancha seleccionada no existe.' });
    }

    const duracionHoras = Number(duracion) === 2 ? 2 : 1;
    const horasRequeridas = getHorasCubiertas(hora, duracionHoras);

    const [hIniReq, mIniReq] = hora.split(':').map(Number);
    const finReqMin = (hIniReq + duracionHoras) * 60 + (mIniReq || 0);
    let [hCierre, mCierre] = (db.config.horaFin || '24:00').split(':').map(Number);
    if (hCierre === 0 && mCierre === 0) hCierre = 24;
    const cierreMin = hCierre * 60 + (mCierre || 0);

    if (finReqMin > cierreMin) {
      return res.status(400).json({
        success: false,
        message: `El turno de ${duracionHoras}hs excede el horario de cierre del complejo (${db.config.horaFin || '24:00'} hs).`
      });
    }

    // Consultar turnos frescos desde Firestore para asegurar persistencia y evitar conflictos
    const todosTurnos = await fetchTurnosFromFirestoreCloud();
    const turnosExistentes = todosTurnos.filter(t => {
      const mismaCancha = t.canchaId === canchaId || (t.canchaNombre && t.canchaNombre === cancha.nombre);
      const mismaFecha = t.fecha === fecha;
      const activo = String(t.estado || '').toLowerCase() !== 'cancelado' && String(t.estado || '').toLowerCase() !== 'liberado';
      return mismaCancha && mismaFecha && activo;
    });

    const horasOcupadas = new Set();
    turnosExistentes.forEach(t => {
      const cubiertas = getHorasCubiertas(t.hora || t.horario, t.duracion || 1);
      cubiertas.forEach(h => horasOcupadas.add(h));
    });

    const hayConflicto = horasRequeridas.some(h => horasOcupadas.has(h));
    if (hayConflicto) {
      return res.status(409).json({
        success: false,
        message: `Uno o más horarios para este turno (${duracionHoras === 2 ? 'Turno doble de 2hs' : 'Turno de 1h'}) ya se encuentran ocupados. Por favor elegí otro horario.`
      });
    }

    const precioUnitario = Number(cancha.precio) >= 0 ? Number(cancha.precio) : 20000;
    const precioTotal = precioUnitario * duracionHoras;

    const [hStr, mStr] = hora.split(':').map(Number);
    const nextH = (hStr + duracionHoras) % 24;
    const horaFinCalculada = `${pad2(nextH)}:${pad2(mStr || 0)}`;

    const nuevoTurno = {
      id: `turno_${canchaId}_${fecha.replace(/-/g, '')}_${hora.replace(':', '')}_${Date.now()}`,
      canchaId: cancha.id,
      canchaNombre: cancha.nombre,
      deporte: cancha.deporte,
      ubicacion: cancha.ubicacion,
      superficie: cancha.superficie,
      jugadores: cancha.jugadores,
      fecha,
      hora,
      horaFin: horaFinCalculada,
      duracion: duracionHoras,
      horasCubiertas: horasRequeridas,
      nombre: String(nombre).trim(),
      whatsapp: whatsapp ? String(whatsapp).trim() : '',
      equipo: equipo ? String(equipo).trim() : '',
      precioUnitario: precioUnitario,
      precio: precioTotal,
      precioFormateado: formatCurrency(precioTotal, db.config.monedaSimbolo || '$'),
      confirmado: false,
      estado: 'pendiente',
      ts: Date.now()
    };

    // Guardar permanentemente en Firestore Cloud
    await saveTurnoToFirestoreCloud(nuevoTurno);

    // Actualizar cache local
    if (!Array.isArray(db.turnos)) db.turnos = [];
    db.turnos.push(nuevoTurno);
    saveDatabase(db);

    res.status(201).json({
      success: true,
      message: `Turno de ${duracionHoras} hora(s) reservado exitosamente.`,
      turno: nuevoTurno
    });
  } catch (error) {
    console.error('Error en POST /api/turnos:', error);
    res.status(500).json({ success: false, message: 'Error interno al procesar la reserva.' });
  }
});

// 7. DELETE /api/turnos/:id (Cancela y elimina de Firestore Cloud permanente)
app.delete('/api/turnos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteTurnoFromFirestoreCloud(id);

    let eliminado = null;
    if (Array.isArray(db.turnos)) {
      const index = db.turnos.findIndex(t => t.id === id);
      if (index !== -1) {
        [eliminado] = db.turnos.splice(index, 1);
        saveDatabase(db);
      }
    }

    res.json({
      success: true,
      message: `Turno cancelado y liberado permanentemente.`,
      turno: eliminado || { id }
    });
  } catch (error) {
    console.error('Error en DELETE /api/turnos/:id:', error);
    res.status(500).json({ success: false, message: 'Error al cancelar turno.' });
  }
});

// 8. PATCH /api/turnos/:id/confirmar (Confirma permanentemente en Firestore Cloud)
app.patch('/api/turnos/:id/confirmar', async (req, res) => {
  try {
    const { id } = req.params;
    await updateTurnoInFirestoreCloud(id, { confirmado: true, estado: 'confirmado' });

    let turno = null;
    if (Array.isArray(db.turnos)) {
      turno = db.turnos.find(t => t.id === id);
      if (turno) {
        turno.confirmado = true;
        turno.estado = 'confirmado';
        saveDatabase(db);
      }
    }

    res.json({ success: true, message: 'Turno marcado como confirmado permanentemente.', turno });
  } catch (error) {
    console.error('Error en PATCH /api/turnos/:id/confirmar:', error);
    res.status(500).json({ success: false, message: 'Error al confirmar turno.' });
  }
});

// 9. GET /api/metrics
app.get('/api/metrics', (req, res) => {
  const hoyISO = new Date().toISOString().split('T')[0];
  const turnosHoy = (db.turnos || []).filter(t => t.fecha === hoyISO);
  const turnosFuturos = (db.turnos || []).filter(t => t.fecha >= hoyISO);

  const canchas = db.config.canchas || [];
  const canchasPadel = canchas.filter(c => c.deporte === 'padel').length;
  const canchasFutbol = canchas.filter(c => c.deporte === 'futbol').length;
  const canchasInterior = canchas.filter(c => c.ubicacion === 'interior').length;
  const canchasExterior = canchas.filter(c => c.ubicacion === 'exterior').length;

  const ingresosHoy = turnosHoy.reduce((acc, t) => acc + (Number(t.precio) || 0), 0);
  const ingresosProyectados = turnosFuturos.reduce((acc, t) => acc + (Number(t.precio) || 0), 0);
  const ingresosTotalAcumulado = (db.turnos || []).reduce((acc, t) => acc + (Number(t.precio) || 0), 0);

  res.json({
    success: true,
    metrics: {
      totalCanchas: canchas.length,
      canchasPadel,
      canchasFutbol,
      canchasInterior,
      canchasExterior,
      turnosHoy: turnosHoy.length,
      turnosFuturos: turnosFuturos.length,
      turnosTotal: (db.turnos || []).length,
      ingresosHoy,
      ingresosHoyFormateado: formatCurrency(ingresosHoy, db.config.monedaSimbolo || '$'),
      ingresosProyectados,
      ingresosProyectadosFormateado: formatCurrency(ingresosProyectados, db.config.monedaSimbolo || '$'),
      ingresosTotalAcumulado,
      ingresosTotalAcumuladoFormateado: formatCurrency(ingresosTotalAcumulado, db.config.monedaSimbolo || '$')
    }
  });
});

// 10. GET /api/eventos
app.get('/api/eventos', (req, res) => {
  res.json({
    success: true,
    eventos: db.eventos || []
  });
});

// 11. POST /api/eventos
app.post('/api/eventos', (req, res) => {
  const { titulo, categoria, fecha, horario, estado, descripcion, premio, imagen, whatsappContacto, activo } = req.body;

  if (!titulo || !fecha) {
    return res.status(400).json({ success: false, message: 'El título y la fecha del evento son obligatorios.' });
  }

  const nuevoEvento = {
    id: `ev_${Date.now()}`,
    titulo: String(titulo).trim(),
    categoria: String(categoria || 'Libre').trim(),
    fecha: String(fecha).trim(),
    horario: String(horario || 'A confirmar').trim(),
    estado: String(estado || 'Inscripciones Abiertas').trim(),
    descripcion: String(descripcion || '').trim(),
    premio: String(premio || '').trim(),
    imagen: String(imagen || 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80').trim(),
    whatsappContacto: String(whatsappContacto || db.config.whatsapp || '').trim(),
    activo: activo !== undefined ? Boolean(activo) : true,
    ts: Date.now()
  };

  if (!Array.isArray(db.eventos)) db.eventos = [];
  db.eventos.unshift(nuevoEvento);
  saveDatabase(db);

  res.status(201).json({
    success: true,
    message: 'Evento creado exitosamente.',
    evento: nuevoEvento
  });
});

// 12. PUT /api/eventos/:id
app.put('/api/eventos/:id', (req, res) => {
  const { id } = req.params;
  const evento = (db.eventos || []).find(e => e.id === id);

  if (!evento) {
    return res.status(404).json({ success: false, message: 'Evento no encontrado.' });
  }

  const { titulo, categoria, fecha, horario, estado, descripcion, premio, imagen, whatsappContacto, activo } = req.body;

  if (titulo !== undefined) evento.titulo = String(titulo).trim();
  if (categoria !== undefined) evento.categoria = String(categoria).trim();
  if (fecha !== undefined) evento.fecha = String(fecha).trim();
  if (horario !== undefined) evento.horario = String(horario).trim();
  if (estado !== undefined) evento.estado = String(estado).trim();
  if (descripcion !== undefined) evento.descripcion = String(descripcion).trim();
  if (premio !== undefined) evento.premio = String(premio).trim();
  if (imagen !== undefined) evento.imagen = String(imagen).trim();
  if (whatsappContacto !== undefined) evento.whatsappContacto = String(whatsappContacto).trim();
  if (activo !== undefined) evento.activo = Boolean(activo);

  saveDatabase(db);

  res.json({
    success: true,
    message: 'Evento actualizado exitosamente.',
    evento
  });
});

// 13. DELETE /api/eventos/:id
app.delete('/api/eventos/:id', (req, res) => {
  const { id } = req.params;
  const idx = (db.eventos || []).findIndex(e => e.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Evento no encontrado.' });
  }

  const [eliminado] = db.eventos.splice(idx, 1);
  saveDatabase(db);

  res.json({
    success: true,
    message: `Evento "${eliminado.titulo}" eliminado exitosamente.`,
    evento: eliminado
  });
});

// 14. GET /api/servicios
app.get('/api/servicios', (req, res) => {
  res.json({
    success: true,
    servicios: db.servicios || []
  });
});

// 15. POST /api/servicios
app.post('/api/servicios', (req, res) => {
  const { titulo, descripcion, icono, categoria, imagen, tags, activo } = req.body;

  if (!titulo || !descripcion) {
    return res.status(400).json({ success: false, message: 'El título y descripción del servicio son obligatorios.' });
  }

  const nuevoServicio = {
    id: `srv_${Date.now()}`,
    titulo: String(titulo).trim(),
    descripcion: String(descripcion).trim(),
    icono: String(icono || 'Trophy').trim(),
    categoria: String(categoria || 'SERVICIO').trim(),
    imagen: String(imagen || 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80').trim(),
    tags: Array.isArray(tags) ? tags.map(t => String(t).trim()) : [],
    activo: activo !== undefined ? Boolean(activo) : true
  };

  if (!Array.isArray(db.servicios)) db.servicios = [];
  db.servicios.push(nuevoServicio);
  saveDatabase(db);

  res.status(201).json({
    success: true,
    message: 'Servicio creado exitosamente.',
    servicio: nuevoServicio
  });
});

// 16. PUT /api/servicios/:id
app.put('/api/servicios/:id', (req, res) => {
  const { id } = req.params;
  const srv = (db.servicios || []).find(s => s.id === id);

  if (!srv) {
    return res.status(404).json({ success: false, message: 'Servicio no encontrado.' });
  }

  const { titulo, descripcion, icono, categoria, imagen, tags, activo } = req.body;

  if (titulo !== undefined) srv.titulo = String(titulo).trim();
  if (descripcion !== undefined) srv.descripcion = String(descripcion).trim();
  if (icono !== undefined) srv.icono = String(icono).trim();
  if (categoria !== undefined) srv.categoria = String(categoria).trim();
  if (imagen !== undefined) srv.imagen = String(imagen).trim();
  if (Array.isArray(tags)) srv.tags = tags.map(t => String(t).trim());
  if (activo !== undefined) srv.activo = Boolean(activo);

  saveDatabase(db);

  res.json({
    success: true,
    message: 'Servicio actualizado exitosamente.',
    servicio: srv
  });
});

// 17. DELETE /api/servicios/:id
app.delete('/api/servicios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!Array.isArray(db.servicios)) db.servicios = [];
    const idx = db.servicios.findIndex(s => s.id === id);

    if (idx !== -1) {
      db.servicios.splice(idx, 1);
      saveDatabase(db);
    }

    return res.json({
      success: true,
      message: 'Servicio eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    return res.status(500).json({ error: 'Error al eliminar el servicio' });
  }
});

// Start Express Server
app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🎾 COMPLEJO PADEL 3 - Backend Moderno iniciado`);
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`🛡️ Panel de Administración en http://localhost:${PORT}/admin`);
  console.log(`☁️ Conectando con Firestore Cloud (proyecto: ${FIRESTORE_PROJECT_ID})...`);

  try {
    const firestoreTurnos = await fetchTurnosFromFirestoreCloud();
    if (firestoreTurnos && firestoreTurnos.length > 0) {
      db.turnos = firestoreTurnos;
      console.log(`✓ [Firestore Cloud] ${firestoreTurnos.length} reservas activas sincronizadas permanentemente`);
    } else {
      console.log(`ℹ️ [Firestore Cloud] Conexión establecida. Listo para recibir reservas.`);
    }
  } catch (e) {
    console.warn('Aviso inicializando Firestore Cloud:', e.message);
  }
  console.log(`=======================================================`);
});
