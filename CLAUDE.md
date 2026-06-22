# CLAUDE.md

Este archivo proporciona orientación a Claude Code (claude.ai/code) al trabajar con código en este repositorio.

## Idioma

- Toda la comunicación e interacción debe ser siempre en español, incluyendo las preguntas que me hagas.

## Descripción general

Sistema de gestión para una liga de fútbol infantil ("Liga Infantil"). Administra estudiantes/jugadores, sus cuotas mensuales ("shares"/cuotas), comprobantes de pago (vouchers), movimientos financieros ("motions"), campañas de email y la generación de carnets. Se usa español en todo el código (nombres de variables, comentarios, UI, mensajes de log).

Monorepo con dos aplicaciones independientes:
- `backend/` — API REST con Express + MongoDB (Mongoose).
- `frontend/` — SPA con React 19 + Vite.

## Comandos

### Backend (`cd backend`)
- `npm run dev` — inicia la API con nodemon (puerto por defecto `4002`).
- `npm start` — inicia la API con node.
- `npm run students:list-schools` — lista las escuelas distintas (script de mantenimiento de datos).
- `npm run students:update-status` — actualiza en masa el estado de estudiantes por escuela vía `scripts/updateStudentsStatusBySchool.js`.

### Frontend (`cd frontend`)
- `npm run dev` — servidor de desarrollo de Vite (Vite toma el 5173, o el siguiente puerto libre como 5174).
- `npm run build` — build de producción.
- `npm run lint` — ESLint sobre el proyecto.
- `npm run preview` — previsualiza el build de producción.

No hay suite de tests en ninguna de las dos apps.

## Entorno y advertencias del desarrollo local

- **El `.env` del frontend controla a qué API se conecta.** `VITE_API_URL` debe apuntar al backend local (`http://localhost:4002/api`) para desarrollo local. `.env.production` apunta a la API en vivo. Vite solo lee `.env` al arrancar — reiniciá el servidor de desarrollo tras cualquier cambio.
- **El allowlist de CORS está hardcodeado** en `backend/src/index.js` (`app.use(cors(...))`). Si el frontend corre en un nuevo origen/puerto, hay que agregarlo ahí o el navegador bloquea las peticiones. Una petición bloqueada por CORS aparece en la UI como "Sin conexión a internet" (un error de red, no un error del servidor).
- Variables de entorno del backend (`backend/.env`): `CONNECTION_STRING` (MongoDB), `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_*`, `EMAIL_USER`/`EMAIL_PASS` (contraseña de aplicación de Gmail para nodemailer), `NODE_ENV`, y opcionalmente `PORT`.

## Arquitectura del backend

- **Punto de entrada** `src/index.js` arranca en `startServer()`: primero conecta a Mongo, luego **importa dinámicamente con `import()` cada router** y lo monta. Las rutas se registran bajo `/api/*`: `students`, `shares`, `users`, `auth`, `email`, `motions`. Al final van un catch-all `/api` con 404 y un middleware global de manejo de errores (lee `err.statusCode`).
- **Estructura por dominio en carpetas**, replicada entre capas: `models/<dominio>/`, `controllers/<dominio>/`, `routes/<dominio>/`. Dominios: `student`, `share`, `user`, `motion`, `login` (autenticación), `email`, más `refreshToken`.
- **Autenticación con JWT basada en cookies** (`controllers/login`). El login emite dos cookies HttpOnly: `token` (acceso, 2h) y `refreshToken` (refresh, 7d). Los refresh tokens también se persisten en la colección `RefreshToken`. Las cookies usan `secure` solo cuando `NODE_ENV=production`, con `sameSite: 'lax'`.
- **Protección de rutas** vía `middlewares/login/protect.js`: `protect` verifica la cookie `token`, carga al usuario y rechaza usuarios inactivos (`state` falso); `admin` además exige `role === 'admin'`. Aplicá `protect` (y `admin` donde corresponda) en los routers protegidos.
- **Logging**: Winston (`src/winston/logger.js`) con archivos de rotación diaria escritos en `logs/`. Usá `logger` en lugar de `console` en controladores/middleware.
- **Subida de archivos** con multer; las imágenes se guardan en Cloudinary. La importación/exportación de Excel usa `xlsx`. El trabajo asíncrono en masa se limita con `p-limit`.

## Arquitectura del frontend

- **Stack de providers** en `src/App.jsx` envuelve la app en providers de Context anidados (uno por dominio): `LoginProvider` → `UsersProvider` → `StudentsProvider` → `SharesProvider` → `EmailProvider` → `MotionProvider`. Cada uno vive en `src/context/<dominio>/` y posee el estado y las llamadas a la API de ese dominio. Este es el patrón principal de gestión de estado — no hay Redux/Zustand.
- **Ruteo** en `src/routes/pages/Routing.jsx`: las páginas se cargan con `lazy()` bajo un `Suspense`. La mayoría de las rutas están envueltas en `ProtectedRoute` (`src/routes/rutas/ProtectedRoute.jsx`); muchas además requieren `role="admin"`. `/login` redirige a `/` cuando el usuario ya está autenticado. El estado de autenticación viene de `LoginContext`.
- **Cliente de API** `src/api/axios.js` es la única instancia de axios configurada (`withCredentials: true` para que fluyan las cookies HttpOnly). Normaliza `VITE_API_URL` para que siempre termine en `/api`. Su **interceptor de respuestas** maneja de forma transparente el refresh de token: ante un 401 (en un endpoint que no sea de auth) llama a `/auth/refresh` una vez, encola las peticiones fallidas concurrentes detrás de un mutex (`isRefreshing`/`failedQueue`), las reintenta tras el refresh, y si el refresh falla dispara un evento de ventana `SESSION_EXPIRED` y guarda un mensaje en `sessionStorage` para que la UI cierre sesión. Importá siempre este cliente para las llamadas a la API, así el comportamiento de refresh/cookies es consistente.
- **UI por capas**: `src/pages/<dominio>/` son los wrappers a nivel de ruta; `src/components/<dominio>/` contienen los componentes de funcionalidad reales.
- Librerías clave: MUI + React-Bootstrap para la UI, `chart.js`/react-chartjs-2 para reportes, `jspdf`/`jspdf-autotable`/`html2canvas` para PDF y generación de carnets, `exceljs`/`xlsx` para planillas, `sweetalert2` para diálogos.
