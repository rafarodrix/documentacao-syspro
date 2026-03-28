'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';

interface YouTubeModalProps {
  videoId: string;
  thumbnailTitle: string;
}

export function YouTubeModal({ videoId, thumbnailTitle }: YouTubeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);

  const closeModal = () => setIsOpen(false);
  const openModal = () => setIsOpen(true);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') closeModal();
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  return (
    <div>
      <button
        onClick={openModal}
        aria-label={`Assistir video: ${thumbnailTitle}`}
        style={{
          cursor: 'pointer',
          position: 'relative',
          maxWidth: '760px',
          width: '100%',
          borderRadius: '8px',
          overflow: 'hidden',
          lineHeight: 0,
          backgroundColor: '#000',
          border: 'none',
          padding: 0,
          display: 'block',
        }}
      >
        <Image
          src={thumbnailUrl}
          alt={thumbnailTitle}
          width={1280}
          height={720}
          onError={() => setThumbnailUrl(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)}
          style={{
            width: '100%',
            height: 'auto',
            transition: 'opacity 0.2s ease',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '64px',
            height: '64px',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease, transform 0.2s ease',
          }}
        >
          <svg height="32" viewBox="0 0 36 36" width="32" aria-hidden="true">
            <path
              fill="#ffffff"
              d="M 12,26 18.5,22 18.5,14 12,10 z M 18.5,22 25,18 25,18 18.5,14 z"
            />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Video: ${thumbnailTitle}`}
          onClick={closeModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <button
            onClick={closeModal}
            aria-label="Fechar video"
            style={{
              position: 'absolute',
              top: '16px',
              right: '20px',
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '32px',
              lineHeight: 1,
              cursor: 'pointer',
              opacity: 0.8,
              padding: '4px 8px',
            }}
          >
            x
          </button>

          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: '1280px',
              paddingBottom: '56.25%',
              height: 0,
            }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={thumbnailTitle}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                borderRadius: '8px',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}