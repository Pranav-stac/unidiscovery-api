import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Roles } from '../../../common/decorators/auth.decorators';
import { ROLES } from '../../../common/constants';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CounselorService } from '../services/counselor.service';

class SendMessageDto {
  @IsString() content!: string;
}

@ApiTags('Counselor')
@ApiBearerAuth()
@Controller('counselor')
export class CounselorController {
  constructor(private readonly counselorService: CounselorService) {}

  @Get('dashboard')
  @Roles(ROLES.COUNSELOR, ROLES.ADMIN, ROLES.PROGRAM_MANAGER)
  @ApiOperation({ summary: 'Counselor caseload dashboard' })
  dashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.counselorService.getDashboard(user.id);
  }

  @Get('messages/:studentId')
  @ApiOperation({ summary: 'Get messages with student' })
  messages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ) {
    return this.counselorService.getMessages(user.id, studentId);
  }

  @Post('messages/:studentId')
  @Roles(ROLES.COUNSELOR, ROLES.ADMIN)
  @ApiOperation({ summary: 'Send message to student' })
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.counselorService.sendMessage(user.id, studentId, dto.content);
  }
}
