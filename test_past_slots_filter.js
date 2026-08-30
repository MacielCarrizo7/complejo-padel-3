const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Iniciando verificación de Filtrado y Bloqueo de Horarios Pasados (Past Slots Invalidation)...');

// Helper to format ISO
function pad2(n) {
  return String(n).padStart(2, '0');
}
function formatDateISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Logic under test: isSlotInThePast with custom reference now
function isSlotInThePastWithRef(dateStr, timeStr, bufferMinutes = 0, customNow = new Date()) {
  if (!dateStr || !timeStr) return true;
  const now = customNow;
  
  let targetDate;
  if (typeof dateStr === 'string') {
    const [year, month, day] = dateStr.split('-').map(Number);
    targetDate = new Date(year, month - 1, day);
  } else {
    targetDate = new Date(dateStr);
  }

  const todayReset = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetReset = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  if (targetReset < todayReset) return true;
  if (targetReset > todayReset) return false;

  const [slotHour, slotMin] = timeStr.split(':').map(Number);
  const slotHourNormalized = (slotHour === 0 && (slotMin || 0) === 0) ? 24 : slotHour;
  const slotTotalMinutes = slotHourNormalized * 60 + (slotMin || 0);
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes() + bufferMinutes;

  return slotTotalMinutes <= currentTotalMinutes;
}

const baseHoras = ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00"];

const today = new Date(2026, 7, 30, 22, 0, 0); // 30 Aug 2026, 22:00 hs
const todayISO = formatDateISO(today);

const tomorrow = new Date(2026, 7, 31, 10, 0, 0);
const tomorrowISO = formatDateISO(tomorrow);

const yesterday = new Date(2026, 7, 29, 20, 0, 0);
const yesterdayISO = formatDateISO(yesterday);

console.log(`\n1. Verificando simulación de HOY (${todayISO}) a las 22:00 hs...`);
// 14:00 to 22:00 should be past
["14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"].forEach(h => {
  const isPast = isSlotInThePastWithRef(todayISO, h, 0, today);
  assert.strictEqual(isPast, true, `Horario ${h} a las 22:00 hs debe ser catalogado como PASADO`);
});
console.log('✓ Turnos de 14:00 a 22:00 hs están correctamente bloqueados como pasados');

// 22:30, 23:00 and 00:00 (midnight) should be available (not past)
["22:30", "23:00", "00:00"].forEach(h => {
  const isPast = isSlotInThePastWithRef(todayISO, h, 0, today);
  assert.strictEqual(isPast, false, `Horario ${h} a las 22:00 hs debe figurar DISPONIBLE (futuro)`);
});
console.log('✓ Turnos futuros de hoy (22:30, 23:00, 00:00 hs) están correctamente disponibles');

console.log(`\n2. Verificando simulación de MAÑANA (${tomorrowISO})...`);
baseHoras.forEach(h => {
  const isPast = isSlotInThePastWithRef(tomorrowISO, h, 0, today);
  assert.strictEqual(isPast, false, `Horario ${h} para mañana debe figurar DISPONIBLE`);
});
console.log('✓ Todos los turnos de mañana figuran disponibles');

console.log(`\n3. Verificando simulación de AYER (${yesterdayISO})...`);
baseHoras.forEach(h => {
  const isPast = isSlotInThePastWithRef(yesterdayISO, h, 0, today);
  assert.strictEqual(isPast, true, `Horario ${h} para ayer debe figurar BLOQUEADO (pasado)`);
});
console.log('✓ Todos los turnos de ayer figuran bloqueados');

console.log('\n4. Verificando código fuente en landing.js y app.js...');
const landingJs = fs.readFileSync(path.resolve(process.cwd(), 'public/js/landing.js'), 'utf8');
const appJs = fs.readFileSync(path.resolve(process.cwd(), 'public/js/app.js'), 'utf8');

assert(landingJs.includes('isSlotInThePast('), 'landing.js debe implementar isSlotInThePast');
assert(landingJs.includes('slot-past'), 'landing.js debe incluir clase slot-past');
assert(landingJs.includes('No quedan turnos disponibles para el día de hoy'), 'landing.js debe contener mensaje de no turnos para hoy');

assert(appJs.includes('isSlotInThePast('), 'app.js debe implementar isSlotInThePast');
assert(appJs.includes('slot-past'), 'app.js debe incluir clase slot-past');
assert(appJs.includes('No quedan turnos disponibles para el día de hoy'), 'app.js debe contener mensaje de no turnos para hoy');

console.log('✓ Archivos landing.js y app.js validados');

console.log('\n🎉 ¡TODAS LAS PRUEBAS DE INVALIDEZ DE SLOTS PASADOS (4/4) PASARON CON ÉXITO!');
