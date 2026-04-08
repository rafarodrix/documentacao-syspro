import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { validateChatwootRuntimeConfigOrThrow } from './modules/integrations/chatwoot/chatwoot-config';

async function bootstrap() {
  validateChatwootRuntimeConfigOrThrow();
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  // Prefixo universal para as rotas do NestJS
  app.setGlobalPrefix('api');
  
  // Porta configurada no Dokploy
  const port = process.env.PORT || 3001;
  
  // O host 0.0.0.0 é OBRIGATÓRIO em contêineres Docker para receber tráfego externo
  await app.listen(port, '0.0.0.0');
  Logger.log(`Backend NestJS Standalone rodando na porta ${port}`, 'Bootstrap');
}
bootstrap();
