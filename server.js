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
    direccion: 'Av. del Deporte 1500, Complejo Deportivo',
    maps: 'https://maps.google.com',
    whatsapp: '5491112345678',
    horaInicio: '14:00',
    horaFin: '24:00',
    diasActivos: [1, 2, 3, 4, 5, 6, 0], // Lunes a Domingo
    pin: '',
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
    
    // Ensure all required properties exist
    if (!data.config) data.config = DEFAULT_STATE.config;
    if (!data.config.canchas) data.config.canchas = DEFAULT_STATE.config.canchas;
    if (!Array.isArray(data.turnos)) data.turnos = [];
    
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

// In-memory caching with persistent file sync
let db = loadDatabase();

// Helper functions
function pad2(n) {
  return String(n).padStart(2, '0');
}

// Format currency
function formatCurrency(amount, symbol = '$') {
  return `${symbol} ${Number(amount || 0).toLocaleString('es-AR')}`;
}

// ================= API ENDPOINTS =================

// 1. GET /api/config
app.get('/api/config', (req, res) => {
  const publicConfig = { ...db.config };
  // Return boolean whether PIN is configured, but don't leak the raw PIN to public
  const hasPin = Boolean(publicConfig.pin && publicConfig.pin.length >= 4);
  res.json({
    success: true,
    config: {
      ...publicConfig,
      hasPin,
      pin: undefined // Omit for security
    }
  });
});

// 2. PUT /api/config (Update configuration & courts with prices)
app.put('/api/config', (req, res) => {
  const { nombre, subtitulo, direccion, maps, whatsapp, horaInicio, horaFin, diasActivos, pin, canchas, pinAdminAuth } = req.body;
  
  // If PIN exists, require validation
  if (db.config.pin && db.config.pin !== pinAdminAuth) {
    return res.status(401).json({ success: false, message: 'PIN de administrador incorrecto.' });
  }

  if (nombre) db.config.nombre = String(nombre).trim();
  if (subtitulo !== undefined) db.config.subtitulo = String(subtitulo).trim();
  if (direccion !== undefined) db.config.direccion = String(direccion).trim();
  if (maps !== undefined) db.config.maps = String(maps).trim();
  if (whatsapp !== undefined) db.config.whatsapp = String(whatsapp).trim();
  if (horaInicio) db.config.horaInicio = horaInicio;
  if (horaFin) db.config.horaFin = horaFin;
  if (Array.isArray(diasActivos)) db.config.diasActivos = diasActivos.map(Number);
  if (pin && pin.length >= 4) db.config.pin = String(pin).trim();

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
      hasPin: Boolean(db.config.pin),
      pin: undefined
    }
  });
});

// 3. POST /api/admin/auth (Verify or set admin PIN)
app.post('/api/admin/auth', (req, res) => {
  const { pin, action } = req.body;

  // Initial setup: activate PIN
  if (action === 'setup') {
    if (!pin || String(pin).trim().length < 4) {
      return res.status(400).json({ success: false, message: 'El PIN debe tener al menos 4 dígitos.' });
    }
    db.config.pin = String(pin).trim();
    saveDatabase(db);
    return res.json({ success: true, message: 'PIN activado correctamente.', isAuthorized: true });
  }

  // Regular login verification
  if (!db.config.pin) {
    return res.json({ success: true, message: 'No hay PIN configurado.', isAuthorized: true });
  }

  if (db.config.pin === String(pin).trim()) {
    return res.json({ success: true, message: 'PIN correcto.', isAuthorized: true });
  } else {
    return res.status(401).json({ success: false, message: 'PIN incorrecto.', isAuthorized: false });
  }
});

// 3b. POST /api/admin/recuperar-pin (Recover admin PIN via configured WhatsApp)
app.post('/api/admin/recuperar-pin', (req, res) => {
  if (!db.config.pin) {
    return res.status(400).json({
      success: false,
      message: 'Todavía no se ha configurado ningún PIN de administrador. Podés definir uno nuevo.'
    });
  }

  const phone = db.config.whatsapp ? String(db.config.whatsapp).replace(/\D/g, '') : '';
  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'No hay un número de WhatsApp de contacto registrado en la configuración para enviar el PIN.'
    });
  }

  const mensaje = 
`*RECUPERACIÓN DE CLAVE - ${db.config.nombre || 'COMPLEJO PADEL 3'}*

Hola! Solicitaste la recuperación del PIN de Administrador.
🔐 Tu PIN actual de acceso es: *${db.config.pin}*

Podés ingresar al panel de control y cambiarlo en cualquier momento si lo deseás.`;

  res.json({
    success: true,
    whatsapp: phone,
    pin: db.config.pin,
    mensaje,
    whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`
  });
});

// 4. GET /api/canchas
app.get('/api/canchas', (req, res) => {
  const { deporte, ubicacion } = req.query;
  let canchas = [...db.config.canchas];

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

// 5. GET /api/turnos
app.get('/api/turnos', (req, res) => {
  const { fecha, canchaId, deporte } = req.query;
  let list = [...db.turnos];

  if (fecha) {
    list = list.filter(t => t.fecha === fecha);
  }
  if (canchaId) {
    list = list.filter(t => t.canchaId === canchaId);
  }
  if (deporte) {
    list = list.filter(t => t.deporte === deporte);
  }

  // Sort chronologically
  list.sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    return a.hora.localeCompare(b.hora);
  });

  res.json({ success: true, turnos: list });
});

// 6. POST /api/turnos (Create booking with 1h or 2h duration, price computation & collision check)
app.post('/api/turnos', (req, res) => {
  const { canchaId, fecha, hora, nombre, whatsapp, equipo, duracion } = req.body;

  if (!canchaId || !fecha || !hora || !nombre || !String(nombre).trim()) {
    return res.status(400).json({
      success: false,
      message: 'Faltan datos obligatorios para la reserva (cancha, fecha, horario y nombre).'
    });
  }

  const cancha = db.config.canchas.find(c => c.id === canchaId);
  if (!cancha) {
    return res.status(404).json({ success: false, message: 'La cancha seleccionada no existe.' });
  }

  const duracionHoras = Number(duracion) === 2 ? 2 : 1;
  const horasRequeridas = getHorasCubiertas(hora, duracionHoras);

  // Check business hours closing limit
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

  // Collect all occupied hours for this court on this date
  const turnosExistentes = db.turnos.filter(t => t.canchaId === canchaId && t.fecha === fecha);
  const horasOcupadas = new Set();

  turnosExistentes.forEach(t => {
    const cubiertas = getHorasCubiertas(t.hora, t.duracion || 1);
    cubiertas.forEach(h => horasOcupadas.add(h));
  });

  // Check if any of the required slots are occupied
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
    ts: Date.now()
  };

  db.turnos.push(nuevoTurno);
  saveDatabase(db);

  res.status(201).json({
    success: true,
    message: `Turno de ${duracionHoras} hora(s) reservado exitosamente.`,
    turno: nuevoTurno
  });
});

// 7. DELETE /api/turnos/:id (Cancel booking)
app.delete('/api/turnos/:id', (req, res) => {
  const { id } = req.params;
  const { pinAdminAuth } = req.body || {};

  // If PIN is active, require verification
  if (db.config.pin && db.config.pin !== pinAdminAuth) {
    // Check if auth token passed in header
    const authHeader = req.headers['x-admin-pin'];
    if (authHeader !== db.config.pin) {
      return res.status(401).json({ success: false, message: 'No autorizado para cancelar turnos.' });
    }
  }

  const index = db.turnos.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
  }

  const [eliminado] = db.turnos.splice(index, 1);
  saveDatabase(db);

  res.json({
    success: true,
    message: `Turno de ${eliminado.nombre} cancelado. La cancha quedó libre.`,
    turno: eliminado
  });
});

// 8. PATCH /api/turnos/:id/confirmar
app.patch('/api/turnos/:id/confirmar', (req, res) => {
  const { id } = req.params;
  const turno = db.turnos.find(t => t.id === id);
  if (!turno) {
    return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
  }

  turno.confirmado = true;
  saveDatabase(db);

  res.json({ success: true, message: 'Turno marcado como confirmado.', turno });
});

// 9. GET /api/metrics (Financial and occupancy dashboard stats)
app.get('/api/metrics', (req, res) => {
  const hoyISO = new Date().toISOString().split('T')[0];
  const turnosHoy = db.turnos.filter(t => t.fecha === hoyISO);
  const turnosFuturos = db.turnos.filter(t => t.fecha >= hoyISO);

  const canchasPadel = db.config.canchas.filter(c => c.deporte === 'padel').length;
  const canchasFutbol = db.config.canchas.filter(c => c.deporte === 'futbol').length;
  const canchasInterior = db.config.canchas.filter(c => c.ubicacion === 'interior').length;
  const canchasExterior = db.config.canchas.filter(c => c.ubicacion === 'exterior').length;

  const ingresosHoy = turnosHoy.reduce((acc, t) => acc + (Number(t.precio) || 0), 0);
  const ingresosProyectados = turnosFuturos.reduce((acc, t) => acc + (Number(t.precio) || 0), 0);

  res.json({
    success: true,
    metrics: {
      totalCanchas: db.config.canchas.length,
      canchasPadel,
      canchasFutbol,
      canchasInterior,
      canchasExterior,
      turnosHoy: turnosHoy.length,
      turnosFuturos: turnosFuturos.length,
      turnosTotal: db.turnos.length,
      ingresosHoy,
      ingresosHoyFormateado: formatCurrency(ingresosHoy, db.config.monedaSimbolo || '$'),
      ingresosProyectados,
      ingresosProyectadosFormateado: formatCurrency(ingresosProyectados, db.config.monedaSimbolo || '$')
    }
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎾 COMPLEJO PADEL 3 - Backend Moderno iniciado`);
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📁 Base de datos persistente: ${DB_FILE}`);
  console.log(`=======================================================`);
});
