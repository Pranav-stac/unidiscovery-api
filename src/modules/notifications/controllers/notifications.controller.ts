import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevicePlatform } from '@prisma/client';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import {
  RegisterDeviceDto,
  UpdateNotificationPreferencesDto,
} from '../dto/notifications.dto';
import { NotificationsService } from '../services/notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List in-app notifications' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.notifications.listForUser(user.id, Number(page), Number(limit));
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread notification count' })
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.getUnreadCount(user.id);
  }

  @Get('stream')
  @ApiOperation({ summary: 'Live notification updates (SSE)' })
  stream(@CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    return this.notifications.streamToResponse(user.id, res);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  preferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.getPreferences(user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notifications.updatePreferences(user.id, dto);
  }

  @Post('devices')
  @ApiOperation({ summary: 'Register FCM device token' })
  registerDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.notifications.registerDevice(
      user.id,
      dto.token,
      dto.platform ?? DevicePlatform.WEB,
      dto.userAgent,
    );
  }

  @Delete('devices')
  @ApiOperation({ summary: 'Remove FCM device token' })
  removeDevice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.notifications.removeDevice(user.id, dto.token);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markAllRead(user.id);
  }
}
