import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { createApp } from './create-app';

async function bootstrap() {
  const app = await createApp();
  const configService = app.get(ConfigService);
  const logger = app.get(Logger);

  const apiPrefix = configService.get<string>('api.prefix', 'api/v1');
  const port = configService.get<number>('api.port', 4000);
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger docs at http://localhost:${port}/docs`);
}

void bootstrap();
