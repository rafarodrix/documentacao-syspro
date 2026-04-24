import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyStatus, ContractStatus, Role } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins';
import nodemailer from 'nodemailer';
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

export type ProtectedSessionPayload = {
  userId: string;
  email: string;
  role: Role;
  name: string | null;
  image: string | null;
};

@Injectable()
export class AuthService {
  public readonly auth;
  private readonly logger = new Logger(AuthService.name);

  constructor(private prisma: PrismaService) {
    const baseURL = (process.env.BETTER_AUTH_URL || 'http://localhost:3000').trim();
    const trustedOrigins = this.resolveTrustedOrigins(baseURL);

    // Instancia o nucleo do better-auth rodando 100% no backend NestJS
    this.auth = betterAuth({
      database: prismaAdapter(this.prisma, { provider: 'postgresql' }),
      plugins: [admin()],
      databaseHooks: {
        user: {
          create: {
            before: async (user) => {
              const totalUsers = await this.prisma.user.count();

              return {
                data: {
                  ...user,
                  role: totalUsers === 0 ? Role.ADMIN : Role.CLIENTE_USER,
                  isActive: true,
                },
              };
            },
          },
        },
      },
      user: {
        additionalFields: {
          role: {
            type: 'string',
            required: false,
            input: false,
            defaultValue: Role.CLIENTE_USER,
          },
        },
      },
      ...(trustedOrigins.length > 0 ? { trustedOrigins } : {}),
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
      baseURL,
    });

    if (trustedOrigins.length > 0) {
      this.logger.log(`Better Auth trusted origins: ${trustedOrigins.join(', ')}`);
    }
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
          isActive: true,
        },
      });

      return { success: true };
    } catch (error: unknown) {
      const authMessage = this.getAuthErrorMessage(error);
      return { success: false, error: authMessage ?? 'Erro ao processar cadastro.' };
    }
  }

  async getProtectedSession(rawHeaders?: IncomingHttpHeaders): Promise<ProtectedSessionPayload | null> {
    try {
      const session = await this.auth.api.getSession({
        headers: this.toHeaders(rawHeaders),
      });

      if (!session?.user?.email) return null;

      const dbUser = await this.prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          isActive: true,
          deletedAt: true,
          lockoutUntil: true,
        },
      });

      if (!dbUser) return null;
      if (dbUser.deletedAt) return null;
      if (!dbUser.isActive) return null;
      if (dbUser.lockoutUntil && dbUser.lockoutUntil > new Date()) return null;

      if (dbUser.role === Role.CLIENTE_ADMIN || dbUser.role === Role.CLIENTE_USER) {
        const activeMembership = await this.prisma.membership.findFirst({
          where: {
            userId: dbUser.id,
            company: {
              deletedAt: null,
              status: CompanyStatus.ACTIVE,
              contracts: {
                some: {
                  status: ContractStatus.ACTIVE,
                  OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
                },
              },
            },
          },
          select: { id: true },
        });

        if (!activeMembership) return null;
      }

      return {
        userId: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
        role: dbUser.role,
      };
    } catch {
      return null;
    }
  }

  async findAuthUserByEmail(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) return null;

    try {
      const result = await this.auth.api.listUsers({
        query: {
          searchField: 'email',
          searchOperator: 'contains',
          searchValue: normalizedEmail,
          limit: 10,
          offset: 0,
        },
      });

      const matchedUser =
        result?.users?.find((user: { email?: string | null }) => this.normalizeEmail(user?.email) === normalizedEmail) ??
        null;

      return matchedUser;
    } catch (error) {
      this.logger.warn(
        `Better Auth listUsers falhou para email=${normalizedEmail}: ${error instanceof Error ? error.message : String(error ?? 'unknown')}`,
      );
      return null;
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

  private normalizeEmail(value?: string | null) {
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized || null;
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

  private resolveTrustedOrigins(baseURL: string): string[] {
    const configuredOrigins = (process.env.EXTRA_TRUSTED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    const candidates = [
      baseURL,
      ...configuredOrigins,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NEXT_PUBLIC_WEB_URL,
    ];

    const trustedOrigins = new Set<string>();

    for (const candidate of candidates) {
      const normalized = this.normalizeOrigin(candidate);
      if (normalized) trustedOrigins.add(normalized);
    }

    return Array.from(trustedOrigins);
  }

  private normalizeOrigin(value?: string | null): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    try {
      return new URL(trimmed).origin;
    } catch {
      return trimmed.replace(/\/+$/, '');
    }
  }
}
