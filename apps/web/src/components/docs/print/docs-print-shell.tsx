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

export function DocsPrintShell({ title, contactInfo, children }: DocsPrintShellProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const classification = "CONFIDENCIAL";
  const watermarkText = "TRILINK SOFTWARE";
  const includeCover = true;
  const inkSaver = true;

  const documentTitle = useMemo(() => sanitizeDocumentTitle(title) || "documentacao", [title]);

  const generatedAtLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date()),
    [],
  );

  const formattedDateOnly = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "long",
      }).format(new Date()),
    [],
  );

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle,
    pageStyle: `
      @page {
        size: A4;
        margin: 15mm 12mm 15mm 12mm;
      }

      @media print {
        html, body {
          background: #ffffff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          font-size: 10pt;
          color: #1f2937;
        }

        body {
          counter-reset: page;
        }

        .docs-print-root {
          padding-bottom: 12mm;
          position: relative;
        }

        .docs-print-root * {
          box-shadow: none !important;
        }

        .docs-print-root .docs-content-surface,
        .docs-print-root .group,
        .docs-print-root [data-radix-scroll-area-viewport] {
          overflow: visible !important;
        }

        .docs-print-root > * {
          break-before: auto;
          page-break-before: auto;
        }

        .docs-print-root .docs-content-surface {
          break-inside: auto !important;
          page-break-inside: auto !important;
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
          color: #111827 !important;
          font-weight: 700 !important;
        }

        .docs-print-root h1 {
          font-size: 20pt !important;
          line-height: 1.2 !important;
          margin-bottom: 10pt !important;
        }

        .docs-print-root h2 {
          font-size: 14pt !important;
          line-height: 1.25 !important;
          margin-top: 18pt !important;
          margin-bottom: 8pt !important;
          padding-bottom: 3pt;
          border-bottom: 1px solid #e5e7eb;
        }

        .docs-print-root h3 {
          font-size: 12pt !important;
          line-height: 1.3 !important;
          margin-top: 14pt !important;
          margin-bottom: 6pt !important;
        }

        .docs-print-root p,
        .docs-print-root li,
        .docs-print-root blockquote {
          orphans: 3;
          widows: 3;
          line-height: 1.5 !important;
        }

        .docs-print-root pre,
        .docs-print-root blockquote,
        .docs-print-root figure,
        .docs-print-root ul,
        .docs-print-root ol,
        .docs-print-root dl {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .docs-print-root pre {
          font-size: 8.5pt !important;
          line-height: 1.45 !important;
          white-space: pre-wrap !important;
          word-break: break-word;
          overflow-wrap: anywhere;
          overflow: visible !important;
          padding: 10px 12px !important;
          border: 1px solid #d1d5db !important;
          background: #f8fafc !important;
          border-radius: 6px !important;
        }

        .docs-print-root code {
          font-size: 0.9em !important;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .docs-print-root table {
          width: 100% !important;
          border-collapse: collapse;
          font-size: 9pt;
          margin-top: 10pt;
          margin-bottom: 10pt;
          break-inside: auto !important;
          page-break-inside: auto !important;
        }

        .docs-print-root .fd-table-wrapper,
        .docs-print-root .table-wrapper,
        .docs-print-root div[class*="overflow-"] {
          overflow: visible !important;
          display: block !important;
          width: 100% !important;
          max-width: none !important;
          break-inside: auto !important;
          page-break-inside: auto !important;
        }

        .docs-print-root thead {
          display: table-header-group;
          background: #f1f5f9 !important;
        }

        .docs-print-root tr,
        .docs-print-root td,
        .docs-print-root th {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .docs-print-root th,
        .docs-print-root td {
          padding: 8px 10px !important;
          border: 1px solid #cbd5e1 !important;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .docs-print-root th {
          font-weight: 600 !important;
          color: #0f172a !important;
          text-align: left;
        }

        .docs-print-root blockquote,
        .docs-print-root [data-callout],
        .docs-print-root .border {
          border-left: 4px solid #475569 !important;
          background: #f8fafc !important;
          padding: 10px 14px !important;
          border-radius: 4px;
        }

        .docs-print-root .docs-content-surface {
          break-inside: auto !important;
          page-break-inside: auto !important;
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
        }

        .docs-print-root ul,
        .docs-print-root ol {
          padding-left: 20px !important;
        }

        .docs-print-root li + li {
          margin-top: 3px !important;
        }

        .docs-print-root img {
          max-width: 80% !important;
          margin: 12pt auto !important;
          display: block;
          break-inside: avoid;
          page-break-inside: avoid;
          border-radius: 4px;
        }

        /* Força a exibição de todas as abas inativas e acordeões fechados */
        [role="tabpanel"],
        .fd-tabs-panel,
        [data-state="closed"],
        .fd-accordion-content,
        [data-state="closed"] .fd-accordion-content,
        [data-state="closed"] [role="region"],
        [data-state="closed"] [hidden],
        [hidden] {
          display: block !important;
          height: auto !important;
          max-height: none !important;
          opacity: 1 !important;
          visibility: visible !important;
          overflow: visible !important;
        }

        /* Oculta os chevrons de acordeões nas impressões */
        [role="button"] svg,
        .fd-accordion svg,
        button[data-state] svg {
          display: none !important;
        }

        .docs-print-cover {
          display: flex !important;
          flex-direction: column;
          justify-content: space-between;
          height: 250mm;
          padding: 20mm 10mm;
          page-break-after: always;
          break-after: page;
          border-bottom: 2px solid #0f172a;
        }

        .print-watermark-overlay {
          display: block !important;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-35deg);
          font-size: 56pt;
          font-weight: 900;
          color: rgba(100, 116, 139, 0.05) !important;
          z-index: 999999 !important;
          pointer-events: none;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          mix-blend-mode: multiply;
        }

        .docs-print-ink-saver {
          color: #000000 !important;
        }

        .docs-print-ink-saver h1,
        .docs-print-ink-saver h2,
        .docs-print-ink-saver h3 {
          color: #000000 !important;
        }

        .docs-print-ink-saver blockquote,
        .docs-print-ink-saver [data-callout] {
          background: #ffffff !important;
          border: 1px solid #94a3b8 !important;
          border-left: 4px solid #000000 !important;
          color: #000000 !important;
        }

        .docs-print-ink-saver pre {
          background: #ffffff !important;
          border: 1px solid #94a3b8 !important;
          color: #000000 !important;
        }

        .docs-print-ink-saver thead {
          background: #e2e8f0 !important;
        }

        .docs-print-footer {
          position: fixed;
          left: 0;
          right: 0;
          bottom: -5mm;
          min-height: 8mm;
          border-t: 1px solid #cbd5e1;
        }

        .docs-print-footer-line {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          gap: 12px;
          align-items: center;
          line-height: 1.2;
        }

        .print-page-counter::after {
          counter-increment: page;
          content: "Pág. " counter(page);
        }
      }
    `,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <DocsPrintButton onPrint={handlePrint} />
      </div>

      <div
        ref={contentRef}
        className={`docs-print-root space-y-8 ${inkSaver ? "docs-print-ink-saver" : ""}`}
      >
        <div className="print-watermark-overlay hidden pointer-events-none">
          {watermarkText}
        </div>

        {includeCover && (
          <div className="docs-print-cover hidden flex-col justify-between border-b-2 border-foreground/90 bg-background pointer-events-none">
            <div className="flex justify-between items-center w-full">
              {contactInfo.companyName ? (
                <span className="text-xs font-bold tracking-wider text-primary uppercase">
                  {contactInfo.companyName}
                </span>
              ) : (
                <span className="text-xs font-bold tracking-wider text-primary uppercase">
                  TRILINK SOFTWARE
                </span>
              )}
              <span className="text-[9px] font-bold text-red-600 border border-red-200 bg-red-50/50 px-2 py-0.5 rounded uppercase tracking-wider">
                {classification}
              </span>
            </div>

            <div className="space-y-5 my-auto max-w-2xl py-12">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
                  MANUAL TÉCNICO E OPERACIONAL
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                  {title}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Este documento contém as especificações técnicas, regras de parametrização e diretrizes operacionais homologadas para a rotina de {title}. As instruções abaixo devem guiar o suporte técnico e a implantação.
              </p>
            </div>

            <div className="border-t border-border/80 pt-6 grid grid-cols-3 gap-6 text-[10px] text-muted-foreground/90">
              <div>
                <span className="block font-semibold text-foreground uppercase tracking-wider text-[8px] mb-1">ORGANIZAÇÃO EMISSORA</span>
                {contactInfo.companyName || "Trilink Software"}
              </div>
              <div>
                <span className="block font-semibold text-foreground uppercase tracking-wider text-[8px] mb-1">DATA DE EMISSÃO</span>
                {formattedDateOnly}
              </div>
              <div>
                <span className="block font-semibold text-foreground uppercase tracking-wider text-[8px] mb-1">CLASSIFICAÇÃO DE SEGURANÇA</span>
                <span className="font-bold text-red-600 uppercase">{classification}</span>
              </div>
            </div>
          </div>
        )}

        <div className="docs-print-body-content">
          {children}
        </div>

        <div className="docs-print-footer hidden border-t border-border bg-background pt-1 text-[7px] text-muted-foreground/90">
          <div className="docs-print-footer-line">
            <span className="font-semibold text-foreground">{title}</span>
            <span className="text-red-600 font-bold">CLASSIFICAÇÃO: {classification}</span>
            <span>Gerado em {generatedAtLabel}</span>
          </div>
          <div className="docs-print-footer-line mt-0.5">
            <div className="flex flex-wrap gap-x-2">
              {contactInfo.companyName ? <span>{contactInfo.companyName}</span> : null}
              {contactInfo.siteUrl ? <span>• {contactInfo.siteUrl}</span> : null}
              {contactInfo.supportEmail ? <span>• {contactInfo.supportEmail}</span> : null}
              {contactInfo.supportPhone ? <span>• {contactInfo.supportPhone}</span> : null}
            </div>
            <span className="print-page-counter font-bold text-foreground"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
