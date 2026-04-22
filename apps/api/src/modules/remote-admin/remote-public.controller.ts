import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RemotePublicService } from './remote-public.service';

@Controller('remote')
export class RemotePublicController {
  constructor(private readonly remotePublicService: RemotePublicService) {}

  @Post('agents/discover')
  discover(@Req() req: Request, @Body() body: unknown) {
    return this.remotePublicService.discover(body, req);
  }

  @Post('rustdesk/bootstrap')
  bootstrap(@Req() req: Request, @Body() body: unknown) {
    return this.remotePublicService.bootstrap(body, req);
  }

  @Post('rustdesk/sync')
  sync(@Req() req: Request, @Body() body: unknown) {
    return this.remotePublicService.sync(body, req);
  }

  @Post('rustdesk/ack')
  ack(@Req() req: Request, @Body() body: unknown) {
    return this.remotePublicService.ack(body, req);
  }
}
