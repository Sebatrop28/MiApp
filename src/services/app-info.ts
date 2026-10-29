import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Reúne la información de la aplicación y del dispositivo que se muestra en
 * la pantalla «Información».
 */

export interface InfoItem {
  label: string;
  value: string;
}

export interface AppInfo {
  appName: string;
  version: string;
  application: InfoItem[];
  device: InfoItem[];
  technology: InfoItem[];
}

const UNKNOWN = 'No disponible';

const DEVICE_TYPE_LABELS: Record<number, string> = {
  [Device.DeviceType.UNKNOWN]: 'Desconocido',
  [Device.DeviceType.PHONE]: 'Teléfono',
  [Device.DeviceType.TABLET]: 'Tablet',
  [Device.DeviceType.DESKTOP]: 'Escritorio',
  [Device.DeviceType.TV]: 'Televisor',
};

function orUnknown(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return UNKNOWN;
  return String(value);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function getInstallDate(): Promise<string> {
  if (Platform.OS === 'web') return UNKNOWN;
  try {
    return formatDate(await Application.getInstallationTimeAsync());
  } catch {
    return UNKNOWN;
  }
}

export async function getAppInfo(): Promise<AppInfo> {
  const [deviceType, installDate] = await Promise.all([Device.getDeviceTypeAsync(), getInstallDate()]);

  const appName = Application.applicationName ?? Constants.expoConfig?.name ?? 'MiApp';
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '1.0.0';
  const rnVersion = Platform.constants?.reactNativeVersion;

  return {
    appName,
    version,
    application: [
      { label: 'Versión', value: version },
      { label: 'Compilación', value: orUnknown(Application.nativeBuildVersion) },
      { label: 'Identificador', value: orUnknown(Application.applicationId) },
      { label: 'Instalada el', value: installDate },
    ],
    device: [
      { label: 'Fabricante', value: orUnknown(Device.manufacturer ?? Device.brand) },
      { label: 'Modelo', value: orUnknown(Device.modelName) },
      { label: 'Sistema', value: `${orUnknown(Device.osName)} ${Device.osVersion ?? ''}`.trim() },
      { label: 'Tipo', value: DEVICE_TYPE_LABELS[deviceType] ?? UNKNOWN },
    ],
    technology: [
      { label: 'Expo SDK', value: orUnknown(Constants.expoConfig?.sdkVersion) },
      {
        label: 'React Native',
        value: rnVersion ? `${rnVersion.major}.${rnVersion.minor}.${rnVersion.patch}` : UNKNOWN,
      },
      { label: 'Motor JS', value: 'HermesInternal' in globalThis ? 'Hermes' : 'JSC / Web' },
    ],
  };
}
