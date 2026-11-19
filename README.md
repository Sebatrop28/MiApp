# MiApp

Base profesional de una aplicación Android construida con **React Native + Expo (SDK 58) + TypeScript** y navegación con **Expo Router**. Incluye cuentas de usuario con **Firebase Auth** (correo y Google), pantalla de inicio, bloc de notas, ajustes e información de la app, tema claro/oscuro persistente, estados de carga y error, pruebas automatizadas y configuración de **EAS Build** para generar un APK instalable.

---

## Índice

1. [Características](#características)
2. [Requisitos](#requisitos)
3. [Instalación](#instalación)
4. [Configurar Firebase (cuentas de usuario)](#configurar-firebase-cuentas-de-usuario)
5. [Ejecutar en desarrollo](#ejecutar-en-desarrollo)
6. [Comprobaciones de calidad](#comprobaciones-de-calidad)
7. [Generar el APK con EAS Build](#generar-el-apk-con-eas-build)
8. [Compilar el APK localmente (opcional)](#compilar-el-apk-localmente-opcional)
9. [Despliegue](#despliegue)
10. [Estructura del proyecto](#estructura-del-proyecto)
11. [Guía de desarrollo](#guía-de-desarrollo)
12. [Solución de problemas](#solución-de-problemas)

---

## Características

| Área | Detalle |
| --- | --- |
| Navegación | Expo Router con barra de pestañas nativa (Material 3 en Android): **Inicio**, **Notas**, **Ajustes** e **Información**. Rutas tipadas (`typedRoutes`). Pantalla 404 personalizada. |
| Diseño | Sistema de diseño propio (`src/constants/theme.ts`): colores claro/oscuro, espaciado, radios y tipografía. Iconos Material Symbols vía `expo-symbols`. Contenido con ancho máximo para tablets. |
| Cuentas | Hay que iniciar sesión para usar la app. Registro con nombre, correo y contraseña (se envía un correo de verificación), inicio de sesión con correo o con **Google** (Android), recuperación de contraseña y cierre de sesión en *Ajustes*. La sesión se recuerda entre aperturas. Firebase Auth. |
| Actualizaciones | *Ajustes → Actualizaciones*: buscar e instalar versiones nuevas sin reinstalar el APK (EAS Update) y opción **Actualizar automáticamente** (al abrir la app descarga la versión nueva y ofrece reiniciar). |
| Notas | Bloc de notas: crea, edita y elimina notas. Todo lo que escribes se guarda automáticamente en el dispositivo (AsyncStorage), aunque cierres la app. Cada cuenta tiene sus propias notas en ese dispositivo. La primera línea se usa como título; las notas vacías se descartan al salir. |
| Ajustes | Tema (Sistema / Claro / Oscuro), notificaciones y modo de prueba de errores. Se guardan en el dispositivo con AsyncStorage. |
| Estados | Esqueletos de carga, indicadores, «deslizar para actualizar», mensajes de error con botón **Reintentar**, avisos no bloqueantes y `ErrorBoundary` global. |
| Información | Versión, compilación, identificador, fecha de instalación, datos del dispositivo y tecnologías (`expo-application`, `expo-device`, `expo-constants`). |
| Calidad | TypeScript estricto, ESLint (`eslint-config-expo`), Jest + React Native Testing Library (38 pruebas). |
| Compilación | `eas.json` con perfil `preview` (APK) y `production` (AAB para Google Play). |

> **Probar los mensajes de error:** en *Ajustes → Desarrollo* activa **Simular errores de red** y vuelve a *Inicio*: la sección «Novedades» mostrará el error y el botón *Reintentar*.

---

## Requisitos

- **Node.js 20.19 o superior** (recomendado Node 22 LTS) y npm.
- **Git**.
- Para probar en un teléfono: la app **Expo Go** (Google Play) o un emulador Android.
- Para generar el APK en la nube: una cuenta gratuita en **[expo.dev](https://expo.dev/signup)**.
- Solo para compilación local: **JDK 17** y **Android SDK** (Android Studio).

---

## Instalación

```bash
git clone <URL-del-repositorio> MiApp
cd MiApp
npm install
```

> Para añadir nuevas dependencias usa siempre `npx expo install <paquete>`: elige la versión compatible con el SDK de Expo.

---

## Configurar Firebase (cuentas de usuario)

La app usa **Firebase Authentication**. Necesitas un proyecto de Firebase propio (gratis). Los valores que se copian a `app.json` son públicos (identifican la app), no son contraseñas.

1. Entra en [console.firebase.google.com](https://console.firebase.google.com), pulsa **Crear un proyecto** y sigue los pasos (Google Analytics es opcional).
2. **Authentication → Comenzar → Método de inicio de sesión**: activa **Correo electrónico/contraseña** y **Google** (elige tu correo de asistencia y guarda).
3. **Configuración del proyecto (⚙️) → General → Tus apps → icono web `</>`**: registra una app web (por ejemplo «MiApp web»). Copia los valores de `firebaseConfig` en `app.json`:

   ```json
   "extra": {
     "firebase": {
       "apiKey": "AIza...",
       "authDomain": "tu-proyecto.firebaseapp.com",
       "projectId": "tu-proyecto",
       "storageBucket": "tu-proyecto.firebasestorage.app",
       "messagingSenderId": "1234567890",
       "appId": "1:1234567890:web:abc123"
     },
     "googleWebClientId": "1234567890-xxxx.apps.googleusercontent.com"
   }
   ```

4. **`googleWebClientId`** (solo para Google): en **Authentication → Método de inicio de sesión → Google → Configuración del SDK web**, copia el **ID de cliente web**.
5. **Huella SHA‑1 (solo para Google)**: en **Configuración del proyecto → General → Tus apps**, añade una app **Android** con el paquete `com.sebatrop28.miapp` y pega la huella SHA‑1 del certificado con el que EAS firma tu APK. Para verla, en PowerShell dentro de la carpeta del proyecto:

   ```powershell
   npx eas-cli@latest credentials -p android
   ```

   Elige el perfil `preview` y copia el valor **SHA1 Fingerprint**. Si luego publicas en Google Play, añade también la SHA‑1 de **Play Console → Integridad de la app**. No hace falta descargar `google-services.json`.
6. Haz commit de `app.json` y genera el APK de nuevo (`npm run build:apk`).

> - Sin estos valores la app abre la pantalla de inicio de sesión con un aviso y no deja entrar.
> - El botón **Continuar con Google** solo aparece en Android y cuando `googleWebClientId` está completo. Usa código nativo, así que **no funciona en Expo Go**: pruébalo con el APK de EAS (`npm run build:apk`) o con `npm run android`.
> - Las notas creadas antes de existir las cuentas pasan a la primera cuenta que inicie sesión en ese teléfono.

---

## Ejecutar en desarrollo

```bash
npm start          # inicia Metro y muestra un código QR (Expo Go)
npm run android    # compila la app nativa y la instala en un emulador/dispositivo (requiere JDK 17 + Android SDK)
```

- **Teléfono físico (sin Android Studio):** instala *Expo Go*, conecta el teléfono a la misma red Wi‑Fi, ejecuta `npm start` y escanea el QR.
- **Emulador:** abre un AVD desde Android Studio, ejecuta `npm start` y pulsa `a` en la terminal de Metro.

---

## Comprobaciones de calidad

| Comando | Qué hace |
| --- | --- |
| `npm run typecheck` | Verifica los tipos con TypeScript (`tsc --noEmit`). |
| `npm run lint` | Analiza el código con ESLint. |
| `npm test` | Ejecuta las pruebas de Jest. |
| `npm run check` | Ejecuta las tres anteriores en orden. |
| `npm run doctor` | Diagnostica la configuración y versiones con `expo-doctor`. |

Las pruebas están en `__tests__/` (archivos `*-test.ts(x)`) y cubren utilidades, almacenamiento de ajustes y notas, servicio de contenido, el hook `useAsync`, componentes de estado y la navegación entre pantallas.

---

## Generar el APK con EAS Build

EAS Build compila la app en los servidores de Expo; no necesitas Android Studio.

1. **Inicia sesión** en Expo (una sola vez):

   ```bash
   npx eas-cli@latest login
   ```

2. **Vincula el proyecto** con tu cuenta (una sola vez). Este comando crea el proyecto en expo.dev y añade `extra.eas.projectId` a `app.json`; haz commit de ese cambio:

   ```bash
   npx eas-cli@latest init
   ```

3. **Lanza la compilación del APK** (perfil `preview`):

   ```bash
   npm run build:apk
   # equivalente a: npx eas-cli@latest build --platform android --profile preview
   ```

   La primera vez EAS preguntará si debe **generar un keystore** de Android: responde que sí. EAS lo guarda de forma segura en tu cuenta y lo reutiliza en cada compilación.

4. Al terminar (normalmente 10–20 min en el plan gratuito), la terminal y la página del build en expo.dev muestran un **enlace y un QR para descargar el `.apk`**.

5. **Instalar el APK:**
   - En el teléfono: abre el enlace, descarga el archivo y permite «instalar apps de origen desconocido».
   - Con cable: `adb install ruta/al/archivo.apk`.
   - En un emulador: `npx eas-cli@latest build:run -p android --latest`.

### Publicar una actualización sin reinstalar (EAS Update)

Los cambios de código y textos (todo lo que está en `src/`) se pueden enviar a los teléfonos que ya tienen el APK instalado:

```powershell
git pull
npm run update:apk     # teléfonos con el APK (canal preview)
npm run update:play    # app de Google Play (canal production)
```

Al abrir la app, si *Actualizar automáticamente* está activado, se descarga la versión nueva y aparece «Actualización lista → Reiniciar ahora». También se puede buscar a mano en *Ajustes → Actualizaciones*.

> - Solo funciona en APK/AAB generados **después** de añadir esta función (necesitan `expo-updates` y el canal de `eas.json`).
> - Si cambias dependencias nativas (`npx expo install` de un paquete con código nativo) o la `version` de `app.json`, tienes que generar un APK nuevo con `npm run build:apk`: las actualizaciones solo llegan a APKs con la misma `runtimeVersion` (política `appVersion`).

### Perfiles de `eas.json`

| Perfil | Formato | Uso |
| --- | --- | --- |
| `preview` | `.apk` | Instalación directa y pruebas internas. |
| `production` | `.aab` | Publicación en Google Play (incrementa `versionCode` automáticamente). |

El identificador de la app en Android es `com.sebatrop28.miapp` (`app.json → expo.android.package`). **Cámbialo antes de la primera publicación** si quieres otro: no se puede modificar después de subir la app a Google Play.

---

## Compilar el APK localmente (opcional)

Si tienes JDK 17 y Android SDK (`ANDROID_HOME` configurado):

```bash
npx expo prebuild --platform android   # genera la carpeta android/ (no se versiona)
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

> El APK local de *release* se firma con la clave de depuración de React Native: sirve para pruebas, **no para publicar**. Para builds firmados usa EAS o configura tu propio keystore.

También puedes compilar con la infraestructura de EAS en tu máquina: `npx eas-cli@latest build -p android --profile preview --local`.

---

## Despliegue

### Distribución directa (APK)

Comparte el enlace del build `preview` de expo.dev, o sube el `.apk` a Google Drive, GitHub Releases, Firebase App Distribution, etc.

### Google Play

1. Crea una cuenta de desarrollador en [Google Play Console](https://play.google.com/console) (pago único) y crea la aplicación.
2. Genera el AAB: `npm run build:aab`.
3. La **primera subida** debe hacerse manualmente desde Play Console (pista *Prueba interna*).
4. Para las siguientes, crea una cuenta de servicio de Google Cloud con acceso a Play Console ([guía](https://docs.expo.dev/submit/android/)), y ejecuta:

   ```bash
   npm run submit:android   # sube el último build de producción a la pista "internal"
   ```

### Actualizaciones OTA (opcional)

EAS Update ya está configurado: ver [Publicar una actualización sin reinstalar](#publicar-una-actualización-sin-reinstalar-eas-update) ([documentación](https://docs.expo.dev/eas-update/introduction/)).

---

## Estructura del proyecto

```
MiApp/
├── __tests__/                 # Pruebas Jest (*-test.ts / *-test.tsx)
├── test-utils/                # Sustitutos para pruebas (p. ej. Firebase Auth en memoria)
├── assets/images/             # Icono, icono adaptable y splash
├── src/
│   ├── app/                   # Rutas de Expo Router (cada archivo = pantalla)
│   │   ├── _layout.tsx        # Layout raíz: proveedores, tema, Stack, ErrorBoundary, splash
│   │   ├── +not-found.tsx     # Pantalla 404
│   │   ├── (tabs)/            # Grupo de pestañas (no aparece en la URL)
│   │   │   ├── _layout.tsx    # Barra de pestañas nativa
│   │   │   ├── index.tsx      # Inicio      → /
│   │   │   ├── notes.tsx      # Notas       → /notes
│   │   │   ├── settings.tsx   # Ajustes     → /settings
│   │   │   └── about.tsx      # Información → /about
│   │   ├── note/[id].tsx      # Editor de una nota → /note/:id
│   │   ├── sign-in.tsx        # Iniciar sesión → /sign-in
│   │   ├── sign-up.tsx        # Crear cuenta → /sign-up
│   │   └── forgot-password.tsx # Recuperar contraseña → /forgot-password
│   ├── components/
│   │   ├── auth/              # Componentes de las pantallas de cuenta
│   │   ├── ui/                # Componentes base: Screen, Card, Button, ListRow, TextField, Icon...
│   │   └── feedback/          # LoadingState, SkeletonList, ErrorState, Banner
│   ├── config/                # Lectura de la configuración de Firebase (app.json → extra)
│   ├── constants/theme.ts     # Tokens de diseño (colores, espaciado, tipografía)
│   ├── context/               # SettingsProvider (ajustes), AuthProvider (sesión) y NotesProvider (notas)
│   ├── hooks/                 # useAppTheme, useAsync
│   ├── services/              # Acceso a datos: Firebase Auth, Google, almacenamiento, contenido, info de la app
│   └── utils/                 # Funciones puras (errores, saludo, delay)
├── app.json                   # Configuración de Expo (nombre, paquete Android, iconos)
├── eas.json                   # Perfiles de EAS Build / Submit
├── eslint.config.js
├── jest.setup.ts
└── tsconfig.json              # TypeScript estricto + alias "@/..." → src/
```

Las carpetas `android/` e `ios/` **no se versionan**: se generan con `npx expo prebuild` (Continuous Native Generation). La configuración nativa se hace en `app.json` y con *config plugins*.

---

## Guía de desarrollo

- **Nueva pantalla:** crea un archivo en `src/app/`. Para que sea una pestaña, colócalo en `src/app/(tabs)/` y añade un `NativeTabs.Trigger` en `src/app/(tabs)/_layout.tsx`.
- **Navegar:** `const router = useRouter(); router.navigate('/settings')` o `<Link href="/about" />` (rutas tipadas).
- **Cargar datos:** envuelve la función en `useCallback` y usa `useAsync(fn)`; obtienes `status` (`loading` / `refreshing` / `success` / `error`), `data`, `error`, `reload()` y `refresh()`.
- **Conectar un backend real:** sustituye la implementación de `fetchHighlights` en `src/services/content.ts` por un `fetch` a tu API; la interfaz no cambia.
- **Nuevo ajuste persistente:** añade el campo a `Settings` y `DEFAULT_SETTINGS` en `src/services/settings-storage.ts`, valídalo en `sanitizeSettings` y úsalo con `useSettings().updateSetting(...)`.
- **Estilos:** usa siempre los tokens de `theme.ts` y `useAppTheme()`; evita colores sueltos.
- **Iconos:** cualquier nombre de [Material Symbols](https://fonts.google.com/icons) (p. ej. `<Icon name="home" />`).

---

## Solución de problemas

| Problema | Solución |
| --- | --- |
| Versiones incompatibles | `npx expo install --fix` y luego `npm run doctor`. |
| Caché de Metro corrupta | `npx expo start -c`. |
| `eas build` pide `projectId` | Ejecuta `npx eas-cli@latest init` y haz commit de `app.json`. |
| El APK no se instala | Desinstala versiones previas firmadas con otra clave y habilita «orígenes desconocidos». |
| «Firebase no está configurado» al iniciar sesión | Completa `extra.firebase` en `app.json` (ver [Configurar Firebase](#configurar-firebase-cuentas-de-usuario)) y vuelve a compilar. |
| Google: error `DEVELOPER_ERROR` | La SHA‑1 del APK no está en Firebase o `googleWebClientId` es incorrecto. |
| «Este método de inicio de sesión no está activado» | Activa el proveedor en *Firebase → Authentication → Método de inicio de sesión*. |
| Gradle falla en local | Verifica JDK 17, `ANDROID_HOME` y vuelve a generar con `npx expo prebuild --clean`. |
