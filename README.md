# 🎾 COMPLEJO PADEL 3 — Web One-Page & Panel Admin CMS (Firebase BaaS)

Aplicación Web One-Page moderna de alta fidelidad estética y rendimiento para **Complejo Padel 3** en Tulumaya, Lavalle, Mendoza, integrada con **Firebase** (Authentication, Cloud Firestore, Firebase Storage y Firebase Hosting).

---

## 🚀 Stack Tecnológico

- **Frontend:** HTML5, CSS3 moderno (Variables CSS, Glassmorphism, Tema Oscuro Neón, Responsive Design) y JavaScript ES Modules.
- **Efectos Visuales:** Canvas 2D Engine de Partículas DeportivasNeón para la Hero Section.
- **Backend & Servicios (Firebase v10+ BaaS):**
  - **Firebase Authentication:** Control de acceso por Email/Contraseña para resguardar la ruta del Panel Admin (`/admin` / `admin.html`).
  - **Cloud Firestore:** Base de datos NoSQL para lectura pública y actualización dinámica de títulos, subtítulos, servicios, canchas, mapa e imágenes.
  - **Firebase Storage:** Almacenamiento directo de archivos multimedia (Logotipos, Banners y Fotos de Canchas).
  - **Firebase Hosting & Security Rules:** Configuración de `firebase.json`, `firestore.rules` y `storage.rules` para lectura pública y restricción de escritura a administradores autenticados.

---

## 📁 Estructura del Proyecto

```
COMPLEJO/
├── public/
│   ├── index.html            # Landing Page One-Page (Inicio, Servicios, Canchas, Nosotros, Ubicación)
│   ├── admin.html            # Panel de Administración CMS (/admin)
│   ├── css/
│   │   └── styles.css        # Sistema de diseño, tema oscuro neón (#00ff66) y utilidades
│   ├── js/
│   │   ├── firebaseConfig.js # Inicialización del SDK modular v10 de Firebase
│   │   ├── particles.js      # Motor Canvas de partículas deportivas en 2D
│   │   ├── landing.js        # Lógica de la Landing Page y suscripción a Firestore
│   │   └── admin.js          # Lógica del Panel Admin, Auth, Firestore & Storage
│   └── assets/
│       └── logo.png          # Logotipo oficial de Complejo Padel 3
├── firestore.rules           # Reglas de seguridad para Cloud Firestore
├── storage.rules             # Reglas de seguridad para Firebase Storage
├── firebase.json             # Configuración de Hosting y reescrituras de rutas (/admin)
├── seed.json                 # JSON con los datos por defecto iniciales
├── seed.js                   # Script ejecutable de poblamiento (Seeding)
└── README.md                 # Documentación e instrucciones de despliegue
```

---

## ⚙️ Configuración Paso a Paso de Firebase

### 1. Crear el Proyecto en Firebase Console
1. Ingresá a [Firebase Console](https://console.firebase.google.com/) y hacé clic en **Agregar proyecto**.
2. Nombrá tu proyecto (ej: `complejo-padel-3`).
3. Registrá una aplicación Web y copia tus claves de configuración.

### 2. Configurar `public/js/firebaseConfig.js`
Abre el archivo [public/js/firebaseConfig.js](file:///c:/Users/TECNICA%20JR/Desktop/PROYECTOS/COMPLEJO/public/js/firebaseConfig.js) y reemplaza los valores de `firebaseConfig` con las credenciales de tu consola:

```javascript
export const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT_ID.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT_ID.appspot.com",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};
```

### 3. Habilitar Servicios en Firebase Console
- **Firebase Auth:** Ve a *Authentication* > *Sign-in method* > Habilita **Correo electrónico/contraseña**. Crea un usuario administrador (ej: `admin@complejopadel3.com` / `admin123456`).
- **Cloud Firestore:** Ve a *Firestore Database* > Crea la base de datos en modo producción.
- **Firebase Storage:** Ve a *Storage* > Inicia la configuración por defecto.

---

## 🌱 Poblamiento Inicial de Firestore (Seed)

Para llenar Firestore automáticamente con los datos por defecto del complejo (Tulumaya, Lavalle, Mendoza, Turnos 2613831173, Pádel y Fútbol):

1. Iniciá sesión en el Panel Admin (`admin.html` o `/admin`).
2. Dirígete a la pestaña **🌱 Datos Iniciales (Seed)**.
3. Hacé clic en **🚀 Poblar Firestore con Datos Iniciales**.

---

## 🔒 Reglas de Seguridad

### `firestore.rules`
Permite lectura pública para que cualquier visitante vea la landing page sin autenticarse y restringe las operaciones de escritura (creación, edición, borrado) exclusivamente a administradores con sesión activa:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### `storage.rules`
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 🚀 Despliegue en Firebase Hosting

1. Asegúrate de tener instalado Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Inicia sesión en Firebase CLI:
   ```bash
   firebase login
   ```

3. Vincula el proyecto local:
   ```bash
   firebase use --add
   ```

4. Despliega las reglas y el frontend:
   ```bash
   firebase deploy
   ```

---

## 🌟 Características de la Aplicación

- **Hero Visual de Alto Impacto:** Fondo dinámico con sistema de partículas deportivas Canvas y logotipo flotante con resplandor neón.
- **Turnos Directos:** Botón **"Reservar Ahora"** redirige en tiempo real a la URL configurada dinámicamente en Firestore.
- **Panel CMS Intuitivo:** Edición de textos, gestión de imágenes mediante subida directa a Firebase Storage y actualización del iframe de Google Maps.
- **Google Maps Embebido:** Iframe responsive con ubicación exacta en Tulumaya, Lavalle, Mendoza.
