import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync } from 'fs';
import * as express from 'express';

async function bootstrap() {
  // Disable the built-in body parser so we control it fully below
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  // ── 1. CORS first ────────────────────────────────────────────────────────
  app.enableCors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ── 2. Body-parser — skip multipart so Multer handles it untouched ───────
  app.use((req, _res, next) => {
    if ((req.headers['content-type'] ?? '').startsWith('multipart/')) {
      return next();                        // hand off to Multer
    }
    express.json({ limit: '10mb' })(req, _res, next);
  });

  app.use((req, _res, next) => {
    if ((req.headers['content-type'] ?? '').startsWith('multipart/')) {
      return next();
    }
    express.urlencoded({ limit: '10mb', extended: true })(req, _res, next);
  });

  // ── 3. Static assets ─────────────────────────────────────────────────────
  mkdirSync('./uploads/logos', { recursive: true });
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // ── 4. Validation ─────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(3000);
}
bootstrap();