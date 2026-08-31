const assert = require('assert');

async function runTests() {
  console.log('🧪 Iniciando batería de pruebas para COMPLEJO PADEL 3...');
  const baseUrl = 'http://localhost:3000';

  // 1. Static files & Routes
  console.log('\n1. Verificando archivos estáticos y rutas...');
  const rIndex = await fetch(`${baseUrl}/`);
  assert.strictEqual(rIndex.status, 200, 'index.html debe responder 200');
  const indexHtml = await rIndex.text();
  assert(indexHtml.includes('COMPLEJO PADEL 3'), 'index.html debe contener el título del complejo');
  assert(indexHtml.includes('assets/logo.png'), 'index.html debe incluir el logo oficial');
  assert(!indexHtml.includes('Modo Administrador'), 'index.html NO debe mostrar botón de administrador visible');

  const rAdmin = await fetch(`${baseUrl}/admin`);
  assert.strictEqual(rAdmin.status, 200, '/admin debe responder 200');
  const adminHtml = await rAdmin.text();
  assert(adminHtml.includes('Panel de Administración CMS'), 'admin.html debe ser servido en /admin');
  assert(adminHtml.includes('firebase-auth-compat.js'), 'admin.html debe incluir Firebase Auth SDK');

  const rLogo = await fetch(`${baseUrl}/assets/logo.png`);
  assert.strictEqual(rLogo.status, 200, 'logo.png debe responder 200');

  const rReservasPage = await fetch(`${baseUrl}/reservas.html`);
  assert.strictEqual(rReservasPage.status, 200, 'reservas.html debe responder 200');
  const reservasHtml = await rReservasPage.text();
  assert(reservasHtml.includes('¿Cómo Reservar? - Es muy fácil'), 'reservas.html debe incluir el instructivo');
  assert(reservasHtml.includes('canchas-booking-grid'), 'reservas.html debe contener la grilla de turnos');
  console.log('✓ Rutas /, /reservas.html, /admin y recursos estáticos cargados correctamente');

  // 2. Config API
  console.log('\n2. Verificando API de Configuración...');
  const rConfig = await fetch(`${baseUrl}/api/config`);
  const dConfig = await rConfig.json();
  assert(dConfig.success, 'GET /api/config debe ser exitoso');
  assert(dConfig.config.canchas.length >= 6, 'Debe haber al menos 6 canchas configuradas');
  console.log(`✓ Configuración cargada: ${dConfig.config.nombre} con ${dConfig.config.canchas.length} canchas`);

  // 3. Servicios & Eventos API
  console.log('\n3. Verificando APIs de Servicios y Eventos...');
  const rServicios = await fetch(`${baseUrl}/api/servicios`);
  const dServicios = await rServicios.json();
  assert(dServicios.success, 'GET /api/servicios debe ser exitoso');
  assert(dServicios.servicios.length >= 4, 'Debe haber servicios cargados');
  const srvCumple = dServicios.servicios.find(s => s.titulo.includes('Cumpleaños'));
  assert(srvCumple, 'Debe existir el servicio de Cumpleaños & Pelotero');
  console.log(`✓ Servicios cargados: ${dServicios.servicios.length} servicios disponibles (incluye Cumpleaños & Pelotero)`);

  const rEventos = await fetch(`${baseUrl}/api/eventos`);
  const dEventos = await rEventos.json();
  assert(dEventos.success, 'GET /api/eventos debe ser exitoso');
  assert(dEventos.eventos.length >= 2, 'Debe haber eventos cargados');
  const evCumple = dEventos.eventos.find(e => e.titulo.includes('CUMPLEAÑOS'));
  assert(evCumple, 'Debe existir el evento de Cumpleaños Infantiles');
  console.log(`✓ Eventos cargados: ${dEventos.eventos.length} torneos/eventos disponibles (incluye Cumpleaños Infantiles)`);

  // 4. Canchas filtering (Pádel vs Fútbol, Exterior vs Interior)
  console.log('\n4. Verificando filtros de deporte y ubicación...');
  const rPadel = await fetch(`${baseUrl}/api/canchas?deporte=padel`);
  const dPadel = await rPadel.json();
  assert(dPadel.canchas.every(c => c.deporte === 'padel'), 'Todas las canchas devueltas deben ser de Pádel');
  console.log(`✓ Filtro Pádel: ${dPadel.canchas.length} pistas encontradas`);

  const rFutbol = await fetch(`${baseUrl}/api/canchas?deporte=futbol`);
  const dFutbol = await rFutbol.json();
  assert(dFutbol.canchas.every(c => c.deporte === 'futbol'), 'Todas las canchas devueltas deben ser de Fútbol');
  console.log(`✓ Filtro Fútbol: ${dFutbol.canchas.length} canchas encontradas`);

  // 5. Crear reserva de Pádel de 2 Horas (Doble Turno)
  console.log('\n5. Creando reserva de Pádel de 2 Horas con cálculo de precio...');
  const testFecha = `2026-10-${String(Math.floor(Math.random() * 15) + 10).padStart(2, '0')}`;
  const rReservaPadel2h = await fetch(`${baseUrl}/api/turnos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canchaId: 'c1', // Pista 1 - Cristal Pro ($24.000)
      fecha: testFecha,
      hora: '18:00',
      duracion: 2,
      nombre: 'Fernando Belasteguín',
      whatsapp: '1133445566',
      equipo: 'Los Reyes del Pádel'
    })
  });
  const dReservaPadel2h = await rReservaPadel2h.json();
  assert(dReservaPadel2h.success, 'La reserva de Pádel 2hs debe ser exitosa');
  assert.strictEqual(dReservaPadel2h.turno.duracion, 2, 'La duración debe ser 2 horas');
  assert.strictEqual(dReservaPadel2h.turno.precio, 48000, 'El precio debe ser $48.000 (2 x $24.000)');
  console.log(`✓ Turno doble creado: ${dReservaPadel2h.turno.nombre} por ${dReservaPadel2h.turno.precioFormateado}`);

  // 6. Validar colisión
  console.log('\n6. Validando prevención de colisión en slot cubierto...');
  const rColision = await fetch(`${baseUrl}/api/turnos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canchaId: 'c1',
      fecha: testFecha,
      hora: '19:00',
      duracion: 1,
      nombre: 'Jugador Intento Duplicado'
    })
  });
  assert.strictEqual(rColision.status, 409, 'Debe devolver código 409 Conflict');
  console.log('✓ Prevención de colisión validada correctamente (HTTP 409 Conflict)');

  // 7. Auth Firebase Email y Contraseña & Cancelación de Turno
  console.log('\n7. Validando inicio de sesión con Email y Contraseña (Firebase)...');
  const rAuth = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@complejopadel3.com',
      password: 'admin1234'
    })
  });
  const dAuth = await rAuth.json();
  assert(dAuth.success && dAuth.isAuthorized, 'Login con email y contraseña debe ser exitoso');
  console.log(`✓ Autenticación de admin exitosa para: ${dAuth.user.email}`);

  const rDelete = await fetch(`${baseUrl}/api/turnos/${dReservaPadel2h.turno.id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  const dDelete = await rDelete.json();
  assert(dDelete.success, 'Cancelación de turno debe ser exitosa');
  console.log('✓ Cancelación y liberación de cancha validada correctamente');

  // 8. Edición de Eventos y Servicios API
  console.log('\n8. Validando endpoints de edición (PUT) para Eventos y Servicios...');
  const rPutEv = await fetch(`${baseUrl}/api/eventos/${evCumple.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      estado: 'Consultar Disponibilidad / Reservas Abiertas'
    })
  });
  const dPutEv = await rPutEv.json();
  assert(dPutEv.success, 'Edición de evento debe responder exitoso');
  console.log('✓ Endpoint PUT /api/eventos/:id validado');

  const rPutSrv = await fetch(`${baseUrl}/api/servicios/${srvCumple.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      icono: 'Gift'
    })
  });
  const dPutSrv = await rPutSrv.json();
  assert(dPutSrv.success, 'Edición de servicio debe responder exitoso');
  console.log('✓ Endpoint PUT /api/servicios/:id validado');

  // 9. Métricas Financieras
  console.log('\n9. Validando métricas financieras en tiempo real...');
  const rMetrics = await fetch(`${baseUrl}/api/metrics`);
  const dMetrics = await rMetrics.json();
  assert(dMetrics.success, 'GET /api/metrics debe ser exitoso');
  assert(typeof dMetrics.metrics.ingresosTotalAcumulado === 'number', 'Debe calcular ingresos acumulados');
  console.log(`✓ Métricas calculadas: ${dMetrics.metrics.turnosTotal} turnos históricos registrados`);

  console.log('\n=======================================================');
  console.log('🎉 TODAS LAS PRUEBAS DEL SISTEMA PASARON CON ÉXITO');
  console.log('=======================================================');
}

runTests().catch(err => {
  console.error('\n❌ ERROR EN PRUEBAS:', err);
  process.exit(1);
});

