import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration';
import { envValidationSchema } from './config/configuration';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { DatabaseRepositoriesModule } from './infrastructure/database/database-repositories.module';
import { AppCacheModule } from './infrastructure/cache/cache.module';
import { FirebaseModule } from './infrastructure/firebase/firebase.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { AdminModule } from './modules/admin/admin.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module';
import { CollegesModule } from './modules/colleges/colleges.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { JobReadinessModule } from './modules/job-readiness/job-readiness.module';
import { TutoringModule } from './modules/tutoring/tutoring.module';
import { CareersModule } from './modules/careers/careers.module';
import { CareerMapModule } from './modules/career-map/career-map.module';
import { ActivityPlannerModule } from './modules/activity-planner/activity-planner.module';
import { MentorsModule } from './modules/mentors/mentors.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { CounselorModule } from './modules/counselor/counselor.module';
import { ParentModule } from './modules/parent/parent.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100,
      },
    ]),
    PrismaModule,
    DatabaseRepositoriesModule,
    AppCacheModule,
    FirebaseModule,
    AuthModule,
    HealthModule,
    AdminModule,
    ProfilesModule,
    DiagnosticsModule,
    CollegesModule,
    ActivitiesModule,
    ApplicationsModule,
    JobReadinessModule,
    TutoringModule,
    CareersModule,
    CareerMapModule,
    ActivityPlannerModule,
    MentorsModule,
    ComplianceModule,
    CounselorModule,
    ParentModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
