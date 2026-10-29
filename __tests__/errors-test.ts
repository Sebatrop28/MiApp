import { NetworkError, toErrorMessage } from '@/utils/errors';

describe('toErrorMessage', () => {
  it('usa el mensaje de una instancia de Error', () => {
    expect(toErrorMessage(new Error('Fallo'))).toBe('Fallo');
  });

  it('acepta cadenas de texto', () => {
    expect(toErrorMessage('Algo pasó')).toBe('Algo pasó');
  });

  it('devuelve un mensaje genérico para valores desconocidos', () => {
    expect(toErrorMessage(undefined)).toMatch(/error inesperado/i);
    expect(toErrorMessage(new Error('   '))).toMatch(/error inesperado/i);
  });

  it('NetworkError tiene un mensaje predeterminado en español', () => {
    const error = new NetworkError();
    expect(error.name).toBe('NetworkError');
    expect(error.message).toMatch(/conexión/);
  });
});
