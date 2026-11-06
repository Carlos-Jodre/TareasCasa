# Tareas de casa

React + Vite + Firebase (Firestore) + Vercel. PWA instalable, sin cuentas: cada casa se identifica con un código largo.

## Puesta en marcha (todo desde el navegador)
1. **Firebase**: crea un proyecto → Build → Firestore Database → crear base de datos.
2. En Firestore → Reglas, pega el contenido de `firestore.rules` y publica.
3. Configuración del proyecto → Tus apps → añade una app web (`</>`) y copia el objeto `firebaseConfig`.
4. En GitHub edita `src/firebase.js` y pega esos valores en lugar de `PEGA_AQUI`.
5. **Vercel**: Add New → Project → importa el repo. Framework: Vite (lo detecta solo). Deploy.
6. Abre la URL de Vercel en el móvil → «Crear casa» → «Compartir» y envía el enlace a tu familia.
7. Añadir a pantalla de inicio (iPhone: Compartir → Añadir a pantalla de inicio; Android: menú ⋮ → Instalar app).
