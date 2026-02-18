"use client";

import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, ExternalLink, Bug, Sparkles } from "lucide-react";
import type { Release } from "@/core/domain/entities/release.entity";
import { cn } from "@/lib/utils"; // Utilitário padrão do shadcn

interface ReleaseCardProps {
  release: Release;
  onVideoClick: (url: string) => void;
}

export function ReleaseCard({ release, onVideoClick }: ReleaseCardProps) {
  const isBug = release.type.toLowerCase() === "bug";
  const hasVideo = !!release.videoLink;

  // Configuração visual baseada no tipo
  const typeConfig = isBug
    ? {
      label: "Bug",
      icon: Bug,
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 border-amber-500/20",
      borderHover: "group-hover:border-amber-500/50"
    }
    : {
      label: "Melhoria",
      icon: Sparkles,
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/20",
      borderHover: "group-hover:border-emerald-500/50"
    };

  const Icon = typeConfig.icon;

  const CardInterior = () => (
    <Card className={cn(
      "h-full transition-all duration-300 bg-card",
      "border border-border/60",
      "group-hover:shadow-md group-hover:-translate-y-0.5", // Efeito de levitação sutil
      typeConfig.borderHover // Borda colorida no hover baseada no tipo
    )}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={cn("gap-1.5 pr-3 font-medium transition-colors", typeConfig.badgeClass)}>
            <Icon className="w-3.5 h-3.5" />
            {typeConfig.label} <span className="opacity-60 ml-0.5">#{release.id}</span>
          </Badge>

          {/* Indicador de Ação (Vídeo ou Link) */}
          <div className="text-muted-foreground group-hover:text-primary transition-colors duration-300">
            {hasVideo ? (
              <PlayCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            ) : (
              <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        {release.title && (
          <h4 className="font-semibold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">
            {release.title}
          </h4>
        )}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {release.summary}
        </p>
      </CardContent>

      {release.tags && release.tags.length > 0 && (
        <CardFooter className="p-4 pt-0 gap-2 flex-wrap">
          {release.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 bg-muted px-2 py-0.5 rounded-sm"
            >
              {tag}
            </span>
          ))}
        </CardFooter>
      )}
    </Card>
  );

  // Lógica de Renderização do Wrapper (Botão vs Link)
  const wrapperClasses = "block group w-full text-left h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl";

  if (hasVideo) {
    return (
      <button
        onClick={() => onVideoClick(release.videoLink!)}
        className={wrapperClasses}
        aria-label={`Assistir vídeo sobre ${typeConfig.label} ${release.id}`}
      >
        <CardInterior />
      </button>
    );
  }

  return (
    <a
      href={release.link || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className={wrapperClasses}
    >
      <CardInterior />
    </a>
  );
}