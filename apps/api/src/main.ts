import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Prefixo universal para as rotas do NestJS
  app.setGlobalPrefix('api');
  
  // Porta paralela à operacao de Next.js (que usa 3000)
  const port = process.env.PORT || 3001;
  
  // O host 0.0.0.0 é OBRIGATÓRIO em contêineres Docker para receber tráfego externo
  await app.listen(port, '0.0.0.0');
  Logger.log(`Backend NestJS Standalone rodando na porta ${port}`, 'Bootstrap');
}
bootstrap();
