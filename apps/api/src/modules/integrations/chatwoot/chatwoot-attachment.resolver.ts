import { Injectable, Logger } from '@nestjs/common';
import type { ChatwootConnectionConfig } from './chatwoot.client';

@Injectable()
export class ChatwootAttachmentResolver {
  private readonly logger = new Logger(ChatwootAttachmentResolver.name);

  async resolveAttachmentPayload(
    config: ChatwootConnectionConfig,
    attachment: any,
  ): Promise<{ dataUrl: string; mimetype: string; filename: string } | null> {
    const directCandidates = this.collectAttachmentCandidates(attachment);

    const fallbackMime = this.normalizeAttachmentMimeType(
      attachment?.file_type ??
      attachment?.data?.content_type ??
      attachment?.content_type ??
      attachment?.extension,
    );
    const baseFilename = this.normalizeFilename(attachment?.data?.filename ?? attachment?.file_name ?? 'arquivo');
    const fallbackFilename = this.ensureFilenameExtension(baseFilename, this.extensionFromMimeType(fallbackMime));

    if (!directCandidates.length) return null;

    for (const directCandidate of directCandidates) {
      if (directCandidate.startsWith('data:')) {
        return { dataUrl: directCandidate, mimetype: fallbackMime, filename: fallbackFilename };
      }
    }

    const failures: string[] = [];

    for (const directCandidate of directCandidates) {
      const attachmentUrl = this.resolveAttachmentUrl(config, directCandidate);
      const attempts = this.buildAttachmentFetchAttempts(config, attachmentUrl);

      for (const attempt of attempts) {
        let response: Response;
        try {
          response = await fetch(attempt.url, { method: 'GET', headers: attempt.headers });
        } catch (error: any) {
          failures.push(
            `${attempt.label}:fetch_failed:${this.summarizeAttachmentCandidate(attachmentUrl)}:${this.truncateErrorText(this.describeFetchError(error))}`,
          );
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'unknown_error');
          failures.push(
            `${attempt.label}:${response.status}:${this.summarizeAttachmentCandidate(attachmentUrl)}:${this.truncateErrorText(errorText)}`,
          );
          continue;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const responseMime = this.normalizeAttachmentMimeType(response.headers.get('content-type') ?? fallbackMime);
        const filename = this.ensureFilenameExtension(baseFilename, this.extensionFromMimeType(responseMime));

        return {
          dataUrl: `data:${responseMime};base64,${buffer.toString('base64')}`,
          mimetype: responseMime,
          filename,
        };
      }
    }

    throw new Error(
      `Falha ao baixar anexo do Chatwoot. attachmentId=${String(attachment?.id ?? '').trim() || 'unknown'} candidates=${directCandidates.map((c) => this.summarizeAttachmentCandidate(this.resolveAttachmentUrl(config, c))).join(', ')} failures=${failures.join(' | ')}`,
    );
  }

  normalizeAttachmentInput(attachment: {
    base64: string;
    mimetype: string;
    filename: string;
  }): { base64: string; mimetype: string; filename: string } {
    const mimetype = String(attachment.mimetype || 'application/octet-stream').trim().toLowerCase();
    const base64 = String(attachment.base64 || '')
      .replace(/^data:[^;]+;base64,/, '')
      .replace(/\s+/g, '');

    if (!base64) throw new Error('Anexo recebido sem base64 valido.');

    const fallbackExtension = this.extensionFromMimeType(mimetype);
    const filename = this.ensureFilenameExtension(attachment.filename, fallbackExtension);

    return { base64, mimetype, filename };
  }

  buildAttachmentLinkContent(
    content: string,
    attachment: { filename: string; mimetype: string; publicUrl?: string },
    options?: { attachmentFailed?: boolean },
  ): string {
    const isImage = attachment.mimetype.toLowerCase().startsWith('image/');
    const mediaLine = attachment.publicUrl
      ? isImage
        ? `![${attachment.filename}](${attachment.publicUrl})`
        : `Arquivo: ${attachment.publicUrl}`
      : 'Arquivo nao anexado: falha no storage do Chatwoot.';

    const lines = [
      content?.trim(),
      options?.attachmentFailed
        ? `Nao foi possivel anexar a midia automaticamente: ${attachment.filename} (${attachment.mimetype})`
        : undefined,
      mediaLine,
    ].filter(Boolean);

    return lines.join('\n');
  }

  appendAccountIncomingFields(formData: FormData): FormData {
    formData.append('message_type', 'incoming');
    formData.append('private', 'false');
    formData.append('content_type', 'text');
    return formData;
  }

  isAttachmentStorageError(error: any): boolean {
    const message = String(error?.message ?? '').toLowerCase();
    return (
      message.includes('checksum') ||
      message.includes('nosuchkey') ||
      message.includes('failed to open tcp connection') ||
      message.includes('s3.auto.amazonaws.com') ||
      message.includes('getaddrinfo') ||
      message.includes('name does not resolve') ||
      message.includes('active storage') ||
      message.includes('falha ao baixar anexo')
    );
  }

  extractUrlHost(value: string): string | null {
    try {
      return new URL(value).host;
    } catch {
      return null;
    }
  }

  extensionFromMimeType(mimetype: string): string {
    switch (mimetype) {
      case 'image/jpeg':
      case 'image/jpg': return '.jpg';
      case 'image/png': return '.png';
      case 'image/webp': return '.webp';
      case 'image/gif': return '.gif';
      case 'video/mp4': return '.mp4';
      case 'video/webm': return '.webm';
      case 'video/ogg': return '.ogv';
      case 'video/quicktime': return '.mov';
      case 'audio/ogg':
      case 'audio/opus': return '.ogg';
      case 'audio/mpeg': return '.mp3';
      case 'audio/mp4':
      case 'audio/aac': return '.m4a';
      case 'audio/amr': return '.amr';
      case 'audio/wav':
      case 'audio/x-wav': return '.wav';
      case 'audio/webm': return '.webm';
      case 'application/pdf': return '.pdf';
      case 'application/x-rar':
      case 'application/x-rar-compressed':
      case 'application/vnd.rar': return '.rar';
      default: return '';
    }
  }

  normalizeAttachmentMimeType(value: unknown): string {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return 'application/octet-stream';
    const mimeMap: Record<string, string> = {
      image: 'image/jpeg', video: 'video/mp4', audio: 'audio/ogg', document: 'application/pdf',
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
      mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
      ogg: 'audio/ogg', opus: 'audio/opus', mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac',
      amr: 'audio/amr', wav: 'audio/wav',
      rar: 'application/vnd.rar', 'x-rar': 'application/x-rar',
      'x-rar-compressed': 'application/x-rar-compressed', 'vnd.rar': 'application/vnd.rar',
    };
    return mimeMap[normalized] ?? normalized;
  }

  ensureFilenameExtension(filename: string, fallbackExtension: string): string {
    const normalized = this.normalizeFilename(filename);
    if (!fallbackExtension || /\.[a-z0-9]+$/i.test(normalized)) return normalized;
    return `${normalized}${fallbackExtension}`;
  }

  private normalizeFilename(filename: string): string {
    return String(filename || 'arquivo').trim() || 'arquivo';
  }

  private resolveAttachmentUrl(config: ChatwootConnectionConfig, value: string): string {
    if (/^https?:\/\//i.test(value)) return value;
    const baseUrl = String(config.url || '').replace(/\/+$/, '');
    const suffix = value.startsWith('/') ? value : `/${value}`;
    return `${baseUrl}${suffix}`;
  }

  private collectAttachmentCandidates(attachment: any): string[] {
    const rawCandidates = [
      attachment?.data_url,
      attachment?.download_url,
      attachment?.external_url,
      attachment?.file_url,
      attachment?.url,
      attachment?.thumb_url,
      attachment?.data?.data_url,
      attachment?.data?.download_url,
      attachment?.data?.external_url,
      attachment?.data?.file_url,
      attachment?.data?.url,
      attachment?.data?.thumb_url,
    ];
    return Array.from(new Set(rawCandidates.map((v: unknown) => String(v ?? '').trim()).filter(Boolean)));
  }

  private buildAttachmentFetchAttempts(
    config: ChatwootConnectionConfig,
    attachmentUrl: string,
  ): Array<{ label: string; url: string; headers?: Record<string, string> }> {
    return [
      { label: 'with_api_token', url: attachmentUrl, headers: { api_access_token: config.apiToken } },
      { label: 'without_auth', url: attachmentUrl },
    ];
  }

  private summarizeAttachmentCandidate(url: string): string {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.length > 80
        ? `${parsed.pathname.slice(0, 77)}...`
        : parsed.pathname;
      return `${parsed.origin}${pathname}`;
    } catch {
      return url.length > 120 ? `${url.slice(0, 117)}...` : url;
    }
  }

  private truncateErrorText(value: string): string {
    const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
    return normalized.length > 220 ? `${normalized.slice(0, 217)}...` : normalized;
  }

  private describeFetchError(error: any): string {
    const parts = [error?.message, error?.cause?.message, error?.cause?.code, error?.cause?.errno]
      .map((v) => String(v ?? '').trim())
      .filter(Boolean);
    return parts.length ? parts.join(' | ') : 'fetch failed';
  }
}
