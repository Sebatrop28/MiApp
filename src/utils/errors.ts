/** Error de red tipado para distinguirlo de errores de programación. */
export class NetworkError extends Error {
  constructor(message = 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.') {
    super(message);
    this.name = 'NetworkError';
  }
}

const FALLBACK_MESSAGE = 'Ocurrió un error inesperado. Inténtalo de nuevo.';

/** Convierte cualquier valor lanzado en un mensaje legible para la persona usuaria. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }
  return FALLBACK_MESSAGE;
}
