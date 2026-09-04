import { MESES } from '@/pages/agenda/components/MonthView';

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function getTodayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDateSpanish(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

export function getMonday(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getWeekDays(mondayStr: string): {
  date: string;
  dayName: string;
  dayNumber: string;
  isToday: boolean;
}[] {
  const today = getTodayLocal();
  const d = new Date(`${mondayStr}T00:00:00`);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({
      date,
      dayName: DIAS_SEMANA[i],
      dayNumber: String(d.getDate()),
      isToday: date === today,
    });
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayRangeUtc(dateStr: string): { from: string; to: string } {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function computeAgendaRange(
  view: 'day' | 'week' | 'month' | 'list',
  selectedDate: string,
  currentYear: number,
  currentMonth: number,
): { from: string; to: string } {
  if (view === 'day' || view === 'list') {
    return dayRangeUtc(selectedDate);
  }
  if (view === 'week') {
    const monday = getMonday(selectedDate);
    const sunday = addDays(monday, 6);
    return { from: dayRangeUtc(monday).from, to: dayRangeUtc(sunday).to };
  }
  const month = currentMonth + 1;
  const first = `${currentYear}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
  const last = `${currentYear}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from: dayRangeUtc(first).from, to: dayRangeUtc(last).to };
}
