import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const STARTUP_SQL_FILES = [
  'add-planner-fields.sql',
  'add-notifications.sql',
  'add-homeschool.sql',
];

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  private async applyStartupMigrations(): Promise<void> {
    for (const file of STARTUP_SQL_FILES) {
      const sqlPath = path.join(process.cwd(), 'prisma', file);
      if (!fs.existsSync(sqlPath)) continue;
      try {
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await this.$executeRawUnsafe(sql);
        this.logger.log(`Applied startup SQL: ${file}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Startup SQL skipped for ${file}: ${message}`);
      }
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.applyStartupMigrations();
    this.logger.log('Database connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
