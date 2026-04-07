import { Controller, All, Req, Res, Post, Get, Body } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { toNodeHandler } from 'better-auth/node';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body() body: { name?: string; email?: string; password?: string },
    @Req() req: Request,
  ) {
    return this.authService.register(body, req.headers);
  }

  @Get('protected-session')
  getProtectedSession(@Req() req: Request) {
    return this.authService.getProtectedSession(req.headers);
  }

  // Captura qualquer requisicao em /api/auth/* e repassa para o engine do better-auth
  @All('*path')
  handleAuth(@Req() req: Request, @Res() res: Response) {
    return toNodeHandler(this.authService.auth)(req, res);
  }
}
