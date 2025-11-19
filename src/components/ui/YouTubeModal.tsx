'use client';

import { useState } from 'react';

interface YouTubeModalProps {
  videoId: string;
  thumbnailTitle: string;
}

export function YouTubeModal({ videoId, thumbnailTitle }: YouTubeModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  // Usar a imagem de máxima resolução para melhor qualidade
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  return (
    <div>
      {/* Thumbnail que se adapta à proporção da imagem original */}
      <div
        onClick={openModal}
        style={{
          cursor: 'pointer',
          position: 'relative',
          maxWidth: '760px',
          borderRadius: '8px',
          overflow: 'hidden',
          lineHeight: 0, // Ajuda a remover espaços extras
          backgroundColor: '#000',
        }}
      >
        <img
          src={thumbnailUrl}
          alt={thumbnailTitle}
          style={{
            width: '100%',
            height: 'auto', // A altura será automática baseada na largura
          }}
        />
        {/* Ícone de "Play" */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60px',
            height: '60px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg height="100%" viewBox="0 0 36 36" width="100%">
            <path fill="#ffffff" d="M 12,26 18.5,22 18.5,14 12,10 z M 18.5,22 25,18 25,18 18.5,14 z"></path>
          </svg>
        </div>
      </div>

      {/* Modal que abre ao clicar */}
      {isOpen && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          {/* Container do vídeo com proporção 16:9 */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: '1280px',
              paddingBottom: '50.625%',
              height: 0,
            }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title="YouTube video player"
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
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
}