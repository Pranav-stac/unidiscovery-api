import { Injectable } from '@nestjs/common';
import { Prisma, StudentProfile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { CACHE_KEYS } from '../../../common/constants';

@Injectable()
export class ProfilesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async findByUserId(userId: string): Promise<StudentProfile | null> {
    const cacheKey = CACHE_KEYS.profile(userId);
    const cached = await this.cacheService.get<StudentProfile>(cacheKey);
    if (cached) {
      return cached;
    }

    const profile = await this.prisma.studentProfile.findFirst({
      where: { userId, deletedAt: null },
    });

    if (profile) {
      await this.cacheService.set(cacheKey, profile);
    }

    return profile;
  }

  async createForUser(userId: string): Promise<StudentProfile> {
    const profile = await this.prisma.studentProfile.create({
      data: { userId },
    });
    await this.cacheService.set(CACHE_KEYS.profile(userId), profile);
    return profile;
  }

  async update(
    userId: string,
    data: Prisma.StudentProfileUpdateInput,
  ): Promise<StudentProfile> {
    const profile = await this.prisma.studentProfile.update({
      where: { userId },
      data,
    });
    await this.cacheService.invalidateUser(userId);
    await this.cacheService.set(CACHE_KEYS.profile(userId), profile);
    return profile;
  }
}
