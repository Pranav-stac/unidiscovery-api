export function isDeadlineOpen(metadata: unknown, now = new Date()): boolean {
  if (!metadata || typeof metadata !== 'object') return true;

  const meta = metadata as Record<string, unknown>;
  const status = String(meta.deadlineStatus ?? '').toLowerCase();
  if (/(closed|expired|passed|ended)/.test(status)) return false;
  if (/(ongoing|rolling|open)/.test(status)) return true;

  const raw = meta.deadline;
  if (raw == null || raw === '') return true;

  const parsed = new Date(String(raw));
  if (Number.isNaN(parsed.getTime())) return true;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const deadlineDay = new Date(parsed);
  deadlineDay.setHours(0, 0, 0, 0);
  return deadlineDay >= today;
}
