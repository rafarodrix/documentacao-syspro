"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FaBug, FaRocket } from "react-icons/fa";
import { X } from "lucide-react";
import { ReleaseCard } from "./ReleaseCard";
import type { Release } from "@/lib/types";

interface MonthlyReleasesClientProps {
  melhorias: Release[];
  bugs: Release[];
}

function getYouTubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes("youtube.com")) {
      const videoId = urlObj.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (urlObj.hostname.includes("youtu.be")) {
      const videoId = urlObj.pathname.slice(1);
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
  } catch (error) {
    console.error("URL de vídeo inválida:", url, error);
    return null;
  }
  return null;
}


export function MonthlyReleasesClient({ melhorias, bugs }: MonthlyReleasesClientProps) {
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-6">
        {melhorias.length > 0 && (
          <section>
            <h2 className="text-lg font-medium mb-3 flex items-center gap-2 text-emerald-600">
              <FaRocket /> Melhorias Implementadas ({melhorias.length})
            </h2>
            <div className="space-y-3">
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
        {bugs.length > 0 && (
          <section>
            <h2 className="text-lg font-medium mb-3 flex items-center gap-2 text-amber-600">
              <FaBug /> Bugs Corrigidos ({bugs.length})
            </h2>
            <div className="space-y-3">
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

      <Dialog.Root open={!!playingVideoUrl} onOpenChange={(isOpen) => !isOpen && setPlayingVideoUrl(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-card shadow-lg">
              <div className="aspect-video">
                {playingVideoUrl && ( // Renderiza o iframe apenas se a URL existir
                  <iframe
                    className="h-full w-full rounded-t-lg"
                    src={getYouTubeEmbedUrl(playingVideoUrl) || ""}
                    // ...
                  ></iframe>
                )}
              </div>
            <Dialog.Close className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}