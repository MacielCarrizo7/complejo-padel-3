# COMPLEJO PADEL 3 - Sistema de Gestión y Reservas de Turnos

Sistema completo para la gestión y reserva de canchas de **Pádel y Fútbol** (Exterior e Interior), con cálculo de precios por hora, total en dinero en pantalla y en WhatsApp, y **Backend Moderno en Node.js / Express**.

![Logo Complejo Padel 3](public/assets/logo.png)

## 🚀 Inicio Rápido

1. Instalar dependencias (ya instaladas):
   ```bash
   npm install
   ```

2. Iniciar el servidor:
   ```bash
   npm start
   ```

3. Abrir en el navegador:
   ```
   http://localhost:3000
   ```

---

## 🏆 Características Principales

- **Multideporte**: Filtros entre canchas de **Pádel** (pistas de cristal con césped azul, 4 jugadores / 2 vs 2) y **Fútbol** (F5, F7, F8, F11 con césped verde).
- **Exterior e Interior**: Clasificación por cancha `🏠 Interior Techada` o `☀️ Exterior`.
- **Precios por Cancha**: Cada cancha tiene su precio por hora editable desde el panel de administración.
- **Total en Dinero**: El valor a pagar se calcula en vivo y se detalla en el formulario, pantalla de confirmación y en el mensaje preparado para WhatsApp.
- **Backend Moderno en Node.js**: API RESTful completa con persistencia en `data/database.json`, prevención anti-solapamiento de turnos, y métricas financieras de facturación.
- **Panel de Administrador**: Acceso por PIN con agenda de turnos, métricas en vivo, cancelación instantánea y tablero con siluetas tácticas de ocupación.

---

## 🧪 Pruebas Automatizadas

Para ejecutar las pruebas del sistema:
```bash
node test_system.js
```
