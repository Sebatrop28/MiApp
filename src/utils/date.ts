const pad = (value: number) => value.toString().padStart(2, '0');

/** Fecha corta y legible: «Hoy, 14:05», «Ayer, 09:30» o «18/11/2026, 14:05». */
export function formatNoteDate(timestamp: number, now: number = Date.now()): string {
  const date = new Date(timestamp);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;

  if (timestamp >= startOfToday.getTime()) return `Hoy, ${time}`;
  if (timestamp >= startOfToday.getTime() - dayMs) return `Ayer, ${time}`;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${time}`;
}
