"use client";

import { useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, Droplet, FileText } from "lucide-react";
import { 
  Button, 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogTrigger, 
  DialogClose,
  Switch,
  Label,
  Separator
} from "@dosc-syspro/ui";

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
  const [isOpen, setIsOpen] = useState(false);
  
  // Opções Simplificadas para o Usuário
  const [includeCover, setIncludeCover] = useState(true);
  const [inkSaver, setInkSaver] = useState(true);

  // Parâmetros Enterprise Fixos (Segurança Padrão)
  const classification = "CONFIDENCIAL";
  const watermarkText = "TRILINK SOFTWARE";

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

  const handlePrintAction = useReactToPrint({
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

        /* Suporte a contagem de páginas no rodapé */
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

        /* Títulos */
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

        /* Parágrafos e listas */
        .docs-print-root p,
        .docs-print-root li,
        .docs-print-root blockquote {
          orphans: 3;
          widows: 3;
          line-height: 1.5 !important;
        }

        /* Blocos evitáveis de quebras ao meio */
        .docs-print-root pre,
        .docs-print-root blockquote,
        .docs-print-root figure,
        .docs-print-root table,
        .docs-print-root ul,
        .docs-print-root ol,
        .docs-print-root dl {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* Bloco de Código */
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

        /* Tabelas */
        .docs-print-root table {
          width: 100% !important;
          border-collapse: collapse;
          font-size: 9pt;
          margin-top: 10pt;
          margin-bottom: 10pt;
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

        /* Callouts / Avisos */
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

        /* Estilização da Capa (Cover Page) */
        .docs-print-cover {
          display: flex !important;
          flex-direction: column;
          justify-content: space-between;
          height: 250mm; /* Preenche a página A4 vertical */
          padding: 20mm 10mm;
          page-break-after: always;
          break-after: page;
          border-bottom: 2px solid #0f172a;
        }

        /* MARCA D'ÁGUA EM PRIMEIRO PLANO (Sobreposta) */
        .print-watermark-overlay {
          display: block !important;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-35deg);
          font-size: 56pt;
          font-weight: 900;
          color: rgba(100, 116, 139, 0.05) !important; /* Slate bem suave para não cobrir o texto */
          z-index: 999999 !important; /* Traz para a frente de todos os backgrounds! */
          pointer-events: none;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          mix-blend-mode: multiply; /* Mescla com textos e imagens */
        }

        /* Modo de Alta Economia de Tinta (Contraste Limpo) */
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

        /* Rodapé de Impressão */
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

        /* Numeração de páginas dinâmica via CSS */
        .print-page-counter::after {
          counter-increment: page;
          content: "Pág. " counter(page);
        }
      }
    `,
  });

  const handlePrint = () => {
    setIsOpen(false);
    // Aguarda um pequeno ciclo para garantir que o modal fechou antes de renderizar para impressão
    setTimeout(() => {
      handlePrintAction();
    }, 200);
  };

  return (
    <div className="space-y-6">
      {/* Botão de Impressão Enterprise que dispara o Modal Simplificado */}
      <div className="flex items-center justify-end">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-primary/20 bg-background/50 hover:bg-accent/40 active:scale-[0.98] transition-all print:hidden"
            >
              <Printer className="h-4 w-4 text-primary" />
              Imprimir documento
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-primary" />
                Opções de Impressão
              </DialogTitle>
              <DialogDescription>
                Ajuste as preferências de layout antes de gerar o PDF. A marca d'água corporativa de segurança será aplicada automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              {/* Tabela de Opções Simplificada */}
              <div className="space-y-4">
                
                {/* Capa */}
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex flex-col space-y-0.5">
                    <Label htmlFor="include-cover" className="text-sm font-semibold flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Incluir Capa de Documento
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Gera uma primeira folha de rosto com dados da marca.
                    </span>
                  </div>
                  <Switch 
                    id="include-cover" 
                    checked={includeCover} 
                    onCheckedChange={setIncludeCover} 
                  />
                </div>

                <Separator className="my-2" />

                {/* Economia de Tinta */}
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex flex-col space-y-0.5">
                    <Label htmlFor="ink-saver" className="text-sm font-semibold flex items-center gap-1.5">
                      <Droplet className="h-4 w-4 text-muted-foreground" />
                      Economia de Tinta (Monocromático)
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Remove degradês e otimiza o contraste de caixas de texto.
                    </span>
                  </div>
                  <Switch 
                    id="ink-saver" 
                    checked={inkSaver} 
                    onCheckedChange={setInkSaver} 
                  />
                </div>

              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="button" size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="h-4 w-4" />
                Confirmar e Imprimir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* A Área de Conteúdo Capturada pelo Impressor */}
      <div 
        ref={contentRef} 
        className={`docs-print-root space-y-8 ${inkSaver ? "docs-print-ink-saver" : ""}`}
      >
        {/* Marca d'Água Superior Injetada sobre todos os elementos no Print */}
        <div className="print-watermark-overlay hidden pointer-events-none">
          {watermarkText}
        </div>

        {/* 1. CAPA DE DOCUMENTO (Renderizada apenas na Impressão/PDF se ativa) */}
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

        {/* Conteúdo Principal do Documento (MDX) */}
        <div className="docs-print-body-content">
          {children}
        </div>

        {/* 2. RODAPÉ FIXO DE IMPRESSÃO (Renderizado em todas as páginas via fixed no CSS) */}
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
            {/* Numeração de páginas dinâmica injetada pelo CSS */}
            <span className="print-page-counter font-bold text-foreground"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
