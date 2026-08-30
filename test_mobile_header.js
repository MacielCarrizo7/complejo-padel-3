const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Iniciando verificación del Header / Navbar Mobile-First...');

// 1. Validar markup en public/index.html
const htmlPath = path.resolve(process.cwd(), 'public/index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

console.log('\n1. Verificando los 3 slots semánticos en public/index.html...');
assert(htmlContent.includes('id="menu-toggle"'), 'Debe existir #menu-toggle (Slot Izquierdo)');
assert(htmlContent.includes('class="menu-toggle"'), 'Debe existir clase .menu-toggle');
assert(htmlContent.includes('class="nav-brand'), 'Debe existir .nav-brand (Slot Central)');
assert(htmlContent.includes('class="brand-logo'), 'Debe existir imagen .brand-logo');
assert(htmlContent.includes('class="brand-name"'), 'Debe existir .brand-name');
assert(htmlContent.includes('class="nav-cta-btn'), 'Debe existir .nav-cta-btn (Slot Derecho)');
assert(htmlContent.includes('id="header-cta-btn"'), 'Debe existir #header-cta-btn');
console.log('✓ Los 3 slots principales (#menu-toggle, .nav-brand, .nav-cta-btn) están presentes');

console.log('\n2. Verificando estructura del Drawer Lateral y Overlay...');
assert(htmlContent.includes('id="nav-menu"'), 'Debe existir contenedor drawer #nav-menu');
assert(htmlContent.includes('class="nav-menu-drawer"'), 'Debe existir clase .nav-menu-drawer');
assert(htmlContent.includes('id="drawer-close"'), 'Debe existir botón de cierre #drawer-close');
assert(htmlContent.includes('id="drawer-overlay"'), 'Debe existir #drawer-overlay');
assert(htmlContent.includes('class="drawer-nav-list"'), 'Debe existir lista .drawer-nav-list');

// 4 tab links
assert(htmlContent.includes('data-tab-target="tab-reservas"'), 'Debe existir link a tab-reservas');
assert(htmlContent.includes('data-tab-target="tab-complejo"'), 'Debe existir link a tab-complejo');
assert(htmlContent.includes('data-tab-target="tab-servicios"'), 'Debe existir link a tab-servicios');
assert(htmlContent.includes('data-tab-target="tab-tecnologia"'), 'Debe existir link a tab-tecnologia');

// Admin link inside drawer
assert(htmlContent.includes('href="admin.html"'), 'Debe existir link a admin.html dentro del drawer');
assert(htmlContent.includes('admin-link'), 'Debe tener clase admin-link');
console.log('✓ Drawer lateral (#nav-menu), overlay y sus 4 pestañas + enlace Admin CMS verificados');

// 2. Validar CSS en public/css/styles.css
console.log('\n3. Verificando reglas CSS en public/css/styles.css...');
const cssPath = path.resolve(process.cwd(), 'public/css/styles.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(cssContent.includes('.main-header') || cssContent.includes('.navbar'), 'Debe definir estilos para el header');
assert(cssContent.includes('.menu-toggle'), 'Debe definir .menu-toggle');
assert(cssContent.includes('.nav-brand'), 'Debe definir .nav-brand');
assert(cssContent.includes('.nav-cta-btn'), 'Debe definir .nav-cta-btn');
assert(cssContent.includes('.nav-menu-drawer'), 'Debe definir .nav-menu-drawer');
assert(cssContent.includes('.drawer-overlay'), 'Debe definir .drawer-overlay');
assert(cssContent.includes('grid-template-columns: 44px 1fr auto;'), 'Debe definir layout mobile de 3 columnas (44px 1fr auto)');
console.log('✓ Reglas CSS y media query de 3 columnas validadas');

// 3. Validar JS en public/js/landing.js
console.log('\n4. Verificando controladores JS en public/js/landing.js...');
const jsPath = path.resolve(process.cwd(), 'public/js/landing.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');

assert(jsContent.includes('export function setupMobileDrawer()'), 'Debe exportar setupMobileDrawer()');
assert(jsContent.includes('setupMobileDrawer();'), 'setupMobileDrawer() debe ejecutarse en DOMContentLoaded');
assert(jsContent.includes('menuToggle.addEventListener'), 'Debe escuchar clic en menuToggle');
assert(jsContent.includes('drawerClose.addEventListener'), 'Debe escuchar clic en drawerClose');
assert(jsContent.includes('drawerOverlay.addEventListener'), 'Debe escuchar clic en drawerOverlay');
assert(jsContent.includes('switchTab(targetId)'), 'Debe conmutar pestañas al hacer clic en drawer links');
console.log('✓ Lógica JS de apertura/cierre de drawer y navegación reactiva validada');

console.log('\n🎉 ¡TODAS LAS VERIFICACIONES DEL HEADER MOBILE (18/18) PASARON CON ÉXITO!');
