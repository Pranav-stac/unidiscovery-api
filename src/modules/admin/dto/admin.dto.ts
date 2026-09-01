import { IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import {
  ActivityType,
  MentorConnectionStatus,
  TutoringTestType,
  UserRole,
} from '@prisma/client';

export class PaginationQueryDto {
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
  @IsOptional() @IsString() search?: string;
}

export class CreateUserDto {
  @IsEmail() email!: string;
  @MinLength(8) password!: string;
  @IsString() name!: string;
  @IsEnum(UserRole) role!: UserRole;
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @MinLength(8) password?: string;
}

export class CreateCollegeDto {
  @IsString() name!: string;
  @IsString() country!: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() degree?: string;
  @IsOptional() @IsString() field?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateCollegeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() degree?: string;
  @IsOptional() @IsString() field?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateActivityDto {
  @IsString() title!: string;
  @IsEnum(ActivityType) type!: ActivityType;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() gradeMin?: number;
  @IsOptional() @IsInt() gradeMax?: number;
  @IsOptional() @IsArray() interests?: string[];
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateActivityDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsEnum(ActivityType) type?: ActivityType;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() gradeMin?: number;
  @IsOptional() @IsInt() gradeMax?: number;
  @IsOptional() @IsArray() interests?: string[];
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateCareerDto {
  @IsString() slug!: string;
  @IsString() title!: string;
  @IsString() category!: string;
  @IsString() description!: string;
  @IsOptional() @IsArray() subjects?: string[];
  @IsOptional() @IsArray() skills?: string[];
  @IsOptional() @IsInt() salaryMin?: number;
  @IsOptional() @IsInt() salaryMax?: number;
  @IsOptional() @IsString() growthOutlook?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateCareerDto {
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() subjects?: string[];
  @IsOptional() @IsArray() skills?: string[];
  @IsOptional() @IsInt() salaryMin?: number;
  @IsOptional() @IsInt() salaryMax?: number;
  @IsOptional() @IsString() growthOutlook?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateSubjectDto {
  @IsString() slug!: string;
  @IsString() title!: string;
  @IsString() category!: string;
  @IsString() description!: string;
  @IsOptional() @IsArray() careers?: string[];
  @IsOptional() @IsArray() levels?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateSubjectDto {
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() careers?: string[];
  @IsOptional() @IsArray() levels?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateMentorDto {
  @IsString() name!: string;
  @IsString() field!: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsArray() expertise?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateMentorDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() field?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsArray() expertise?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateCompetitionDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() partner?: string;
  @IsOptional() @IsString() deadline?: string;
  @IsOptional() @IsInt() gradeMin?: number;
  @IsOptional() @IsInt() gradeMax?: number;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateCompetitionDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() partner?: string;
  @IsOptional() @IsString() deadline?: string;
  @IsOptional() @IsInt() gradeMin?: number;
  @IsOptional() @IsInt() gradeMax?: number;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateTutoringQuestionDto {
  @IsEnum(TutoringTestType) testType!: TutoringTestType;
  @IsString() question!: string;
  @IsOptional() options?: unknown;
  @IsOptional() @IsString() correctAnswer?: string;
  @IsOptional() @IsString() explanation?: string;
  @IsOptional() @IsInt() @Min(1) difficulty?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateTutoringQuestionDto {
  @IsOptional() @IsEnum(TutoringTestType) testType?: TutoringTestType;
  @IsOptional() @IsString() question?: string;
  @IsOptional() options?: unknown;
  @IsOptional() @IsString() correctAnswer?: string;
  @IsOptional() @IsString() explanation?: string;
  @IsOptional() @IsInt() @Min(1) difficulty?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateDiagnosticTemplateDto {
  @IsString() slug!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  config!: unknown;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateDiagnosticTemplateDto {
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() config?: unknown;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreatePlatformConfigDto {
  @IsString() key!: string;
  value!: unknown;
  @IsString() category!: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}

export class UpdatePlatformConfigDto {
  @IsOptional() value?: unknown;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}

export class CreateSchoolDto {
  @IsString() name!: string;
  @IsString() country!: string;
  @IsOptional() @IsString() type?: string;
}

export class UpdateSchoolDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() type?: string;
}

export class CreateCounselorAssignmentDto {
  @IsString() counselorId!: string;
  @IsString() studentId!: string;
  @IsOptional() @IsString() schoolId?: string;
}

export class UpdateMentorConnectionDto {
  @IsEnum(MentorConnectionStatus) status!: MentorConnectionStatus;
}
