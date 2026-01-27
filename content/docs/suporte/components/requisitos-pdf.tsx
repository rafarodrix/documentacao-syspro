"use client";

import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Download } from 'lucide-react';

// Interface para evitar erros de tipagem com o plugin autotable
interface jsPDFCustom extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

export default function GeradorPdfRequisitos() {
  const gerarPDF = () => {
    const doc = new jsPDF() as jsPDFCustom;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Configuração de Cores (RGB)
    const corPrimaria: [number, number, number] = [30, 41, 59]; // Slate 800
    const corDestaque: [number, number, number] = [37, 99, 235]; // Blue 600

    // --- CABEÇALHO ---
    doc.setFontSize(20);
    doc.setTextColor(...corPrimaria);
    doc.text('Syspro ERP - Requisitos do Sistema', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Este documento contém as especificações técnicas para o funcionamento ideal do sistema.', 14, 27);
    
    doc.setDrawColor(220);
    doc.line(14, 32, pageWidth - 14, 32);

    // --- TABELA 1: SERVIDORES ---
    doc.setFontSize(14);
    doc.setTextColor(...corPrimaria);
    doc.text('1. Infraestrutura de Servidor', 14, 42);

    autoTable(doc, {
      startY: 48,
      head: [['Escopo', 'Processador', 'Memória', 'Disco (SSD)', 'S.O.']],
      body: [
        ['1 a 5 PDVs', 'i5-12400', '8 GB DDR4', '500 GB NVMe', 'Win 10+ / Server'],
        ['6 a 10 PDVs', 'i7-12700', '16 GB DDR4', '500 GB NVMe', 'Win 10+ / Server'],
        ['11 a 20 PDVs', 'i9-12900', '32 GB DDR4', '1 TB NVMe', 'Win 10+ / Server'],
        ['21 a 30 PDVs', 'Xeon W-1290P', '64 GB DDR4', '2 TB NVMe', 'Win 10+ / Server'],
      ],
      headStyles: { fillColor: corDestaque },
      styles: { fontSize: 9, cellPadding: 4 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    // Captura posição dinâmica após a primeira tabela
    const finalYServer = doc.lastAutoTable?.finalY || 120;

    // --- TABELA 2: ESTAÇÕES ---
    doc.setFontSize(14);
    doc.text('2. Estações de Trabalho (PDV)', 14, finalYServer + 15);

    autoTable(doc, {
      startY: finalYServer + 20,
      head: [['Perfil', 'Processador', 'Memória', 'Disco', 'Observações']],
      body: [
        ['Dedicado', 'i3-10100', '8 GB', '256 GB SATA', 'Uso exclusivo Syspro'],
        ['Multitarefa', 'i5-10400s', '16 GB', '512 GB NVMe', 'Syspro + Excel/Web'],
      ],
      headStyles: { fillColor: corPrimaria },
      styles: { fontSize: 9, cellPadding: 4 },
    });

    const finalYEstacao = doc.lastAutoTable?.finalY || 200;

    // --- BOX DE ATENÇÃO ---
    doc.setFillColor(254, 249, 195); // Amarelo claro
    doc.setDrawColor(234, 179, 8); // Amarelo borda
    doc.roundedRect(14, finalYEstacao + 10, pageWidth - 28, 18, 2, 2, 'FD');
    
    doc.setFontSize(9);
    doc.setTextColor(133, 77, 14); // Marrom/Dourado escuro
    const aviso = 'Atenção: Hardwares abaixo do recomendado podem sofrer lentidão em operações multitarefa.';
    doc.text(aviso, 18, finalYEstacao + 21);

    // --- RODAPÉ ---
    doc.setFontSize(8);
    doc.setTextColor(150);
    const data = new Date().toLocaleDateString('pt-BR');
    doc.text(`Gerado em: ${data} | Syspro ERP Documentação Técnica`, 14, doc.internal.pageSize.getHeight() - 10);

    doc.save('Requisitos_Syspro_ERP.pdf');
  };

  return (
    <div className="my-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-10 transition-colors hover:border-blue-300">
      <div className="mb-4 rounded-full bg-blue-100 p-3 text-blue-600">
        <FileText size={32} />
      </div>
      
      <div className="mb-6 text-center">
        <h4 className="text-lg font-semibold text-slate-900">Versão Offline</h4>
        <p className="max-w-xs text-sm text-slate-500">
          Precisa enviar os requisitos para seu setor de TI ou fornecedor? Baixe a ficha técnica completa.
        </p>
      </div>

<button
        onClick={gerarPDF}
        className="group flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all active:scale-95
          /* Estilo Light */
          bg-slate-900 text-white hover:bg-slate-800
          /* Estilo Dark */
          dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 shadow-lg dark:shadow-blue-900/20"
      >
        <Download size={18} className="transition-transform group-hover:-translate-y-0.5" />
        Baixar PDF de Requisitos
      </button>
      
      <span className="mt-4 text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
        PDF Otimizado para Impressão
      </span>
    </div>
  );
}