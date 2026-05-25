"use client";

import { useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { DocsPrintButton } from "./docs-print-button";

interface DocsPrintShellProps {
  title: string;
  slug: string;
  children: React.ReactNode;
}

function sanitizeDocumentTitle(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export function DocsPrintShell({ title, slug, children }: DocsPrintShellProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const documentTitle = useMemo(() => sanitizeDocumentTitle(title) || "documentacao", [title]);
  const generatedAtLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date()),
    [],
  );

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle,
    pageStyle: `
      @page {
        size: A4;
        margin: 14mm;
      }

      @media print {
        html, body {
          background: #ffffff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <DocsPrintButton onPrint={handlePrint} />
      </div>

      <div ref={contentRef} className="docs-print-root space-y-8">
        {children}

        <div className="hidden border-t border-border pt-4 text-xs text-muted-foreground print:block">
          <div className="flex items-center justify-between gap-4">
            <span>{title}</span>
            <span>Gerado em {generatedAtLabel}</span>
          </div>
          <div className="mt-1">{slug}</div>
        </div>
      </div>
    </div>
  );
}
