import React, { useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download } from 'lucide-react'; // Certifique-se de ter o lucide-react instalado

const BankingExport = () => {
    const handleDownload = useCallback(() => {
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 14;
        const primaryColor: [number, number, number] = [51, 122, 183];

        // --- 1. CABEÇALHO ---
        // Faixa decorativa superior
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 15, 'F');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text("Configurações Bancárias e Homologação", margin, 30);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Manual de Integração - Syspro ERP", margin, 36);

        // Linha divisória
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, 40, pageWidth - margin, 40);

        // --- 2. VISÃO GERAL ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("1. Visão Geral", margin, 50);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const introText = "Este documento descreve os passos necessários para configurar e homologar a emissão de boletos e o envio de arquivos de remessa entre o Syspro ERP e sua instituição financeira.";
        const splitIntro = doc.splitTextToSize(introText, pageWidth - (margin * 2));
        doc.text(splitIntro, margin, 56);

        // --- 3. TABELA DE DICIONÁRIO ---
        doc.setFont("helvetica", "bold");
        doc.text("2. Dicionário de Dados Técnicos", margin, 75);

        autoTable(doc, {
            startY: 80,
            head: [['Campo', 'Descrição', 'Importância']],
            body: [
                ['Código Cedente', 'Identificação da empresa no banco.', 'Essencial para crédito do valor.'],
                ['Carteira', 'Tipo de modalidade (com/sem registro).', 'Define regras de juros e protesto.'],
                ['Layout CNAB', 'Padrão 240, 400 ou 444.', 'Define como o arquivo é lido pelo banco.'],
                ['Nosso Número', 'Sequencial único do boleto.', 'Evita duplicidade de cobrança.'],
            ],
            theme: 'striped',
            headStyles: {
                fillColor: primaryColor,
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: { fontSize: 9, cellPadding: 4 },
            margin: { left: margin, right: margin }
        });

        // --- 4. FLUXO DE HOMOLOGAÇÃO ---
        // Pega a posição final da tabela dinamicamente
        const finalY = (doc as any).lastAutoTable.finalY || 120;
        let currentY = finalY + 15;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("3. Passos para Homologação", margin, currentY);

        const steps = [
            { t: "Coleta de Dados:", d: "Reunir informações com o gerente da conta bancária." },
            { t: "Configuração ERP:", d: "Preenchimento do cadastro no módulo Financeiro do Syspro." },
            { t: "Teste de Remessa:", d: "Geração e envio do arquivo de teste ao validador do banco." },
            { t: "Validação Impressa:", d: "Verificação da leitura do código de barras e linha digitável." }
        ];

        doc.setFontSize(10);
        steps.forEach((step, index) => {
            const stepY = currentY + 10 + (index * 12);
            // Marcador (bullet)
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.circle(margin + 2, stepY - 1, 1, 'F');

            doc.setFont("helvetica", "bold");
            doc.text(step.t, margin + 6, stepY);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(80, 80, 80);
            doc.text(step.d, margin + 6, stepY + 5);
            doc.setTextColor(0, 0, 0);
        });

        // --- 5. RODAPÉ ---
        const date = new Date().toLocaleDateString('pt-BR');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        doc.text(`Gerado em: ${date}`, margin, pageHeight - 10);
        doc.text("Página 1 de 1", pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text("Syspro ERP - Suporte Técnico", pageWidth - margin, pageHeight - 10, { align: 'right' });

        // --- DOWNLOAD ---
        doc.save(`homologacao_syspro_${date.replace(/\//g, '-')}.pdf`);
    }, []);

    return (
        <div className="p-4">
            <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all active:scale-95 text-sm font-semibold"
            >
                <Download className="w-4 h-4" />
                Exportar Guia de Homologação
            </button>
        </div>
    );
};

export default BankingExport;