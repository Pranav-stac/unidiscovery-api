import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { spawn } from 'child_process';
import * as path from 'path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import {
  loadScrapedOpportunities,
  scraperOutputDir,
  SCRAPED_SOURCES,
  type NormalizedOpportunity,
} from '../data/opportunity-catalog';

function sourceKey(item: { metadata?: Record<string, unknown>; url?: string | null; title?: string }) {
  const meta = item.metadata ?? {};
  if (meta.source && meta.sourceId) return `${meta.source}:${meta.sourceId}`;
  return (item.url ?? item.title ?? '').toLowerCase();
}

@Injectable()
export class OpportunitySyncService {
  private readonly logger = new Logger(OpportunitySyncService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {}

  @Cron('0 3 * * 0')
  async weeklySync() {
    if (!this.config.get<boolean>('opportunities.syncEnabled')) return;
    await this.sync({ scrape: this.config.get<boolean>('opportunities.scrapeEnabled') });
  }

  async sync(options: { scrape?: boolean } = {}) {
    if (this.running) return { ok: false, message: 'A sync is already running.' };
    this.running = true;
    try {
      if (options.scrape) {
        await this.runScrapers();
      }
      const result = await this.importFromDisk();
      await this.cache.del('activities:filters');
      return { ok: true, ...result };
    } finally {
      this.running = false;
    }
  }

  private async runScrapers() {
    const cwd = path.resolve(scraperOutputDir(), '..');
    const scripts = ['scrape.js', 'scrape-snowday.js', 'scrape-extracurricularhub.js'];
    for (const script of scripts) {
      this.logger.log(`Scraping ${script}`);
      await new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, [script], { cwd, stdio: 'inherit', windowsHide: true });
        child.on('exit', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`${script} exited with ${code}`));
        });
        child.on('error', reject);
      });
    }
  }

  private async importFromDisk() {
    const { merged, items } = loadScrapedOpportunities();
    if (!items.length) {
      this.logger.warn('No scraped opportunity files found. Run the scrapers first.');
      return { parsed: merged, unique: 0, created: 0, updated: 0, deactivated: 0 };
    }

    const existing = await this.prisma.activity.findMany({
      where: {
        OR: SCRAPED_SOURCES.map((source) => ({
          metadata: { path: ['source'], equals: source },
        })),
      },
      select: { id: true, url: true, title: true, metadata: true },
    });
    const byKey = new Map<string, string>();
    for (const row of existing) {
      byKey.set(sourceKey({ ...row, metadata: (row.metadata ?? {}) as Record<string, unknown> }), row.id);
    }

    let created = 0;
    let updated = 0;
    const keep = new Set<string>();
    const toCreate: NormalizedOpportunity[] = [];

    for (const item of items) {
      const key = sourceKey(item);
      const id = byKey.get(key);
      if (id) {
        await this.prisma.activity.update({ where: { id }, data: this.toRow(item) });
        keep.add(id);
        updated += 1;
      } else {
        toCreate.push(item);
      }
    }

    for (let index = 0; index < toCreate.length; index += 80) {
      const chunk = toCreate.slice(index, index + 80);
      await this.prisma.activity.createMany({ data: chunk.map((item) => this.toRow(item)) });
      created += chunk.length;
    }

    const stale = existing.filter((row) => !keep.has(row.id)).map((row) => row.id);
    if (stale.length) {
      await this.prisma.activity.updateMany({
        where: { id: { in: stale } },
        data: { isActive: false },
      });
    }

    this.logger.log(
      `Opportunity import: ${items.length} unique from ${merged} parsed (${created} new, ${updated} updated, ${stale.length} deactivated)`,
    );
    return {
      parsed: merged,
      unique: items.length,
      created,
      updated,
      deactivated: stale.length,
    };
  }

  private toRow(item: NormalizedOpportunity) {
    return {
      title: item.title,
      type: item.type,
      description: item.description,
      gradeMin: item.gradeMin,
      gradeMax: item.gradeMax,
      interests: item.interests,
      url: item.url,
      metadata: item.metadata as Prisma.InputJsonObject,
      isActive: true,
      deletedAt: null,
    };
  }
}
