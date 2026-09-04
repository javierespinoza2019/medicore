export interface AgendaConfig {
  startHour: number;
  endHour: number;
  slotDurationMinutes: 15 | 30 | 60;
  allowWeekendScheduling: boolean;
  allowPastDateScheduling: boolean;
  allowNightScheduling: boolean;
  restrictToBusinessHours: boolean;
}

export const defaultAgendaConfig: AgendaConfig = {
  startHour: 0,
  endHour: 24,
  slotDurationMinutes: 15,
  allowWeekendScheduling: true,
  allowPastDateScheduling: false,
  allowNightScheduling: true,
  restrictToBusinessHours: false,
};
