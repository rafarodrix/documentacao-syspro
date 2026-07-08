import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { json, urlencoded } from 'express';
import { validateChatwootRuntimeConfigOrThrow } from './modules/integrations/chatwoot/chatwoot-config';
import { readEvolutionRuntimeConfig } from '@dosc-syspro/config';

function captureRawBody(req: any, _res: any, buffer: Buffer) {
  if (buffer?.length) {
    req.rawBody = Buffer.from(buffer);
  }
}

async function bootstrap() {
  const evolutionRuntime = readEvolutionRuntimeConfig();
  Logger.log(JSON.stringify({
    stage: 'runtime_config_bootstrap',
    flow: 'chatwoot_to_evolution',
    hasEvolutionApiUrl: Boolean(evolutionRuntime.apiUrl),
    hasEvolutionApiKey: Boolean(evolutionRuntime.apiKey),
    evolutionInstance: evolutionRuntime.instance || null,
    hasEvolutionInstanceToken: Boolean(evolutionRuntime.instanceToken),
  }), 'Bootstrap');

  const hasAnyEvolutionConfig = Boolean(
    evolutionRuntime.apiUrl ||
    evolutionRuntime.apiKey ||
    evolutionRuntime.instance ||
    evolutionRuntime.instanceToken,
  );
  const hasPartialEvolutionConfig = Boolean(
    (evolutionRuntime.apiUrl || evolutionRuntime.apiKey) &&
    !evolutionRuntime.instance,
  );
  if (hasAnyEvolutionConfig && hasPartialEvolutionConfig) {
    throw new Error(
      'Configuracao Evolution invalida no runtime: EVOLUTION_INSTANCE obrigatoria quando EVOLUTION_API_URL/EVOLUTION_API_KEY estiverem definidos.',
    );
  }

  try {
    validateChatwootRuntimeConfigOrThrow();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida ao validar Chatwoot';
    Logger.error(
      `${message}. A API continuara iniciando, mas as rotas que dependem de Chatwoot podem falhar ate a configuracao ser corrigida.`,
      undefined,
      'Bootstrap',
    );
  }
  const app = await NestFactory.create(AppModule, { rawBody: true, bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.use(json({ limit: '50mb', verify: captureRawBody }));
  app.use(urlencoded({ extended: true, limit: '50mb', verify: captureRawBody }));
  app.use('/webhooks/chatwoot', (req: any, _res: any, next: () => void) => {
    req.url = '/api/webhooks/chatwoot';
    next();
  });

  // Prefixo universal para as rotas do NestJS
  app.setGlobalPrefix('api');
  

  const port = process.env.PORT || 3000;
  
  // O host 0.0.0.0 é OBRIGATÓRIO em contêineres Docker para receber tráfego externo
  await app.listen(port, '0.0.0.0');
  Logger.log(`Backend NestJS Standalone rodando na porta ${port}`, 'Bootstrap');
}
bootstrap();
