import { toAuthErrorMessage, validateEmail, validateNewPassword } from '@/services/auth-errors';
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

describe('auth-errors', () => {
  it('traduce los códigos de Firebase', () => {
    expect(toAuthErrorMessage({ code: 'auth/email-already-in-use' })).toBe(
      'Ya existe una cuenta con este correo. Inicia sesión.',
    );
    expect(toAuthErrorMessage({ code: 'auth/invalid-credential' })).toBe('Correo o contraseña incorrectos.');
    expect(toAuthErrorMessage(new Error('otro'))).toBe('otro');
    expect(toAuthErrorMessage(null)).toBe('No se pudo completar la operación. Inténtalo de nuevo.');
  });

  it('valida correo y contraseña', () => {
    expect(validateEmail('')).toBe('Escribe tu correo electrónico.');
    expect(validateEmail('ana@')).toBe('El correo electrónico no es válido.');
    expect(validateEmail(' ana@ejemplo.com ')).toBeNull();
    expect(validateNewPassword('12345')).toBe('La contraseña debe tener al menos 6 caracteres.');
    expect(validateNewPassword('123456')).toBeNull();
  });
});
