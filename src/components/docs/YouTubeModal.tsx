'use client';

import { useState, useEffect, useCallback } from 'react';

interface YouTubeModalProps {
  videoId: string;
  thumbnailTitle: string;
}

export function YouTubeModal({ videoId, thumbnailTitle }: YouTubeModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Tenta maxresdefault primeiro; se não existir, cai para hqdefault
  const [thumbnailUrl, setThumbnailUrl] = useState(
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
  );

  // Fecha com Escape — useCallback evita recriar a função a cada render
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    },
    []
  );

  const openModal = () => setIsOpen(true);

  const closeModal = () => setIsOpen(false);

  // Bloqueia o scroll do body enquanto o modal está aberto
  // e registra/remove o listener de teclado conforme o estado
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    }

    // Cleanup garante que o scroll e o listener sejam restaurados
    // mesmo se o componente for desmontado com o modal aberto
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  return (
    <div>
      {/* 
        Usando <button> em vez de <div> para acessibilidade correta:
        - Focável via Tab naturalmente
        - Ativável via Enter/Space pelo teclado
        - Lido por leitores de tela como elemento interativo
      */}
      <button
        onClick={openModal}
        aria-label={`Assistir vídeo: ${thumbnailTitle}`}
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
        <img
          src={thumbnailUrl}
          alt={thumbnailTitle}
          // Fallback: se maxresdefault não existir, usa hqdefault (sempre disponível)
          onError={() =>
            setThumbnailUrl(
              `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
            )
          }
          style={{
            width: '100%',
            height: 'auto',
            // Leve escurecimento ao hover para indicar interatividade
            transition: 'opacity 0.2s ease',
          }}
        />

        {/* Botão de play com hover sutil */}
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
          // Efeito hover via classes seria mais limpo com Tailwind,
          // mas mantemos inline para consistência com o estilo original
        >
          <svg height="32" viewBox="0 0 36 36" width="32" aria-hidden="true">
            <path
              fill="#ffffff"
              d="M 12,26 18.5,22 18.5,14 12,10 z M 18.5,22 25,18 25,18 18.5,14 z"
            />
          </svg>
        </div>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Vídeo: ${thumbnailTitle}`}
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
          {/* Botão de fechar explícito — muito mais intuitivo que só o backdrop */}
          <button
            onClick={closeModal}
            aria-label="Fechar vídeo"
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
            ×
          </button>

          {/* 
            Stoppa propagação para que clicar dentro do player
            não feche o modal acidentalmente
          */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: '1280px',
              // 56.25% = proporção 16:9 correta (9/16 = 0.5625)
              // O valor anterior (50.625%) estava incorreto
              paddingBottom: '56.25%',
              height: 0,
            }}
          >
            <iframe
              // autoplay=1 inicia automaticamente; rel=0 evita vídeos relacionados
              // de outros canais ao final (mostra só do mesmo canal)
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