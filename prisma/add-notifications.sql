-- Notification suite tables (run manually if migrate dev is unavailable)

CREATE TYPE "NotificationEventType" AS ENUM (
  'DIAGNOSTIC_COMPLETED',
  'DIAGNOSTIC_REMINDER',
  'COLLEGE_SAVED',
  'ACTIVITY_SAVED',
  'TUTORING_MILESTONE',
  'HOMESCHOOL_UNIT_MASTERED',
  'PLAN_ITEM_DUE',
  'WEEKLY_DIGEST',
  'APPLICATION_UPDATED',
  'SYSTEM'
);

CREATE TYPE "NotificationCategory" AS ENUM (
  'DIAGNOSTIC',
  'COLLEGE_SUITE',
  'OPPORTUNITIES',
  'HOMESCHOOLING',
  'APPLICATIONS',
  'SYSTEM'
);

CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "DevicePlatform" AS ENUM ('WEB', 'ANDROID', 'IOS');

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "email_enabled" BOOLEAN NOT NULL DEFAULT true,
  "push_enabled" BOOLEAN NOT NULL DEFAULT true,
  "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
  "diagnostic" BOOLEAN NOT NULL DEFAULT true,
  "college_suite" BOOLEAN NOT NULL DEFAULT true,
  "opportunities" BOOLEAN NOT NULL DEFAULT true,
  "homeschooling" BOOLEAN NOT NULL DEFAULT true,
  "applications" BOOLEAN NOT NULL DEFAULT true,
  "weekly_digest" BOOLEAN NOT NULL DEFAULT true,
  "quiet_hours_start" INTEGER,
  "quiet_hours_end" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "device_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" TEXT NOT NULL,
  "platform" "DevicePlatform" NOT NULL DEFAULT 'WEB',
  "user_agent" TEXT,
  "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("user_id", "token")
);
CREATE INDEX IF NOT EXISTS "device_tokens_user_id_idx" ON "device_tokens" ("user_id");

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "event_type" "NotificationEventType" NOT NULL,
  "category" "NotificationCategory" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "action_url" TEXT,
  "image_url" TEXT,
  "metadata" JSONB,
  "dedupe_key" TEXT,
  "read_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("user_id", "dedupe_key")
);
CREATE INDEX IF NOT EXISTS "notifications_user_id_created_at_idx" ON "notifications" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "notifications_event_type_idx" ON "notifications" ("event_type");

CREATE TABLE IF NOT EXISTS "notification_deliveries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "notification_id" UUID NOT NULL REFERENCES "notifications"("id") ON DELETE CASCADE,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "recipient" TEXT,
  "provider_id" TEXT,
  "error" TEXT,
  "sent_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "notification_deliveries_notification_id_idx" ON "notification_deliveries" ("notification_id");
CREATE INDEX IF NOT EXISTS "notification_deliveries_channel_status_idx" ON "notification_deliveries" ("channel", "status");
CREATE INDEX IF NOT EXISTS "notification_deliveries_created_at_idx" ON "notification_deliveries" ("created_at");
