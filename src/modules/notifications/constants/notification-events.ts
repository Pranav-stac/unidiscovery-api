import {
  NotificationCategory,
  NotificationEventType,
} from '@prisma/client';

export type NotifyPayload = Record<string, unknown>;

export const EVENT_CATEGORY: Record<NotificationEventType, NotificationCategory> = {
  DIAGNOSTIC_COMPLETED: NotificationCategory.DIAGNOSTIC,
  DIAGNOSTIC_REMINDER: NotificationCategory.DIAGNOSTIC,
  COLLEGE_SAVED: NotificationCategory.COLLEGE_SUITE,
  ACTIVITY_SAVED: NotificationCategory.OPPORTUNITIES,
  TUTORING_MILESTONE: NotificationCategory.COLLEGE_SUITE,
  HOMESCHOOL_UNIT_MASTERED: NotificationCategory.HOMESCHOOLING,
  PLAN_ITEM_DUE: NotificationCategory.OPPORTUNITIES,
  WEEKLY_DIGEST: NotificationCategory.SYSTEM,
  APPLICATION_UPDATED: NotificationCategory.APPLICATIONS,
  SYSTEM: NotificationCategory.SYSTEM,
};

export const CATEGORY_PREF_FIELD: Record<
  NotificationCategory,
  keyof {
    diagnostic: boolean;
    collegeSuite: boolean;
    opportunities: boolean;
    homeschooling: boolean;
    applications: boolean;
  }
> = {
  DIAGNOSTIC: 'diagnostic',
  COLLEGE_SUITE: 'collegeSuite',
  OPPORTUNITIES: 'opportunities',
  HOMESCHOOLING: 'homeschooling',
  APPLICATIONS: 'applications',
  SYSTEM: 'diagnostic',
};
