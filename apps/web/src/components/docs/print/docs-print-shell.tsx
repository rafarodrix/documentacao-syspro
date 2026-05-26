"use client";

import { useMemo, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { DocsPrintButton } from "./docs-print-button";

interface DocsPrintContactInfo {
  companyName: string;
  siteUrl: string;
  supportEmail: string;
  supportPhone: string;
}

interface DocsPrintShellProps {
  title: string;
  slug: string;
  contactInfo: DocsPrintContactInfo;
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

export function DocsPrintShell({ title, slug, contactInfo, children }: DocsPrintShellProps) {
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
        <div className="hidden rounded-xl border border-border bg-background px-5 py-4 print:block">
          <div className="flex items-start justify-between gap-6 border-b border-border pb-3">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">{contactInfo.companyName}</p>
              <p className="text-sm text-muted-foreground">Documentacao oficial de suporte e operacao</p>
            </div>
            <div className="space-y-1 text-right text-xs text-muted-foreground">
              <p>Gerado em {generatedAtLabel}</p>
              <p>{title}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            {contactInfo.siteUrl ? (
              <div>
                <span className="font-medium text-foreground">Site:</span> {contactInfo.siteUrl}
              </div>
            ) : null}
            {contactInfo.supportEmail ? (
              <div>
                <span className="font-medium text-foreground">Contato:</span> {contactInfo.supportEmail}
              </div>
            ) : null}
            {contactInfo.supportPhone ? (
              <div>
                <span className="font-medium text-foreground">Telefone / WhatsApp:</span> {contactInfo.supportPhone}
              </div>
            ) : null}
          </div>
        </div>

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
