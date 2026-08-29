const assert = require('assert');

async function runTests() {
  console.log('🧪 Iniciando batería de pruebas para COMPLEJO PADEL 3...');
  const baseUrl = 'http://localhost:3000';

  // 1. Static files
  console.log('\n1. Verificando archivos estáticos...');
  const rIndex = await fetch(`${baseUrl}/`);
  assert.strictEqual(rIndex.status, 200, 'index.html debe responder 200');
  const indexHtml = await rIndex.text();
  assert(indexHtml.includes('COMPLEJO PADEL 3'), 'index.html debe contener el título del complejo');
  assert(indexHtml.includes('assets/logo.png'), 'index.html debe incluir el logo oficial');

  const rLogo = await fetch(`${baseUrl}/assets/logo.png`);
  assert.strictEqual(rLogo.status, 200, 'logo.png debe responder 200');
  console.log('✓ Archivos estáticos e imágenes cargadas correctamente');

  // 2. Config API
  console.log('\n2. Verificando API de Configuración...');
  const rConfig = await fetch(`${baseUrl}/api/config`);
  const dConfig = await rConfig.json();
  assert(dConfig.success, 'GET /api/config debe ser exitoso');
  assert(dConfig.config.canchas.length >= 6, 'Debe haber al menos 6 canchas configuradas');
  console.log(`✓ Configuración cargada: ${dConfig.config.nombre} con ${dConfig.config.canchas.length} canchas`);

  // 3. Canchas filtering (Pádel vs Fútbol, Exterior vs Interior)
  console.log('\n3. Verificando filtros de deporte y ubicación...');
  const rPadel = await fetch(`${baseUrl}/api/canchas?deporte=padel`);
  const dPadel = await rPadel.json();
  assert(dPadel.canchas.every(c => c.deporte === 'padel'), 'Todas las canchas devueltas deben ser de Pádel');
  console.log(`✓ Filtro Pádel: ${dPadel.canchas.length} pistas encontradas`);

  const rFutbol = await fetch(`${baseUrl}/api/canchas?deporte=futbol`);
  const dFutbol = await rFutbol.json();
  assert(dFutbol.canchas.every(c => c.deporte === 'futbol'), 'Todas las canchas devueltas deben ser de Fútbol');
  console.log(`✓ Filtro Fútbol: ${dFutbol.canchas.length} canchas encontradas`);

  const rInterior = await fetch(`${baseUrl}/api/canchas?ubicacion=interior`);
  const dInterior = await rInterior.json();
  assert(dInterior.canchas.every(c => c.ubicacion === 'interior'), 'Todas las canchas devueltas deben ser interiores');
  console.log(`✓ Filtro Interior: ${dInterior.canchas.length} canchas techadas encontradas`);

  // 4. Crear reserva de Pádel
  console.log('\n4. Creando reserva de Pádel con cálculo de precio...');
  const testFecha = `2026-09-${String(Math.floor(Math.random() * 20) + 10).padStart(2, '0')}`;
  const rReservaPadel = await fetch(`${baseUrl}/api/turnos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canchaId: 'c2', // Pista 2 - Panorámica
      fecha: testFecha,
      hora: '21:00',
      duracion: 1,
      nombre: 'Agustín Tapia',
      whatsapp: '1133445566',
      equipo: 'Golden Padel Team'
    })
  });
  const dReservaPadel = await rReservaPadel.json();
  assert(dReservaPadel.success, 'La reserva de Pádel debe ser exitosa');
  assert.strictEqual(dReservaPadel.turno.precio, 24000, 'El precio debe coincidir con el valor de la pista ($24.000)');
  assert.strictEqual(dReservaPadel.turno.precioFormateado, '$ 24.000');
  console.log(`✓ Reserva de Pádel creada: ${dReservaPadel.turno.nombre} en ${dReservaPadel.turno.canchaNombre} por ${dReservaPadel.turno.precioFormateado}`);

  // 5. Crear reserva de Fútbol
  console.log('\n5. Creando reserva de Fútbol F7...');
  const rReservaFutbol = await fetch(`${baseUrl}/api/turnos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canchaId: 'c5', // Cancha 2 - Wembley F7
      fecha: testFecha,
      hora: '20:00',
      duracion: 1,
      nombre: 'Lionel Scaloni',
      whatsapp: '1199887766',
      equipo: 'La Scaloneta FC'
    })
  });
  const dReservaFutbol = await rReservaFutbol.json();
  assert(dReservaFutbol.success, 'La reserva de Fútbol debe ser exitosa');
  assert.strictEqual(dReservaFutbol.turno.precio, 36000, 'El precio de F7 debe ser $36.000');
  console.log(`✓ Reserva de Fútbol creada: ${dReservaFutbol.turno.nombre} en ${dReservaFutbol.turno.canchaNombre} por ${dReservaFutbol.turno.precioFormateado}`);

  // 6. Validar colisión (doble reserva)
  console.log('\n6. Validando prevención de doble reserva en mismo slot...');
  const rColision = await fetch(`${baseUrl}/api/turnos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canchaId: 'c2',
      fecha: testFecha,
      hora: '21:00',
      nombre: 'Jugador Intento Duplicado'
    })
  });
  assert.strictEqual(rColision.status, 409, 'Debe devolver código 409 Conflict');
  console.log('✓ Prevención de doble reserva validada correctamente (HTTP 409 Conflict)');

  // 7. Autenticación de Administrador
  console.log('\n7. Probando autenticación y PIN de Administrador...');
  const rSetupPin = await fetch(`${baseUrl}/api/admin/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '4321', action: 'setup' })
  });
  const dSetupPin = await rSetupPin.json();
  assert(dSetupPin.success, 'Activación de PIN debe ser exitosa');
  console.log('✓ PIN de Administrador establecido a 4321');

  // 8. Métricas financieras
  console.log('\n8. Verificando cálculo de métricas financieras...');
  const rMetrics = await fetch(`${baseUrl}/api/metrics`);
  const dMetrics = await rMetrics.json();
  assert(dMetrics.success, 'GET /api/metrics debe ser exitoso');
  console.log(`✓ Métricas obtenidas: Turnos futuros: ${dMetrics.metrics.turnosFuturos}, Ingresos proyectados: ${dMetrics.metrics.ingresosProyectadosFormateado}`);
  assert(dMetrics.metrics.ingresosProyectados >= 60000, 'Ingresos proyectados deben sumar los turnos creados');

  // 9. Cancelación de turno y liberación de cancha
  console.log('\n9. Cancelando turno y liberando cancha...');
  const rDel = await fetch(`${baseUrl}/api/turnos/${dReservaPadel.turno.id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-pin': '4321'
    }
  });
  const dDel = await rDel.json();
  assert(dDel.success, 'Cancelación de turno debe ser exitosa');
  console.log(`✓ Turno cancelado: ${dDel.message}`);

  // Re-check slot availability after cancel
  const rColisionLiberada = await fetch(`${baseUrl}/api/turnos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canchaId: 'c2',
      fecha: testFecha,
      hora: '21:00',
      duracion: 1,
      nombre: 'Nuevo Jugador en Slot Liberado'
    })
  });
  assert.strictEqual(rColisionLiberada.status, 201, 'El slot liberado ahora debe permitir nueva reserva');
  console.log('✓ Slot liberado verificado: se pudo reservar nuevamente');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS (10/10) PASARON EXITOSAMENTE!');
}

runTests().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
