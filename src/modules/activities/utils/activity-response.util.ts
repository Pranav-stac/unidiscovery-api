import type { Activity } from '@prisma/client';

const HIDDEN_METADATA_KEYS = new Set(['source', 'sourceId', 'dedupeKey']);

export function sanitizeActivityMetadata(
  metadata: unknown,
): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const input = metadata as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (HIDDEN_METADATA_KEYS.has(key)) continue;
    output[key] = value;
  }

  return Object.keys(output).length ? output : null;
}

export function sanitizeActivity<T extends Activity>(activity: T): T {
  return {
    ...activity,
    metadata: sanitizeActivityMetadata(activity.metadata) as T['metadata'],
  };
}

export function sanitizeActivities<T extends Activity>(activities: T[]): T[] {
  return activities.map(sanitizeActivity);
}
