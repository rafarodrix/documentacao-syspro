import { Injectable, Logger } from '@nestjs/common';
import { readR2RuntimeConfig } from '@dosc-syspro/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private client: S3Client | null = null;

  isEnabled(): boolean {
    const config = readR2RuntimeConfig();
    return Boolean(
      config.endpoint &&
      config.accessKeyId &&
      config.secretAccessKey &&
      config.bucketName,
    );
  }

  async uploadBuffer(input: {
    buffer: Buffer;
    filename: string;
    contentType: string;
    prefix?: string;
  }): Promise<{ key: string; url: string }> {
    const config = readR2RuntimeConfig();
    if (!this.isEnabled()) {
      throw new Error('R2 nao configurado no runtime.');
    }

    const key = this.buildObjectKey(input.prefix ?? 'tickets', input.filename);
    const client = this.getClient();

    await client.send(new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: input.buffer,
      ContentType: input.contentType,
    }));

    if (config.publicBaseUrl) {
      return {
        key,
        url: `${config.publicBaseUrl}/${key}`,
      };
    }

    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }),
      { expiresIn: config.signedUrlTtlSeconds },
    );

    return { key, url };
  }

  async getObjectUrl(key: string): Promise<string> {
    const config = readR2RuntimeConfig();
    if (!this.isEnabled()) {
      throw new Error('R2 nao configurado no runtime.');
    }

    if (config.publicBaseUrl) {
      return `${config.publicBaseUrl}/${key}`;
    }

    const client = this.getClient();
    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }),
      { expiresIn: config.signedUrlTtlSeconds },
    );
  }

  private getClient(): S3Client {
    if (this.client) {
      return this.client;
    }

    const config = readR2RuntimeConfig();
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_evolution',
      stage: 'r2_client_initialized',
      endpoint: config.endpoint || null,
      bucketName: config.bucketName || null,
      hasPublicBaseUrl: Boolean(config.publicBaseUrl),
      signedUrlTtlSeconds: config.signedUrlTtlSeconds,
    }));

    return this.client;
  }

  private buildObjectKey(prefix: string, filename: string): string {
    const sanitizedPrefix = prefix.replace(/^\/+|\/+$/g, '') || 'tickets';
    const sanitizedFilename = filename
      .normalize('NFKD')
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'arquivo';

    return `${sanitizedPrefix}/${Date.now()}-${sanitizedFilename}`;
  }
}
