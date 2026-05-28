'use client';

import { AlertCircle, PlayCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const [isOpen, setIsOpen] = useState(false);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedFileId = useMemo(
    () => fileId ?? extractGoogleDriveFileId(shareUrl) ?? '',
    [fileId, shareUrl],
  );

  const embedUrl = resolvedFileId
    ? `https://drive.google.com/file/d/${resolvedFileId}/preview`
    : null;

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setIsIframeLoaded(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal();
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

  if (!embedUrl) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
        <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
        <div>
          <p className="font-medium">Nao foi possivel montar o video do Google Drive.</p>
          <p className="text-muted-foreground">
            Informe um `fileId` ou um link de compartilhamento no formato `drive.google.com/file/d/...`.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        className="group relative block w-full max-w-[760px] overflow-hidden rounded-xl border border-border/40 bg-card text-left outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`Assistir video: ${title}`}
      >
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] px-6 py-10">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
              <PlayCircle className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
                Google Drive
              </p>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm text-white/70">{description}</p>
            </div>
          </div>
        </div>
      </button>

      {isOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/90 p-4 backdrop-blur-md animate-in fade-in duration-300"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <button
            ref={closeButtonRef}
            onClick={closeModal}
            className="absolute right-6 top-6 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:scale-110 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Fechar video"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div
            className="relative aspect-video w-full max-w-6xl overflow-hidden rounded-2xl border border-border/50 bg-black shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-300"
            onClick={(event) => event.stopPropagation()}
          >
            {!isIframeLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">Carregando video...</p>
              </div>
            )}
            <iframe
              src={embedUrl}
              title={title}
              allow="autoplay; fullscreen"
              allowFullScreen
              onLoad={() => setIsIframeLoaded(true)}
              className={`h-full w-full border-none transition-opacity duration-700 ${isIframeLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
