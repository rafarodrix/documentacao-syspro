"use client";

import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Printer } from 'lucide-react';

interface jsPDFCustom extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

export default function GeradorPdfRequisitos() {
  const gerarPDF = () => {
    const doc = new jsPDF() as jsPDFCustom;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Configurações Estéticas (Enterprise Monocromático)
    const corPrimaria: [number, number, number] = [39, 39, 42]; 
    const corSecundaria: [number, number, number] = [113, 113, 122];

    // --- CABEÇALHO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...corPrimaria);
    doc.text('Syspro ERP', 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...corSecundaria);
    doc.text('Guia Oficial de Requisitos Mínimos e Infraestrutura', 14, 26);
    doc.line(14, 30, pageWidth - 14, 30);

    // --- SEÇÃO 1: SERVIDORES ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...corPrimaria);
    doc.text('1. Requisitos do Servidor', 14, 40);

    autoTable(doc, {
      startY: 44,
      head: [['Escopo', 'Processador', 'Memória', 'Disco (NVMe)', 'Rede / S.O.']],
      body: [
        ['1 a 5 PDVs', 'Intel Core i5-12400', '8 GB DDR4', '500 GB', '100/1000 - Win 10+/Server'],
        ['6 a 10 PDVs', 'Intel Core i7-12700', '16 GB DDR4', '500 GB', '100/1000 - Win 10+/Server'],
        ['11 a 20 PDVs', 'Intel Core i9-12900', '32 GB DDR4', '1 TB', '100/1000 - Win 10+/Server'],
        ['21 a 30 PDVs', 'Intel Xeon W-1290P', '64 GB DDR4', '2 TB', '100/1000 - Win 10+/Server'],
      ],
      headStyles: { fillColor: corPrimaria, fontStyle: 'bold' },
      styles: { fontSize: 8, font: "helvetica" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });

    const finalYServer = doc.lastAutoTable?.finalY || 80;

    // --- SEÇÃO 2: ESTAÇÕES (PDVs) ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text('2. Requisitos das Estações', 14, finalYServer + 12);

    autoTable(doc, {
      startY: finalYServer + 16,
      head: [['Perfil', 'Processador', 'Memória', 'Disco', 'Observações Técnicas']],
      body: [
        ['Uso Dedicado', 'i3-10100', '8 GB DDR4', '256 GB SSD', 'Monitor 19", Leitor, Imp. Fiscal'],
        ['Multitarefa', 'i5-10400s', '16 GB DDR4', '512 GB NVMe', 'Monitor 19", Leitor, Imp. Fiscal'],
      ],
      headStyles: { fillColor: [71, 85, 105], fontStyle: 'bold' },
      styles: { fontSize: 8, font: "helvetica" },
    });

    const finalYEstacoes = doc.lastAutoTable?.finalY || 150;

    // --- NOTA DE ATENÇÃO (CALLOUT) ---
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, finalYEstacoes + 10, pageWidth - 28, 15, 'FD');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(153, 27, 27); // Vermelho escuro/técnico
    doc.text('AVISO DE PERFORMANCE:', 18, finalYEstacoes + 16);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text('O uso de hardware abaixo do recomendado ou execução de múltiplos apps simultâneos impactará no desempenho.', 18, finalYEstacoes + 21);

    // --- RODAPÉ ---
    doc.setFontSize(8);
    doc.setTextColor(...corSecundaria);
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    doc.text(`Gerado em: ${dataAtual} | Syspro ERP Documentação`, 14, doc.internal.pageSize.getHeight() - 10);
    doc.text('Página 1/1', pageWidth - 25, doc.internal.pageSize.getHeight() - 10);

    doc.save('Requisitos_Tecnicos_Syspro_ERP.pdf');
  };

  return (
    <div className="group relative my-8 overflow-hidden rounded-lg border border-fd-border bg-fd-card p-6 transition-all hover:bg-fd-accent/5">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-fd-border bg-fd-muted text-fd-muted-foreground">
            <Printer size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-fd-foreground">Ficha Técnica de Hardware</h4>
            <p className="text-xs text-fd-muted-foreground">Documento PDF atualizado com os requisitos de Servidor e PDV.</p>
          </div>
        </div>

        <button
          onClick={gerarPDF}
          className="inline-flex items-center gap-2 rounded-md bg-fd-primary px-4 py-2 text-xs font-medium text-fd-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          <FileDown size={14} />
          Exportar PDF
        </button>
      </div>
      
      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-fd-primary transition-all group-hover:w-full" />
    </div>
  );
}