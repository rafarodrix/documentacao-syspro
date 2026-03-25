"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

type RemoteScriptDownloadButtonProps = ButtonProps & {
  url: string;
  filenameFallback: string;
  label: string;
};

function parseFilenameFromDisposition(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const simpleMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return simpleMatch?.[1] ?? null;
}

export function RemoteScriptDownloadButton({
  url,
  filenameFallback,
  label,
  children,
  disabled,
  ...props
}: RemoteScriptDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    try {
      setIsDownloading(true);

      const response = await fetch(url, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok) {
        let errorMessage = "Falha ao baixar script.";

        if (contentType.includes("application/json")) {
          const payload = await response.json().catch(() => null);
          errorMessage = payload?.error ?? errorMessage;
        } else {
          const text = await response.text().catch(() => "");
          if (text.trim()) errorMessage = text.trim();
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const filename =
        parseFilenameFromDisposition(response.headers.get("content-disposition")) ?? filenameFallback;

      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);

      toast.success("Download iniciado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao baixar script.");
    } finally {
      setIsDownloading(false);
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
