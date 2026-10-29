import type { AndroidSymbol } from 'expo-symbols';

import { delay } from '@/utils/delay';
import { NetworkError } from '@/utils/errors';

/**
 * Servicio de contenido de la pantalla de inicio.
 *
 * Actualmente devuelve datos locales con una latencia simulada para ejercitar
 * los estados de carga y error de la interfaz. Sustituye `fetchHighlights`
 * por una llamada real (`fetch`) cuando exista un backend.
 */

export interface Highlight {
  id: string;
  title: string;
  description: string;
  icon: AndroidSymbol;
}

export interface FetchHighlightsOptions {
  simulateError?: boolean;
  latencyMs?: number;
}

const HIGHLIGHTS: Highlight[] = [
  {
    id: 'router',
    title: 'Navegación basada en archivos',
    description: 'Expo Router genera las rutas a partir de la carpeta src/app.',
    icon: 'alt_route',
  },
  {
    id: 'theme',
    title: 'Tema claro y oscuro',
    description: 'Elige el tema en Ajustes; la preferencia se guarda en el dispositivo.',
    icon: 'dark_mode',
  },
  {
    id: 'states',
    title: 'Estados de carga y error',
    description: 'Cada carga de datos muestra un indicador y permite reintentar si falla.',
    icon: 'sync',
  },
  {
    id: 'eas',
    title: 'Lista para EAS Build',
    description: 'Genera un APK instalable con un solo comando desde la terminal.',
    icon: 'rocket_launch',
  },
];

export async function fetchHighlights({
  simulateError = false,
  latencyMs = 800,
}: FetchHighlightsOptions = {}): Promise<Highlight[]> {
  await delay(latencyMs);
  if (simulateError) {
    throw new NetworkError();
  }
  return HIGHLIGHTS.map((item) => ({ ...item }));
}
