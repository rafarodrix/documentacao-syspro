"use client";

import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type RemoteScriptDownloadButtonProps = ComponentProps<typeof Button> & {
  url: string;
  filenameFallback: string;
  label: string;
};

export function RemoteScriptDownloadButton({
  url,
  filenameFallback,
  label,
  children,
  disabled,
  ...props
}: RemoteScriptDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const absoluteUrl = useMemo(() => {
    if (typeof window === "undefined") return url;
    return new URL(url, window.location.origin).toString();
  }, [url]);

  async function handleDownload() {
    try {
      setIsDownloading(true);
      const anchor = document.createElement("a");
      anchor.href = absoluteUrl;
      anchor.download = filenameFallback;
      anchor.target = "_blank";
      anchor.rel = "noopener";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      toast.success("Download iniciado.");
    } catch (error) {
      try {
        const anchor = document.createElement("a");
        anchor.href = absoluteUrl;
        anchor.download = filenameFallback;
        anchor.rel = "noopener";
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        toast.success("Tentando baixar diretamente pelo navegador.");
        return;
      } catch {}

      toast.error(error instanceof Error ? error.message : "Falha ao baixar script.");
    } finally {
      window.setTimeout(() => {
        setIsDownloading(false);
      }, 1200);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleDownload}
      disabled={disabled || isDownloading}
      {...props}
    >
      {children ?? (
        <>
          <Download className="h-4 w-4" />
          {isDownloading ? "Baixando..." : label}
        </>
      )}
    </Button>
  );
}
