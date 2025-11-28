"use client";

import { useState } from "react";
import { Bug, Rocket, X } from "lucide-react";
import { ReleaseCard } from "./ReleaseCard";
import type { Release } from "@/core/domain/entities/release";

// Shadcn Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface MonthlyReleasesClientProps {
  melhorias: Release[];
  bugs: Release[];
}

// Utilitário puro (pode ser movido para /lib/utils.ts)
function getYouTubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes("youtube.com")) {
      const videoId = urlObj.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
    }
    if (urlObj.hostname.includes("youtu.be")) {
      const videoId = urlObj.pathname.slice(1);
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
    }
  } catch (error) {
    console.error("URL de vídeo inválida:", url);
  }
  return null;
}

export function MonthlyReleasesClient({ melhorias, bugs }: MonthlyReleasesClientProps) {
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) setPlayingVideoUrl(null);
  };

  const embedUrl = getYouTubeEmbedUrl(playingVideoUrl);

  return (
    <>
      <div className="space-y-10 animate-in fade-in duration-500">
        {/* Seção de Melhorias */}
        {melhorias.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-500/10 rounded-md">
                <Rocket className="w-5 h-5" />
              </div>
              Melhorias Implementadas
              <span className="text-sm font-normal text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded-full">
                {melhorias.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {melhorias.map((release) => (
                <ReleaseCard
                  key={release.id}
                  release={release}
                  onVideoClick={setPlayingVideoUrl}
                />
              ))}
            </div>
          </section>
        )}

        {/* Seção de Bugs */}
        {bugs.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <div className="p-1.5 bg-amber-100 dark:bg-amber-500/10 rounded-md">
                <Bug className="w-5 h-5" />
              </div>
              Bugs Corrigidos
              <span className="text-sm font-normal text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded-full">
                {bugs.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {bugs.map((release) => (
                <ReleaseCard
                  key={release.id}
                  release={release}
                  onVideoClick={setPlayingVideoUrl}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Modal de Vídeo */}
      <Dialog open={!!playingVideoUrl} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-zinc-800">
          {/* Cabeçalho acessível (visualmente oculto ou discreto) */}
          <DialogHeader className="sr-only">
            <DialogTitle>Demonstração em Vídeo</DialogTitle>
            <DialogDescription>
              Reproduzindo vídeo demonstrativo da atualização.
            </DialogDescription>
          </DialogHeader>

          <div className="aspect-video w-full relative bg-zinc-950 flex items-center justify-center">
            {embedUrl ? (
              <iframe
                className="w-full h-full"
                src={embedUrl}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="text-white text-sm">Carregando vídeo...</div>
            )}

            {/* Botão de Fechar Customizado (opcional, o DialogContent já traz um X, mas esse fica sobre o vídeo) */}
            <button
              onClick={() => setPlayingVideoUrl(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-50 backdrop-blur-sm"
              aria-label="Fechar vídeo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}