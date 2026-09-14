import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/auth.decorators';
import { ROLES } from '../../../common/constants';
import { AdminOpsService } from '../services/admin-ops.service';
import { AdminService } from '../services/admin.service';
import {
  CreateActivityDto,
  CreateCareerDto,
  CreateCollegeDto,
  CreateCompetitionDto,
  CreateCounselorAssignmentDto,
  CreateDiagnosticTemplateDto,
  CreateMentorDto,
  CreatePlatformConfigDto,
  CreateSchoolDto,
  CreateSubjectDto,
  CreateTutoringQuestionDto,
  CreateUserDto,
  UpdateActivityDto,
  UpdateCareerDto,
  UpdateCollegeDto,
  UpdateCompetitionDto,
  UpdateDiagnosticTemplateDto,
  UpdateMentorDto,
  UpdateMentorConnectionDto,
  UpdatePlatformConfigDto,
  UpdateSchoolDto,
  UpdateStudentProfileDto,
  UpdateSubjectDto,
  UpdateTutoringQuestionDto,
  UpdateUserDto,
  UpdateApplicationDocumentDto,
  CreateParentLinkDto,
  UpdateParentLinkDto,
  BulkImportCollegesDto,
  BulkImportActivitiesDto,
} from '../dto/admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(ROLES.ADMIN, ROLES.PROGRAM_MANAGER)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminOps: AdminOpsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard stats' })
  async getDashboard() {
    const [base, extended] = await Promise.all([
      this.adminService.getDashboardStats(),
      this.adminOps.getExtendedStats(),
    ]);
    return { ...base, ...extended };
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  listUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers(Number(page), Number(limit), role, search);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create user' })
  createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Deactivate user' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // ─── Colleges ──────────────────────────────────────────────────────────────

  @Get('colleges')
  listColleges(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.adminService.listColleges(Number(page), Number(limit), search);
  }

  @Post('colleges')
  createCollege(@Body() dto: CreateCollegeDto) {
    return this.adminService.createCollege(dto);
  }

  @Patch('colleges/:id')
  updateCollege(@Param('id') id: string, @Body() dto: UpdateCollegeDto) {
    return this.adminService.updateCollege(id, dto);
  }

  @Delete('colleges/:id')
  deleteCollege(@Param('id') id: string) {
    return this.adminService.deleteCollege(id);
  }

  // ─── Activities ────────────────────────────────────────────────────────────

  @Get('activities')
  listActivities(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.adminService.listActivities(Number(page), Number(limit), search);
  }

  @Post('activities')
  createActivity(@Body() dto: CreateActivityDto) {
    return this.adminService.createActivity(dto);
  }

  @Patch('activities/:id')
  updateActivity(@Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.adminService.updateActivity(id, dto);
  }

  @Delete('activities/:id')
  deleteActivity(@Param('id') id: string) {
    return this.adminService.deleteActivity(id);
  }

  // ─── Careers ───────────────────────────────────────────────────────────────

  @Get('careers')
  listCareers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.adminService.listCareers(Number(page), Number(limit), search);
  }

  @Post('careers')
  createCareer(@Body() dto: CreateCareerDto) {
    return this.adminService.createCareer(dto);
  }

  @Patch('careers/:id')
  updateCareer(@Param('id') id: string, @Body() dto: UpdateCareerDto) {
    return this.adminService.updateCareer(id, dto);
  }

  @Delete('careers/:id')
  deleteCareer(@Param('id') id: string) {
    return this.adminService.deleteCareer(id);
  }

  // ─── Subjects ──────────────────────────────────────────────────────────────

  @Get('subjects')
  listSubjects(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.adminService.listSubjects(Number(page), Number(limit), search, category);
  }

  @Post('subjects')
  createSubject(@Body() dto: CreateSubjectDto) {
    return this.adminService.createSubject(dto);
  }

  @Patch('subjects/:id')
  updateSubject(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.adminService.updateSubject(id, dto);
  }

  @Delete('subjects/:id')
  deleteSubject(@Param('id') id: string) {
    return this.adminService.deleteSubject(id);
  }

  // ─── Mentors ───────────────────────────────────────────────────────────────

  @Get('mentors')
  listMentors(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.adminService.listMentors(Number(page), Number(limit), search);
  }

  @Post('mentors')
  createMentor(@Body() dto: CreateMentorDto) {
    return this.adminService.createMentor(dto);
  }

  @Patch('mentors/:id')
  updateMentor(@Param('id') id: string, @Body() dto: UpdateMentorDto) {
    return this.adminService.updateMentor(id, dto);
  }

  @Delete('mentors/:id')
  deleteMentor(@Param('id') id: string) {
    return this.adminService.deleteMentor(id);
  }

  // ─── Competitions ──────────────────────────────────────────────────────────

  @Get('competitions')
  listCompetitions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.adminService.listCompetitions(Number(page), Number(limit), search);
  }

  @Post('competitions')
  createCompetition(@Body() dto: CreateCompetitionDto) {
    return this.adminService.createCompetition(dto);
  }

  @Patch('competitions/:id')
  updateCompetition(@Param('id') id: string, @Body() dto: UpdateCompetitionDto) {
    return this.adminService.updateCompetition(id, dto);
  }

  @Delete('competitions/:id')
  deleteCompetition(@Param('id') id: string) {
    return this.adminService.deleteCompetition(id);
  }

  // ─── Tutoring Questions ────────────────────────────────────────────────────

  @Get('tutoring-questions')
  listTutoringQuestions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('testType') testType?: string,
  ) {
    return this.adminService.listTutoringQuestions(Number(page), Number(limit), search, testType);
  }

  @Post('tutoring-questions')
  createTutoringQuestion(@Body() dto: CreateTutoringQuestionDto) {
    return this.adminService.createTutoringQuestion(dto);
  }

  @Patch('tutoring-questions/:id')
  updateTutoringQuestion(
    @Param('id') id: string,
    @Body() dto: UpdateTutoringQuestionDto,
  ) {
    return this.adminService.updateTutoringQuestion(id, dto);
  }

  @Delete('tutoring-questions/:id')
  deleteTutoringQuestion(@Param('id') id: string) {
    return this.adminService.deleteTutoringQuestion(id);
  }

  // ─── Diagnostic Templates ──────────────────────────────────────────────────

  @Get('diagnostic-templates')
  listDiagnosticTemplates(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.listDiagnosticTemplates(Number(page), Number(limit));
  }

  @Post('diagnostic-templates')
  createDiagnosticTemplate(@Body() dto: CreateDiagnosticTemplateDto) {
    return this.adminService.createDiagnosticTemplate(dto);
  }

  @Patch('diagnostic-templates/:id')
  updateDiagnosticTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateDiagnosticTemplateDto,
  ) {
    return this.adminService.updateDiagnosticTemplate(id, dto);
  }

  @Delete('diagnostic-templates/:id')
  deleteDiagnosticTemplate(@Param('id') id: string) {
    return this.adminService.deleteDiagnosticTemplate(id);
  }

  @Get('diagnostic-sessions')
  listDiagnosticSessions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.listDiagnosticSessions(Number(page), Number(limit));
  }

  // ─── Platform Config ───────────────────────────────────────────────────────

  @Get('config')
  listPlatformConfigs(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('category') category?: string,
  ) {
    return this.adminService.listPlatformConfigs(Number(page), Number(limit), category);
  }

  @Post('config')
  createPlatformConfig(@Body() dto: CreatePlatformConfigDto) {
    return this.adminService.createPlatformConfig(dto);
  }

  @Patch('config/:id')
  updatePlatformConfig(@Param('id') id: string, @Body() dto: UpdatePlatformConfigDto) {
    return this.adminService.updatePlatformConfig(id, dto);
  }

  @Delete('config/:id')
  deletePlatformConfig(@Param('id') id: string) {
    return this.adminService.deletePlatformConfig(id);
  }

  // ─── Schools ───────────────────────────────────────────────────────────────

  @Get('schools')
  listSchools(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.adminService.listSchools(Number(page), Number(limit), search);
  }

  @Post('schools')
  createSchool(@Body() dto: CreateSchoolDto) {
    return this.adminService.createSchool(dto);
  }

  @Patch('schools/:id')
  updateSchool(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return this.adminService.updateSchool(id, dto);
  }

  @Delete('schools/:id')
  deleteSchool(@Param('id') id: string) {
    return this.adminService.deleteSchool(id);
  }

  // ─── Counselor Assignments ─────────────────────────────────────────────────

  @Get('counselor-assignments')
  listCounselorAssignments(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adminService.listCounselorAssignments(Number(page), Number(limit));
  }

  @Post('counselor-assignments')
  createCounselorAssignment(@Body() dto: CreateCounselorAssignmentDto) {
    return this.adminService.createCounselorAssignment(dto);
  }

  @Delete('counselor-assignments/:id')
  deleteCounselorAssignment(@Param('id') id: string) {
    return this.adminService.deleteCounselorAssignment(id);
  }

  // ─── Mentor Connections ──────────────────────────────────────────────────────

  @Get('mentor-connections')
  listMentorConnections(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.adminService.listMentorConnections(Number(page), Number(limit), status);
  }

  @Patch('mentor-connections/:id')
  updateMentorConnection(
    @Param('id') id: string,
    @Body() dto: UpdateMentorConnectionDto,
  ) {
    return this.adminService.updateMentorConnection(id, dto);
  }

  // ─── Student profiles ──────────────────────────────────────────────────────

  @Get('profiles')
  listProfiles(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.adminOps.listStudentProfiles(Number(page), Number(limit), search);
  }

  @Get('profiles/:userId')
  getProfile(@Param('userId') userId: string) {
    return this.adminOps.getStudentProfile(userId);
  }

  @Patch('profiles/:userId')
  updateProfile(@Param('userId') userId: string, @Body() dto: UpdateStudentProfileDto) {
    return this.adminOps.updateStudentProfile(userId, dto);
  }

  // ─── Applications ────────────────────────────────────────────────────────────

  @Get('application-documents')
  listApplicationDocuments(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('userId') userId?: string,
    @Query('type') type?: string,
  ) {
    return this.adminOps.listApplicationDocuments(
      Number(page),
      Number(limit),
      search,
      userId,
      type,
    );
  }

  @Get('application-documents/:id')
  getApplicationDocument(@Param('id') id: string) {
    return this.adminOps.getApplicationDocument(id);
  }

  @Patch('application-documents/:id')
  updateApplicationDocument(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDocumentDto,
  ) {
    return this.adminOps.updateApplicationDocument(id, dto);
  }

  @Delete('application-documents/:id')
  deleteApplicationDocument(@Param('id') id: string) {
    return this.adminOps.deleteApplicationDocument(id);
  }

  // ─── Activity planner ──────────────────────────────────────────────────────

  @Get('activity-plan-items')
  listActivityPlanItems(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.adminOps.listActivityPlanItems(Number(page), Number(limit), userId, status);
  }

  @Delete('activity-plan-items/:id')
  deleteActivityPlanItem(@Param('id') id: string) {
    return this.adminOps.deleteActivityPlanItem(id);
  }

  @Get('saved-activities')
  listSavedActivities(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('userId') userId?: string,
  ) {
    return this.adminOps.listSavedActivities(Number(page), Number(limit), userId);
  }

  // ─── College recommendations ─────────────────────────────────────────────────

  @Get('college-recommendations')
  listCollegeRecommendations(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('userId') userId?: string,
  ) {
    return this.adminOps.listCollegeRecommendations(Number(page), Number(limit), userId);
  }

  // ─── Homeschooling ops ───────────────────────────────────────────────────────

  @Get('homeschool-progress')
  listHomeschoolProgress(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('userId') userId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminOps.listHomeschoolProgress(Number(page), Number(limit), userId, search);
  }

  @Delete('homeschool-progress/:id')
  deleteHomeschoolProgress(@Param('id') id: string) {
    return this.adminOps.deleteHomeschoolProgress(id);
  }

  @Get('homeschool-syllabi')
  listHomeschoolSyllabi(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('board') board?: string,
  ) {
    return this.adminOps.listHomeschoolSyllabi(Number(page), Number(limit), board);
  }

  @Delete('homeschool-syllabi/:id')
  deleteHomeschoolSyllabus(@Param('id') id: string) {
    return this.adminOps.deleteHomeschoolSyllabus(id);
  }

  // ─── Parent links ────────────────────────────────────────────────────────────

  @Get('parent-links')
  listParentLinks(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.adminOps.listParentLinks(Number(page), Number(limit));
  }

  @Post('parent-links')
  createParentLink(@Body() dto: CreateParentLinkDto) {
    return this.adminOps.createParentLink(dto);
  }

  @Patch('parent-links/:id')
  updateParentLink(@Param('id') id: string, @Body() dto: UpdateParentLinkDto) {
    return this.adminOps.updateParentLink(id, dto);
  }

  @Delete('parent-links/:id')
  deleteParentLink(@Param('id') id: string) {
    return this.adminOps.deleteParentLink(id);
  }

  // ─── Job readiness ─────────────────────────────────────────────────────────

  @Get('job-assets')
  listJobAssets(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('userId') userId?: string,
  ) {
    return this.adminOps.listJobAssets(Number(page), Number(limit), userId);
  }

  @Delete('job-assets/:id')
  deleteJobAsset(@Param('id') id: string) {
    return this.adminOps.deleteJobAsset(id);
  }

  // ─── Tutoring analytics ──────────────────────────────────────────────────────

  @Get('tutoring-attempts')
  listTutoringAttempts(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('userId') userId?: string,
    @Query('testType') testType?: string,
  ) {
    return this.adminOps.listTutoringAttempts(Number(page), Number(limit), userId, testType);
  }

  @Get('tutoring-sessions')
  listTutoringSessions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('userId') userId?: string,
  ) {
    return this.adminOps.listTutoringSessions(Number(page), Number(limit), userId);
  }

  // ─── Diagnostic results ──────────────────────────────────────────────────────

  @Get('diagnostic-results')
  listDiagnosticResults(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('userId') userId?: string,
  ) {
    return this.adminOps.listDiagnosticResults(Number(page), Number(limit), userId);
  }

  @Get('diagnostic-results/:sessionId')
  getDiagnosticResult(@Param('sessionId') sessionId: string) {
    return this.adminOps.getDiagnosticResult(sessionId);
  }

  // ─── UK compliance ─────────────────────────────────────────────────────────

  @Get('compliance/gatsby')
  listGatsbyLogs(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.adminOps.listGatsbyLogs(Number(page), Number(limit));
  }

  @Get('compliance/ceiag')
  listCeiagEncounters(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.adminOps.listCeiagEncounters(Number(page), Number(limit));
  }

  @Get('compliance/ucas')
  listUcasApplications(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.adminOps.listUcasApplications(Number(page), Number(limit));
  }

  // ─── Bulk & sync ─────────────────────────────────────────────────────────────

  @Post('activities/sync')
  syncActivities(@Query('scrape') scrape?: string) {
    return this.adminOps.syncActivities(scrape === '1' || scrape === 'true');
  }

  @Post('colleges/import')
  bulkImportColleges(@Body() dto: BulkImportCollegesDto) {
    return this.adminOps.bulkImportColleges(dto);
  }

  @Post('activities/import')
  bulkImportActivities(@Body() dto: BulkImportActivitiesDto) {
    return this.adminOps.bulkImportActivities(dto);
  }

  // ─── Notifications ─────────────────────────────────────────────────────────

  @Get('notifications/stats')
  notificationStats() {
    return this.adminOps.getNotificationStats();
  }

  @Get('notifications')
  listNotifications(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('userId') userId?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.adminOps.listNotifications(Number(page), Number(limit), { userId, eventType });
  }

  @Get('notification-deliveries')
  listNotificationDeliveries(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('channel') channel?: string,
  ) {
    return this.adminOps.listNotificationDeliveries(Number(page), Number(limit), { status, channel });
  }
}
