import { getGreeting } from '@/utils/greeting';

describe('getGreeting', () => {
  const at = (hour: number) => new Date(2026, 0, 1, hour, 0, 0);

  it('saluda por la mañana entre las 5 y las 11', () => {
    expect(getGreeting(at(5))).toBe('Buenos días');
    expect(getGreeting(at(11))).toBe('Buenos días');
  });

  it('saluda por la tarde entre las 12 y las 18', () => {
    expect(getGreeting(at(12))).toBe('Buenas tardes');
    expect(getGreeting(at(18))).toBe('Buenas tardes');
  });

  it('saluda por la noche el resto del día', () => {
    expect(getGreeting(at(19))).toBe('Buenas noches');
    expect(getGreeting(at(2))).toBe('Buenas noches');
  });
});
