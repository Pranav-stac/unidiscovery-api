import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { UsersRepository } from '../../infrastructure/database/repositories/users.repository';
import { ProfilesRepository } from '../../infrastructure/database/repositories/profiles.repository';
import { FirebaseModule } from '../../infrastructure/firebase/firebase.module';
@Module({
  imports: [
    FirebaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>(
            'jwt.expiresIn',
            '7d',
          ) as `${number}d`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersRepository, ProfilesRepository],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
