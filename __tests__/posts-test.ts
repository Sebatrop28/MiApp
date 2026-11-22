import { describeLink, normalizeLink, POST_TEXT_MAX_LENGTH, validatePost } from '@/utils/posts';

describe('publicaciones', () => {
  it('normaliza los enlaces', () => {
    expect(normalizeLink('  ')).toBeNull();
    expect(normalizeLink('drive.google.com/x')).toBe('https://drive.google.com/x');
    expect(normalizeLink(' http://ejemplo.com ')).toBe('http://ejemplo.com');
  });

  it('pide algo de contenido y rechaza enlaces inválidos', () => {
    expect(validatePost({ text: ' ', link: '', hasImage: false })).toMatch(/Escribe algo/);
    expect(validatePost({ text: '', link: '', hasImage: true })).toBeNull();
    expect(validatePost({ text: 'hola', link: '', hasImage: false })).toBeNull();
    expect(validatePost({ text: '', link: 'ftp://x.com/a', hasImage: false })).toMatch(/enlace/);
    expect(validatePost({ text: '', link: 'mi archivo.pdf', hasImage: false })).toMatch(/enlace/);
    expect(validatePost({ text: '', link: 'https:///', hasImage: false })).toMatch(/enlace/);
    expect(validatePost({ text: 'x'.repeat(POST_TEXT_MAX_LENGTH + 1), link: '', hasImage: false })).toMatch(/hasta/);
  });

  it('describe los enlaces a archivos', () => {
    expect(describeLink('https://www.ejemplo.com/docs/Tarea%201.pdf?dl=1')).toEqual({ host: 'ejemplo.com', label: 'Tarea 1.pdf' });
    expect(describeLink('https://drive.google.com/file/d/abc/view')).toEqual({ host: 'drive.google.com', label: 'drive.google.com' });
  });
});
