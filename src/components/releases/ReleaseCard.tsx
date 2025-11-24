"use client";

import { Card } from "fumadocs-ui/components/card";
import { FaVideo } from "react-icons/fa";
import type { Release } from "@/core/domain/entities/release";

interface ReleaseCardProps {
  release: Release;
  onVideoClick: (url: string) => void;
}

export function ReleaseCard({ release, onVideoClick }: ReleaseCardProps) {
  const isBug = release.type.toLowerCase() === "bug";

  const badgeText = isBug ? `Bug ${release.id}` : `Melhoria ${release.id}`;
  const badgeClasses = isBug
    ? "bg-amber-500/10 text-amber-600"
    : "bg-emerald-500/10 text-emerald-600";

  const cardContent = (
    <Card
      title={
        <div className="flex items-center justify-between">
          <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${badgeClasses}`}>
            {badgeText}
          </span>
          {release.videoLink && <FaVideo className="text-primary" />}
        </div>
      }
    >
      <p className="text-sm text-foreground mb-2">{release.summary}</p>

      <div className="flex flex-wrap gap-2">
        {(release.tags || []).map((tag) => (
          <span
            key={tag}
            className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
    </Card>
  );

  if (release.videoLink) {
    return (
      <button
        onClick={() => onVideoClick(release.videoLink!)}
        className="block w-full text-left rounded-lg transition-colors hover:bg-muted/40 no-underline cursor-pointer"
        aria-label={`Ver vídeo da ${badgeText}: ${release.title}`}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <a
      href={release.link || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg transition-colors hover:bg-muted/40 no-underline"
    >
      {cardContent}
    </a>
  );
}