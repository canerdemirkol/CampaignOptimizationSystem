import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppLoggerService } from './infrastructure/logger/app-logger.service';
import { HttpLoggingInterceptor } from './infrastructure/logger/http-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Custom logger & HTTP logging interceptor
  const appLogger = app.get(AppLoggerService);
  app.useLogger(appLogger);
  app.useGlobalInterceptors(new HttpLoggingInterceptor(appLogger));

  // Security
  app.use(helmet());
  app.use(cookieParser());

  // CORS with credentials for httpOnly cookies
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Campaign Optimization API')
    .setDescription('Enterprise-grade Campaign Optimization System API')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  appLogger.log(`Application is running on: http://localhost:${port}`, 'Bootstrap');
}
bootstrap();
