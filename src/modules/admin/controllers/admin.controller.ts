import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/auth.decorators';
import { ROLES } from '../../../common/constants';
import { AdminService } from '../services/admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(ROLES.ADMIN, ROLES.PROGRAM_MANAGER)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard stats' })
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  listUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('role') role?: UserRole,
  ) {
    return this.adminService.listUsers(Number(page), Number(limit), role);
  }
}
