import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { DocsService } from './docs.service';

@Controller('docs/views')
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  @Get()
  getViews(@Req() req: Request) {
    return this.docsService.getViews(req.headers);
  }

  @Post()
  registerView(
    @Req() req: Request,
    @Body() body: { href?: string; title?: string; visitedAt?: number },
  ) {
    return this.docsService.registerView(body, req.headers);
  }
}
