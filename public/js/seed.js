/**
 * public/js/seed.js - Script de inicialización de datos para Cloud Firestore (Navegador/Client)
 * COMPLEJO PADEL 3
 */

import { db } from "./firebaseConfig.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function seedFirestore(seedData) {
  console.log("🌱 Inicializando poblamiento de Firestore para Complejo Padel 3...");
  
  try {
    // 1. Guardar Configuración Principal
    if (seedData.siteConfig) {
      await setDoc(doc(db, "siteConfig", "main"), seedData.siteConfig);
      console.log("✅ Documento 'siteConfig/main' guardado correctamente.");
    }

    // 2. Poblar Servicios
    if (Array.isArray(seedData.servicios)) {
      for (const srv of seedData.servicios) {
        await setDoc(doc(db, "servicios", srv.id), srv);
      }
      console.log(`✅ ${seedData.servicios.length} servicios guardados en la colección 'servicios'.`);
    }

    // 3. Poblar Canchas
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
