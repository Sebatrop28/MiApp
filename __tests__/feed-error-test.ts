import { splitIndexLink, toFeedError } from '@/services/posts';

jest.mock('@/services/firebase', () => ({ getFirebaseDb: () => ({}) }));

describe('errores del muro', () => {
  it('separa el enlace para crear el índice que pide Firestore', () => {
    const url = 'https://console.firebase.google.com/v1/r/project/app-de-particion/firestore/indexes?create_composite=Abc123';
    const error = Object.assign(new Error(`The query requires an index. You can create it here: ${url}`), { code: 'failed-precondition' });
    const { text, url: link } = splitIndexLink(toFeedError(error));
    expect(link).toBe(url);
    expect(text).toMatch(/^Falta un índice en Firestore/);
  });

  it('muestra el código y el detalle de Firebase en otros errores', () => {
    const error = Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
    expect(splitIndexLink(toFeedError(error))).toEqual({
      text: expect.stringMatching(/rechazó la operación.*\(permission-denied: Missing or insufficient permissions\.\)$/),
      url: null,
    });
  });
});
