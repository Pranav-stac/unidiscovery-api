import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationEmailService } from './services/notification-email.service';
import { NotificationPersonalizerService } from './services/notification-personalizer.service';
import { NotificationPushService } from './services/notification-push.service';
import { NotificationSchedulerService } from './services/notification-scheduler.service';
import { NotificationsService } from './services/notifications.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationPersonalizerService,
    NotificationEmailService,
    NotificationPushService,
    NotificationSchedulerService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
