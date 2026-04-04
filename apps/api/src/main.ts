import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Prefixo universal para as rotas do NestJS
  app.setGlobalPrefix('api');
  
  // Porta paralela à operacao de Next.js (que usa 3000)
  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(`Backend NestJS Standalone rodando na porta ${port}`, 'Bootstrap');
}
bootstrap();
