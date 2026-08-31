import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { MentorsService } from '../services/mentors.service';

class ConnectMentorDto {
  @IsOptional() @IsString() message?: string;
}

@ApiTags('Mentors')
@ApiBearerAuth()
@Controller('mentors')
export class MentorsController {
  constructor(private readonly mentorsService: MentorsService) {}

  @Get()
  list() {
    return this.mentorsService.list();
  }

  @Get('my')
  my(@CurrentUser() user: AuthenticatedUser) {
    return this.mentorsService.myConnections(user.id);
  }

  @Post(':id/connect')
  connect(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ConnectMentorDto,
  ) {
    return this.mentorsService.connect(user.id, id, dto.message);
  }
}
