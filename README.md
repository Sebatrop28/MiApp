# MiApp

Base profesional de una aplicación Android construida con **React Native + Expo (SDK 58) + TypeScript** y navegación con **Expo Router**. Incluye pantalla de inicio, ajustes e información de la app, tema claro/oscuro persistente, estados de carga y error, pruebas automatizadas y configuración de **EAS Build** para generar un APK instalable.

---

## Índice

1. [Características](#características)
2. [Requisitos](#requisitos)
3. [Instalación](#instalación)
4. [Ejecutar en desarrollo](#ejecutar-en-desarrollo)
5. [Comprobaciones de calidad](#comprobaciones-de-calidad)
6. [Generar el APK con EAS Build](#generar-el-apk-con-eas-build)
7. [Compilar el APK localmente (opcional)](#compilar-el-apk-localmente-opcional)
8. [Despliegue](#despliegue)
9. [Estructura del proyecto](#estructura-del-proyecto)
10. [Guía de desarrollo](#guía-de-desarrollo)
11. [Solución de problemas](#solución-de-problemas)

---

## Características

| Área | Detalle |
| --- | --- |
| Navegación | Expo Router con barra de pestañas nativa (Material 3 en Android): **Inicio**, **Ajustes** e **Información**. Rutas tipadas (`typedRoutes`). Pantalla 404 personalizada. |
| Diseño | Sistema de diseño propio (`src/constants/theme.ts`): colores claro/oscuro, espaciado, radios y tipografía. Iconos Material Symbols vía `expo-symbols`. Contenido con ancho máximo para tablets. |
| Ajustes | Tema (Sistema / Claro / Oscuro), notificaciones y modo de prueba de errores. Se guardan en el dispositivo con AsyncStorage. |
| Estados | Esqueletos de carga, indicadores, «deslizar para actualizar», mensajes de error con botón **Reintentar**, avisos no bloqueantes y `ErrorBoundary` global. |
| Información | Versión, compilación, identificador, fecha de instalación, datos del dispositivo y tecnologías (`expo-application`, `expo-device`, `expo-constants`). |
| Calidad | TypeScript estricto, ESLint (`eslint-config-expo`), Jest + React Native Testing Library (22 pruebas). |
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

Las pruebas están en `__tests__/` (archivos `*-test.ts(x)`) y cubren utilidades, almacenamiento de ajustes, servicio de contenido, el hook `useAsync`, componentes de estado y la navegación entre pantallas.

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

Para publicar cambios de JavaScript sin recompilar, configura EAS Update: `npx eas-cli@latest update:configure` ([documentación](https://docs.expo.dev/eas-update/introduction/)).

---

## Estructura del proyecto

```
MiApp/
├── __tests__/                 # Pruebas Jest (*-test.ts / *-test.tsx)
├── assets/images/             # Icono, icono adaptable y splash
├── src/
│   ├── app/                   # Rutas de Expo Router (cada archivo = pantalla)
│   │   ├── _layout.tsx        # Layout raíz: proveedores, tema, Stack, ErrorBoundary, splash
│   │   ├── +not-found.tsx     # Pantalla 404
│   │   └── (tabs)/            # Grupo de pestañas (no aparece en la URL)
│   │       ├── _layout.tsx    # Barra de pestañas nativa
│   │       ├── index.tsx      # Inicio      → /
│   │       ├── settings.tsx   # Ajustes     → /settings
│   │       └── about.tsx      # Información → /about
│   ├── components/
│   │   ├── ui/                # Componentes base: Screen, Card, Button, ListRow, Icon...
│   │   └── feedback/          # LoadingState, SkeletonList, ErrorState, Banner
│   ├── constants/theme.ts     # Tokens de diseño (colores, espaciado, tipografía)
│   ├── context/               # SettingsProvider (estado global de ajustes)
│   ├── hooks/                 # useAppTheme, useAsync
│   ├── services/              # Acceso a datos: almacenamiento, contenido, info de la app
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
| Gradle falla en local | Verifica JDK 17, `ANDROID_HOME` y vuelve a generar con `npx expo prebuild --clean`. |
