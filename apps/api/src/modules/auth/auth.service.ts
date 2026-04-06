import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import { nodemailer } from 'nodemailer';
import type { IncomingHttpHeaders } from 'node:http';

type RegisterInput = {
  name?: string;
  email?: string;
  password?: string;
};

type AuthApiError = {
  body?: {
    message?: string;
  };
};

@Injectable()
export class AuthService {
  public readonly auth;

  constructor(private prisma: PrismaService) {
    // Instancia o nucleo do better-auth rodando 100% no backend NestJS
    this.auth = betterAuth({
      database: prismaAdapter(this.prisma, { provider: 'postgresql' }),
      plugins: [admin()],
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        rateLimit: {
          window: 60 * 15,
          max: 5,
        },
        resetPasswordTokenExpiresIn: 60 * 60,
        sendResetPassword: async ({ user, url }) => {
          await this.sendResetPasswordEmail(user.email, url, user.name ?? 'Usuario');
        },
      },
      // Estas variaveis de ambiente devem existir no Dokploy / .env
      secret: process.env.BETTER_AUTH_SECRET || 'fallback-secret-para-dev-local',
      baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    });
  }

  async register(input: RegisterInput, rawHeaders?: IncomingHttpHeaders) {
    const name = input.name?.trim();
    const email = input.email?.trim();
    const password = input.password;

    if (!name || !email || !password) {
      return { success: false, error: 'Preencha todos os campos.' };
    }

    try {
      const authResponse = await this.auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
        },
        headers: this.toHeaders(rawHeaders),
      });

      if (!authResponse?.user) {
        return { success: false, error: 'Erro ao registrar usuario.' };
      }

      await this.prisma.user.update({
        where: { id: authResponse.user.id },
        data: {
          role: Role.CLIENTE_USER,
          isActive: true,
        },
      });

      return { success: true };
    } catch (error: unknown) {
      const authMessage = this.getAuthErrorMessage(error);
      return { success: false, error: authMessage ?? 'Erro ao processar cadastro.' };
    }
  }

  private getAuthErrorMessage(error: unknown): string | null {
    if (typeof error !== 'object' || error === null) return null;

    const authError = error as AuthApiError;
    return authError.body?.message ?? null;
  }

  private toHeaders(rawHeaders?: IncomingHttpHeaders): Headers {
    const headers = new Headers();
    if (!rawHeaders) return headers;

    for (const [key, value] of Object.entries(rawHeaders)) {
      if (!value) continue;
      if (Array.isArray(value)) {
        headers.set(key, value.join(', '));
        continue;
      }
      headers.set(key, value);
    }

    return headers;
  }

  private async sendResetPasswordEmail(email: string, resetLink: string, userName: string) {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;

    if (!gmailUser || !gmailPass) {
      console.error('Configuracao de e-mail ausente: GMAIL_USER ou GMAIL_PASS nao definidos.');
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      await transporter.sendMail({
        from: `"Trilink Suporte" <${gmailUser}>`,
        to: email,
        subject: 'Redefinicao de Senha - Syspro ERP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #333;">Ola, ${userName}</h2>
            <p style="color: #555; font-size: 16px;">
              Recebemos uma solicitacao para redefinir a senha da sua conta no <strong>Syspro ERP</strong>.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Redefinir Minha Senha
              </a>
            </div>
            <p style="color: #888; font-size: 14px;">
              Link direto: <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              Se voce nao solicitou, ignore este e-mail.
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Falha critica ao enviar e-mail de redefinicao:', error);
    }
  }
}