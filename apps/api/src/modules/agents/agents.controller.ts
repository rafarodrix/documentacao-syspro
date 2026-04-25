import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('register')
  register(
    @Headers('x-internal-api-key') internalApiKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.agentsService.register(internalApiKey, body);
  }

  @Post('heartbeat')
  heartbeat(
    @Headers('x-internal-api-key') internalApiKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.agentsService.heartbeat(internalApiKey, body);
  }

  @Get(':deviceId/desired-state')
  desiredState(
    @Headers('x-internal-api-key') internalApiKey: string | undefined,
    @Param('deviceId') deviceId: string,
  ) {
    return this.agentsService.getDesiredState(internalApiKey, deviceId);
  }
}
