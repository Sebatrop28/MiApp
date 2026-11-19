import { friendRequestId, friendshipId, normalizeUsername, validateUsername } from '@/utils/username';

describe('nombres de usuario', () => {
  it('normaliza mayúsculas, espacios y la @ inicial', () => {
    expect(normalizeUsername('  @Ana_Lopez ')).toBe('ana_lopez');
  });

  it('acepta nombres válidos', () => {
    expect(validateUsername('ana.lopez_99')).toBeNull();
    expect(validateUsername('@Ana')).toBeNull();
  });

  it('rechaza nombres vacíos, cortos, largos o con caracteres no permitidos', () => {
    expect(validateUsername('  ')).toBe('Escribe un nombre de usuario.');
    expect(validateUsername('ab')).toMatch(/entre 3 y 20/);
    expect(validateUsername('a'.repeat(21))).toMatch(/entre 3 y 20/);
    expect(validateUsername('ana lopez')).toMatch(/solo letras/);
    expect(validateUsername('añá')).toMatch(/solo letras/);
    expect(validateUsername('__ana__')).toMatch(/«__»/);
    expect(validateUsername('__ana')).toBeNull();
  });

  it('genera el mismo id de amistad sin importar el orden', () => {
    expect(friendshipId('b', 'a')).toBe('a_b');
    expect(friendshipId('a', 'b')).toBe('a_b');
    expect(friendRequestId('b', 'a')).toBe('b_a');
  });
});
