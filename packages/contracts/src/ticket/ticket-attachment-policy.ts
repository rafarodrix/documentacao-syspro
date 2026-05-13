export const TICKET_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

export const TICKET_ATTACHMENT_ALLOWED_MIME_PREFIXES = [
  "image/",
  "audio/",
  "video/",
  "text/",
] as const;

export const TICKET_ATTACHMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/json",
  "application/xml",
  "text/xml",
  "text/csv",
  "application/rtf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export const TICKET_ATTACHMENT_ACCEPT_ATTRIBUTE = [
  "image/*",
  "audio/*",
  "video/*",
  "text/*",
  ...TICKET_ATTACHMENT_ALLOWED_MIME_TYPES,
].join(",");

export function isAllowedTicketAttachmentMimeType(mimeType: string) {
  const normalized = mimeType.trim().toLowerCase();
  if (!normalized) return true;
  if (TICKET_ATTACHMENT_ALLOWED_MIME_TYPES.includes(normalized as (typeof TICKET_ATTACHMENT_ALLOWED_MIME_TYPES)[number])) {
    return true;
  }

  return TICKET_ATTACHMENT_ALLOWED_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
