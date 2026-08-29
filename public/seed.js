/**
 * public/seed.js - Script de inicialización de datos para Cloud Firestore
 * COMPLEJO PADEL 3
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebaseConfig.js";

export async function seedFirestore(seedData) {
  console.log("🌱 Inicializando poblamiento de Firestore para Complejo Padel 3...");
  
  try {
    if (seedData.siteConfig) {
      await setDoc(doc(db, "siteConfig", "main"), seedData.siteConfig);
      console.log("✅ Documento 'siteConfig/main' guardado correctamente.");
    }

    if (Array.isArray(seedData.servicios)) {
      for (const srv of seedData.servicios) {
        await setDoc(doc(db, "servicios", srv.id), srv);
      }
      console.log(`✅ ${seedData.servicios.length} servicios guardados en la colección 'servicios'.`);
    }

    if (Array.isArray(seedData.canchas)) {
      for (const cancha of seedData.canchas) {
        await setDoc(doc(db, "canchas", cancha.id), cancha);
      }
      console.log(`✅ ${seedData.canchas.length} canchas guardadas en la colección 'canchas'.`);
    }

    console.log("🎉 Poblamiento completado con éxito.");
    return { success: true, message: "Poblamiento completado con éxito." };
  } catch (error) {
    console.error("❌ Error al poblar Firestore:", error);
    return { success: false, error: error.message };
  }
}
