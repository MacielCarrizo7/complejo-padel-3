/**
 * firebaseConfig.js - Configuración e inicialización del SDK modular de Firebase (v10+)
 * COMPLEJO PADEL 3
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Reemplazar con las credenciales de tu proyecto de Firebase Console:
// https://console.firebase.google.com
export const firebaseConfig = {
  apiKey: "AIzaSyCOMPLEJO_PADEL_3_DEMO_API_KEY",
  authDomain: "complejo-padel-3.firebaseapp.com",
  projectId: "complejo-padel-3",
  storageBucket: "complejo-padel-3.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Verificar si se ha iniciado la app para evitar múltiples inicializaciones
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
