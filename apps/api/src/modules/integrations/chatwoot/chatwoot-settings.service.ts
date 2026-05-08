import { Injectable, Logger } from '@nestjs/common';
import { createDecipheriv, createHash } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS,
  chatwootBehaviorSettingsSchema,
  type ChatwootBehaviorSettings,
} from '@dosc-syspro/contracts/chatwoot';

@Injectable()
export class ChatwootSettingsService {
  private readonly logger = new Logger(ChatwootSettingsService.name);

  private static readonly BEHAVIOR_SETTINGS_KEY = 'chatwoot_behavior_settings';
  private static readonly SYSTEM_BOT_TOKEN_KEY = 'chatwoot_system_bot_token';

  constructor(private readonly prisma: PrismaService) {}

  async readBehaviorSettings(): Promise<ChatwootBehaviorSettings> {
    const [setting, systemBotTokenSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({
        where: { key: ChatwootSettingsService.BEHAVIOR_SETTINGS_KEY },
        select: { value: true },
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: ChatwootSettingsService.SYSTEM_BOT_TOKEN_KEY },
        select: { value: true },
      }),
    ]);

    const systemMessageApiToken = systemBotTokenSetting?.value
      ? this.decryptOptional(systemBotTokenSetting.value) ?? ''
      : '';

    const fallback: ChatwootBehaviorSettings = {
      ...DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS,
      systemMessageApiToken,
    };

    if (!setting?.value) return fallback;

    try {
      const parsed = JSON.parse(setting.value);
      const validation = chatwootBehaviorSettingsSchema.safeParse({
        ...parsed,
        systemMessageApiToken,
      });
      return validation.success ? validation.data : fallback;
    } catch {
      return fallback;
    }
  }

  decryptOptional(payload?: string | null): string | null {
    if (!payload) return null;
    try {
      return this.decrypt(payload);
    } catch (error: any) {
      this.logger.warn(`Falha ao decriptar payload: ${error?.message ?? 'unknown'}`);
      return null;
    }
  }

  private decrypt(payload: string): string {
    const [ivB64, tagB64, dataB64] = String(payload || '').split(':');
    if (!ivB64 || !tagB64 || !dataB64) throw new Error('Payload criptografado invalido');
    const key = this.resolveEncryptionKey();
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return plain.toString('utf8');
  }

  private resolveEncryptionKey(): Buffer {
    const raw = process.env.INTEGRATION_CONFIG_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET;
    if (!raw?.trim()) {
      throw new Error('INTEGRATION_CONFIG_ENCRYPTION_KEY (ou BETTER_AUTH_SECRET) obrigatoria para criptografia');
    }
    return createHash('sha256').update(raw).digest();
  }
}
