import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/auth.decorators';
import { ROLES } from '../../../common/constants';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ParentService } from '../services/parent.service';

@ApiTags('Parent')
@ApiBearerAuth()
@Roles(ROLES.PARENT, ROLES.ADMIN)
@Controller('parent')
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Get('children')
  @ApiOperation({ summary: 'List linked children' })
  children(@CurrentUser() user: AuthenticatedUser) {
    return this.parentService.getChildren(user.id);
  }

  @Get('children/:studentId')
  @ApiOperation({ summary: 'Child progress overview' })
  childProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId') studentId: string,
  ) {
    return this.parentService.getChildProgress(user.id, studentId);
  }
}
