import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Pega aquí la configuración de tu app web de Firebase
// (Configuración del proyecto → Tus apps → Configuración del SDK).
const firebaseConfig = {
  apiKey: 'PEGA_AQUI',
  authDomain: 'PEGA_AQUI',
  projectId: 'PEGA_AQUI',
  storageBucket: 'PEGA_AQUI',
  messagingSenderId: 'PEGA_AQUI',
  appId: 'PEGA_AQUI'
}

export const db = getFirestore(initializeApp(firebaseConfig))
