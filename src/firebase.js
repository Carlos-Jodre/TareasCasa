import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Pega aquí la configuración de tu app web de Firebase
// (Configuración del proyecto → Tus apps → Configuración del SDK).
const firebaseConfig = {
  apiKey: "AIzaSyCEWYU6wdeX1OTYJk0vy0T7U4YJam7iH5g",
  authDomain: "casa-tareas-ff7e0.firebaseapp.com",
  projectId: "casa-tareas-ff7e0",
  storageBucket: "casa-tareas-ff7e0.firebasestorage.app",
  messagingSenderId: "943886161827",
  appId: "1:943886161827:web:57c0c6bb437e8d3c5e6c16"
};

export const db = getFirestore(initializeApp(firebaseConfig))
