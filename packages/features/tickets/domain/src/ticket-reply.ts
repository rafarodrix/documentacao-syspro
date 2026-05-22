export type TicketAttachmentKind = 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';

export function resolveAttachmentType(mimeType: string): TicketAttachmentKind {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  return 'DOCUMENT';
}

export function resolveMessageType(
  body: string | undefined,
  attachments: Array<{ type: string }>,
): string {
  if (body) return 'TEXT';
  if (attachments.length === 1) return attachments[0].type;
  return 'TEXT';
}

export function buildReplyPreview(
  body: string | undefined,
  attachments: Array<{ filename: string }>,
): string {
  if (body) return body.slice(0, 500);
  if (attachments.length === 1) return `Anexo: ${attachments[0].filename}`.slice(0, 500);
  return `${attachments.length} anexos enviados`.slice(0, 500);
}
