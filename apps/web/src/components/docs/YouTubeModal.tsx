'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

interface YouTubeModalProps {
  videoId: string;
  thumbnailTitle: string;
  priority?: boolean;
  startTime?: number; // Tempo em segundos
}

export function YouTubeModal({ 
  videoId, 
  thumbnailTitle, 
  priority = false, 
  startTime = 0 
}: YouTubeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Garante que o portal só execute no cliente
  useEffect(() => { setMounted(true); }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setIsIframeLoaded(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
      // Simples trava de foco (Tab) poderia ser adicionada aqui
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeModal]);

  const videoSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&start=${startTime}`;

  return (
    <>
      {/* TRIGGER - Integrado com seu tema OKLCH */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        className="group relative block w-full max-w-[760px] overflow-hidden rounded-xl bg-card p-0 outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring border border-border/40"
        aria-label={`Assistir treinamento: ${thumbnailTitle}`}
      >
        <Image
          src={thumbnailUrl}
          alt={thumbnailTitle}
          width={1280}
          height={720}
          priority={priority}
          className="h-auto w-full transition-all duration-500 group-hover:scale-[1.03] group-hover:opacity-80"
          onError={() => setThumbnailUrl(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)}
        />
        
        {/* Overlay com gradiente suave */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* Botão Play usando variáveis do tema */}
        <div className="absolute top-1/2 left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-all duration-300 group-hover:scale-110 group-active:scale-95">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </div>
      </button>

      {/* MODAL VIA PORTAL */}
      {isOpen && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/90 backdrop-blur-md p-4 animate-in fade-in duration-300"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <button
            ref={closeButtonRef}
            onClick={closeModal}
            className="absolute top-6 right-6 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:bg-accent hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Fechar vídeo"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>

          <div 
            className="relative aspect-video w-full max-w-6xl overflow-hidden rounded-2xl bg-black shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 border border-border/50"
            onClick={(e) => e.stopPropagation()}
          >
            {!isIframeLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">Carregando aula...</p>
              </div>
            )}
            <iframe
              src={videoSrc}
              title={thumbnailTitle}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              onLoad={() => setIsIframeLoaded(true)}
              className={`h-full w-full border-none transition-opacity duration-700 ${isIframeLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}