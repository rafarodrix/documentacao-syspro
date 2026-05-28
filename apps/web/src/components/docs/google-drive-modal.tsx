'use client';

import { useMemo } from 'react';
import { VideoModalBase } from './video-modal-base';

interface GoogleDriveModalProps {
  fileId?: string;
  shareUrl?: string;
  title: string;
  description?: string;
}

function extractGoogleDriveFileId(input?: string): string | null {
  if (!input) return null;

  const directMatch = input.match(/\/file\/d\/([^/]+)/i);
  if (directMatch?.[1]) return directMatch[1];

  try {
    const url = new URL(input);
    return url.searchParams.get('id');
  } catch {
    return null;
  }
}

export function GoogleDriveModal({
  fileId,
  shareUrl,
  title,
  description = 'Video hospedado no Google Drive.',
}: GoogleDriveModalProps) {
  const resolvedFileId = useMemo(
    () => fileId ?? extractGoogleDriveFileId(shareUrl) ?? '',
    [fileId, shareUrl],
  );

  const embedUrl = resolvedFileId
    ? `https://drive.google.com/file/d/${resolvedFileId}/preview`
    : null;

  const publicUrl = useMemo(() => {
    if (shareUrl) return shareUrl;
    return resolvedFileId ? `https://drive.google.com/file/d/${resolvedFileId}/view` : null;
  }, [resolvedFileId, shareUrl]);

  return (
    <VideoModalBase
      title={title}
      description={description}
      embedUrl={embedUrl}
      publicUrl={publicUrl}
      triggerLabel={`Assistir video: ${title}`}
      providerLabel="Google Drive"
      loadingText="Carregando video..."
      errorTitle="Nao foi possivel montar o video do Google Drive."
      errorDescription={
        <p>
          Informe um <code>fileId</code> ou um link de compartilhamento no formato <code>drive.google.com/file/d/...</code>.
        </p>
      }
      iframeAllow="autoplay; fullscreen"
    />
  );
}
