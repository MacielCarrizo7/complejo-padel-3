import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCCjMf1IIcKsLu2wQPqB-UxGa3bmEmVnWs",
  authDomain: "complejo-padel-3.firebaseapp.com",
  projectId: "complejo-padel-3",
  storageBucket: "complejo-padel-3.firebasestorage.app",
  messagingSenderId: "975322009594",
  appId: "1:975322009594:web:e81ead05c09307e7255e43",
  measurementId: "G-RY4RW29MRS"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
