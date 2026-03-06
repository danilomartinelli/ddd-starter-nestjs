import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { get } from 'env-var';
import { bootstrapSecurity } from '@repo/infra';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Structured logging
  app.useLogger(app.get(Logger));

  // Security
  bootstrapSecurity(app, {
    corsOrigins: get('CORS_ORIGINS')
      .default('')
      .asString()
      .split(',')
      .filter(Boolean),
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger
  const options = new DocumentBuilder().build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document);

  // Lifecycle
  app.enableShutdownHooks();

  await app.listen(get('PORT').default(3000).asIntPositive());
}
bootstrap();
