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
        margin: 12mm 12mm 14mm 12mm;
      }

      @media print {
        html, body {
          background: #ffffff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          font-size: 10.5pt;
        }

        .docs-print-root {
          padding-bottom: 10mm;
        }

        .docs-print-root * {
          box-shadow: none !important;
        }

        .docs-print-root .docs-content-surface,
        .docs-print-root .group,
        .docs-print-root [data-radix-scroll-area-viewport] {
          overflow: visible !important;
        }

        .docs-print-root h1,
        .docs-print-root h2,
        .docs-print-root h3,
        .docs-print-root h4,
        .docs-print-root h5,
        .docs-print-root h6 {
          break-after: avoid-page;
          break-inside: avoid;
          page-break-after: avoid;
          page-break-inside: avoid;
        }

        .docs-print-root p,
        .docs-print-root li,
        .docs-print-root blockquote {
          orphans: 3;
          widows: 3;
        }

        .docs-print-root pre,
        .docs-print-root blockquote,
        .docs-print-root figure,
        .docs-print-root table,
        .docs-print-root ul,
        .docs-print-root ol,
        .docs-print-root dl,
        .docs-print-root .rounded-xl,
        .docs-print-root .rounded-2xl,
        .docs-print-root .rounded-3xl {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .docs-print-root pre {
          font-size: 8.5pt !important;
          line-height: 1.4 !important;
          white-space: pre-wrap !important;
          word-break: break-word;
          overflow-wrap: anywhere;
          overflow: visible !important;
          padding: 8px 10px !important;
        }

        .docs-print-root code {
          font-size: 0.92em !important;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .docs-print-root table {
          width: 100% !important;
          border-collapse: collapse;
          font-size: 9pt;
        }

        .docs-print-root thead {
          display: table-header-group;
        }

        .docs-print-root tr,
        .docs-print-root td,
        .docs-print-root th {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .docs-print-root img,
        .docs-print-root svg,
        .docs-print-root video,
        .docs-print-root canvas {
          max-width: 100% !important;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .docs-print-root .print-break-before {
          break-before: page;
          page-break-before: always;
        }

        .docs-print-root .print-break-after {
          break-after: page;
          page-break-after: always;
        }

        .docs-print-footer {
          position: fixed;
          left: 12mm;
          right: 12mm;
          bottom: 4mm;
          min-height: 6mm;
        }

        .docs-print-footer-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          white-space: nowrap;
        }

        .docs-print-footer-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex-wrap: nowrap;
        }

        .docs-print-footer-meta span {
          overflow: hidden;
          text-overflow: ellipsis;
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

        <div className="docs-print-footer hidden border-t border-border bg-background pt-2 text-[9px] text-muted-foreground print:block">
          <div className="docs-print-footer-line">
            <span>{title}</span>
            <span>Gerado em {generatedAtLabel}</span>
          </div>
          <div className="docs-print-footer-meta mt-1">
            {contactInfo.companyName ? <span>{contactInfo.companyName}</span> : null}
            {contactInfo.siteUrl ? <span>{contactInfo.siteUrl}</span> : null}
            {contactInfo.supportEmail ? <span>{contactInfo.supportEmail}</span> : null}
            {contactInfo.supportPhone ? <span>{contactInfo.supportPhone}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
