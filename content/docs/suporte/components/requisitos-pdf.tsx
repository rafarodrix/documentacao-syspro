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
    
    // Configurações Estéticas do PDF (Monocromático Enterprise)
    const cinzaEscuro: [number, number, number] = [39, 39, 42]; 
    const cinzaClaro: [number, number, number] = [113, 113, 122];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...cinzaEscuro);
    doc.text('Syspro ERP', 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text('Especificações Técnicas de Infraestrutura', 14, 26);
    doc.line(14, 30, pageWidth - 14, 30);

    autoTable(doc, {
      startY: 38,
      head: [['Configuração', 'Processador', 'RAM', 'SSD', 'Sistema']],
      body: [
        ['Servidor (1-5 PDVs)', 'i5-12400', '8GB', '500GB', 'Win 10/Server'],
        ['Servidor (6-10 PDVs)', 'i7-12700', '16GB', '500GB', 'Win 10/Server'],
        ['Estação PDV', 'i3-10100', '8GB', '256GB', 'Windows 10'],
      ],
      headStyles: { fillColor: cinzaEscuro, fontStyle: 'bold' },
      styles: { fontSize: 9, font: "helvetica" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });

    doc.setFontSize(8);
    doc.setTextColor(...cinzaClaro);
    doc.text('Documento oficial para fins de cotação de hardware.', 14, doc.internal.pageSize.getHeight() - 10);

    doc.save('Especificacoes_Tecnicas_Syspro.pdf');
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
            <p className="text-xs text-fd-muted-foreground">Documento PDF formatado para TI e fornecedores.</p>
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
      
      {/* Detalhe minimalista de borda inferior */}
      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-fd-primary transition-all group-hover:w-full" />
    </div>
  );
}