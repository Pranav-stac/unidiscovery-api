import { ActivityPlanStatus } from '@prisma/client';

export type TemporalPlanStatus =
  | 'COMPLETED'
  | 'OVERDUE'
  | 'IN_PROGRESS'
  | 'UPCOMING'
  | 'PLANNED';

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function deriveTemporalStatus(
  status: ActivityPlanStatus,
  startDate?: Date | null,
  dueDate?: Date | null,
): TemporalPlanStatus {
  if (status === 'COMPLETED' || status === 'SKIPPED') return 'COMPLETED';
  if (status === 'IN_PROGRESS') return 'IN_PROGRESS';

  const today = startOfDay(new Date());
  if (dueDate && startOfDay(dueDate) < today) return 'OVERDUE';
  if (startDate && startOfDay(startDate) > today) return 'UPCOMING';
  if (dueDate && startOfDay(dueDate) >= today) return 'UPCOMING';
  return 'PLANNED';
}
