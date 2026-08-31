import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { resolve } from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    if (getApps().length > 0) {
      return;
    }

    const serviceAccountPath = this.configService.get<string>(
      'firebase.serviceAccountPath',
    );
    if (!serviceAccountPath) {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT_PATH not set — Google login disabled',
      );
      return;
    }

    const absolutePath = resolve(serviceAccountPath);
    const serviceAccount = JSON.parse(
      readFileSync(absolutePath, 'utf8'),
    ) as ServiceAccount;

    initializeApp({
      credential: cert(serviceAccount),
    });

    this.logger.log('Firebase Admin initialized');
  }

  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    if (getApps().length === 0) {
      throw new Error('Firebase Admin is not configured');
    }

    return getAuth().verifyIdToken(idToken);
  }
}
