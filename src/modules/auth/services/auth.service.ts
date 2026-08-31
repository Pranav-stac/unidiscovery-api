import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { UserRole } from '@prisma/client';
import { UsersRepository } from '../../../infrastructure/database/repositories/users.repository';
import { ProfilesRepository } from '../../../infrastructure/database/repositories/profiles.repository';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { FirebaseService } from '../../../infrastructure/firebase/firebase.service';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { LoginDto, RegisterDto } from '../dto/auth.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  profile: unknown;
  tokens: AuthTokens;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly profilesRepository: ProfilesRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.cacheService.connect();
    await this.seedAdminUser();
  }

  private async seedAdminUser(): Promise<void> {
    const email = this.configService.get<string>(
      'admin.email',
      'admin@platform.local',
    );
    const existing = await this.usersRepository.findByEmail(email);
    if (existing) {
      return;
    }

    const password = this.configService.get<string>(
      'admin.password',
      'ChangeMe123!',
    );
    const name = this.configService.get<string>('admin.name', 'Platform Admin');
    const passwordHash = await this.hashPassword(password);

    await this.usersRepository.create({
      email,
      name,
      passwordHash,
      role: UserRole.ADMIN,
    });

    this.logger.log(`Seeded admin user: ${email}`);
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.usersRepository.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      role: UserRole.STUDENT,
    });

    const profile = await this.profilesRepository.createForUser(user.id);
    const tokens = await this.generateTokens(user.id, user.role);

    return {
      user: this.sanitizeUser(user),
      profile,
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersRepository.updateLastLogin(user.id);
    await this.cacheService.invalidateUser(user.id);

    let profile = await this.profilesRepository.findByUserId(user.id);
    if (!profile) {
      profile = await this.profilesRepository.createForUser(user.id);
    }

    const tokens = await this.generateTokens(user.id, user.role);

    return {
      user: this.sanitizeUser(user),
      profile,
      tokens,
    };
  }

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    let decoded: DecodedIdToken;
    try {
      decoded = await this.firebaseService.verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    const email = decoded.email;
    if (!email) {
      throw new UnauthorizedException('Google account has no email');
    }

    let user = await this.usersRepository.findByEmail(email);
    if (!user) {
      const passwordHash = await this.hashPassword(
        randomBytes(32).toString('hex'),
      );
      const displayName =
        typeof decoded.name === 'string' && decoded.name.trim().length > 0
          ? decoded.name.trim()
          : email.split('@')[0];
      user = await this.usersRepository.create({
        email,
        name: displayName,
        passwordHash,
        role: UserRole.STUDENT,
      });
      await this.profilesRepository.createForUser(user.id);
    } else {
      await this.usersRepository.updateLastLogin(user.id);
      await this.cacheService.invalidateUser(user.id);
    }

    let profile = await this.profilesRepository.findByUserId(user.id);
    if (!profile) {
      profile = await this.profilesRepository.createForUser(user.id);
    }

    const tokens = await this.generateTokens(user.id, user.role);

    return {
      user: this.sanitizeUser(user),
      profile,
      tokens,
    };
  }

  async getMe(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const profile = await this.profilesRepository.findByUserId(userId);
    return {
      user: this.sanitizeUser(user),
      profile,
    };
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = this.configService.get<number>('bcrypt.saltRounds', 12);
    return bcrypt.hash(password, saltRounds);
  }

  private async generateTokens(
    userId: string,
    role: UserRole,
  ): Promise<AuthTokens> {
    const payload = { sub: userId, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.secret'),
        expiresIn: this.configService.get<string>(
          'jwt.expiresIn',
          '7d',
        ) as `${number}d`,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.secret'),
        expiresIn: this.configService.get<string>(
          'jwt.refreshExpiresIn',
          '30d',
        ) as `${number}d`,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
