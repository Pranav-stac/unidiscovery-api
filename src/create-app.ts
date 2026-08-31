import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { Logger } from 'nestjs-pino';
import type { AbstractHttpAdapter } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';

export async function createApp(
  adapter?: AbstractHttpAdapter,
): Promise<INestApplication> {
  const app = adapter
    ? await NestFactory.create(AppModule, adapter, { bufferLogs: true })
    : await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const logger = app.get(Logger);

  app.useLogger(logger);
  app.use(helmet());
  app.use(compression());

  const corsOrigins = configService.get<string[]>('api.corsOrigins', [
    'http://localhost:3000',
  ]);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const apiPrefix = configService.get<string>('api.prefix', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('UniDiscovery API')
    .setDescription(
      'API for diagnostics, college matching, applications, and career planning',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.init();
  return app;
}
