"use client";

import { useMemo, useState } from "react";
import { Bug, Rocket } from "lucide-react";
import { ReleaseCard } from "./ReleaseCard";
import type { Release } from "@dosc-syspro/core";
import { Badge } from "@/components/ui/badge";
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
  } catch {
    return null;
  }

  return null;
}

export function MonthlyReleasesClient({ melhorias, bugs }: MonthlyReleasesClientProps) {
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);

  const embedUrl = useMemo(
    () => getYouTubeEmbedUrl(selectedRelease?.videoLink ?? null),
    [selectedRelease?.videoLink],
  );

  return (
    <>
      <div className="space-y-10 animate-in fade-in duration-500">
        {melhorias.length > 0 && (
          <section className="space-y-4 rounded-3xl border border-border/60 bg-card/60 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-emerald-600 dark:text-emerald-500">
              <div className="rounded-md bg-emerald-100 p-1.5 dark:bg-emerald-500/10">
                <Rocket className="w-5 h-5" />
              </div>
              Melhorias Implementadas
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-sm font-normal text-muted-foreground">
                {melhorias.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {melhorias.map((release) => (
                <ReleaseCard key={release.id} release={release} onOpenDetails={setSelectedRelease} />
              ))}
            </div>
          </section>
        )}

        {bugs.length > 0 && (
          <section className="space-y-4 rounded-3xl border border-border/60 bg-card/60 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-amber-600 dark:text-amber-500">
              <div className="rounded-md bg-amber-100 p-1.5 dark:bg-amber-500/10">
                <Bug className="w-5 h-5" />
              </div>
              Bugs Corrigidos
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-sm font-normal text-muted-foreground">
                {bugs.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {bugs.map((release) => (
                <ReleaseCard key={release.id} release={release} onOpenDetails={setSelectedRelease} />
              ))}
            </div>
          </section>
        )}
      </div>

      <Dialog open={!!selectedRelease} onOpenChange={(open) => !open && setSelectedRelease(null)}>
        <DialogContent className="max-w-3xl">
          {selectedRelease && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Release #{selectedRelease.id}
                  <Badge variant="outline" className="font-medium">
                    {selectedRelease.type}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedRelease.isoDate}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedRelease.title && (
                  <h3 className="text-lg font-semibold text-foreground">{selectedRelease.title}</h3>
                )}

                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedRelease.summary}
                </p>

                {selectedRelease.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedRelease.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[11px] uppercase tracking-wide">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {embedUrl && (
                  <div className="rounded-lg overflow-hidden border border-border/60 bg-black">
                    <div className="aspect-video w-full">
                      <iframe
                        className="w-full h-full"
                        src={embedUrl}
                        title={`Video da release ${selectedRelease.id}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
