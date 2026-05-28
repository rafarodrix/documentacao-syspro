'use client';

import Image from 'next/image';
import { useState } from 'react';
import { VideoModalBase } from './video-modal-base';

interface YouTubeModalProps {
  videoId: string;
  thumbnailTitle: string;
  priority?: boolean;
  startTime?: number;
}

export function YouTubeModal({
  videoId,
  thumbnailTitle,
  priority = false,
  startTime = 0,
}: YouTubeModalProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);

  const videoSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&start=${startTime}`;
  const publicUrl = `https://www.youtube.com/watch?v=${videoId}${startTime > 0 ? `&t=${startTime}s` : ''}`;

  return (
    <VideoModalBase
      title={thumbnailTitle}
      description="Video hospedado no YouTube."
      embedUrl={videoSrc}
      publicUrl={publicUrl}
      triggerLabel={`Assistir treinamento: ${thumbnailTitle}`}
      providerLabel="YouTube"
      loadingText="Carregando aula..."
      thumbnailUrl={thumbnailUrl}
      thumbnailAlt={thumbnailTitle}
      thumbnailPriority={priority}
      onThumbnailError={() => setThumbnailUrl(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)}
      iframeAllow="autoplay; encrypted-media; picture-in-picture"
    />
  );
}
