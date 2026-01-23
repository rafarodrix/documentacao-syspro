'use client';
import React, { useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download } from 'lucide-react';

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

        // --- CABEÇALHO ---
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 15, 'F');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.text("Check-list de Dados para Homologação de Boleto ", margin, 25);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const introText = "Para realizarmos a homologação junto ao banco e configurar a emissão de boletos, preencha os dados abaixo:";
        doc.text(doc.splitTextToSize(introText, pageWidth - (margin * 2)), margin, 40);

        // --- FUNÇÃO AUXILIAR PARA CRIAR SEÇÕES ---
        const createFormTable = (title: string, data: string[][], startY: number) => {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text(title, margin, startY);

            autoTable(doc, {
                startY: startY + 2,
                body: data,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3, textColor: 50 },
                columnStyles: {
                    0: { cellWidth: 50, fontStyle: 'bold', fillColor: [245, 245, 245] },
                    1: { cellWidth: 'auto' }
                },
                margin: { left: margin, right: margin }
            });
            return (doc as any).lastAutoTable.finalY + 8;
        };

        // --- 1. DADOS DA CONTA ---
        let nextY = createFormTable("1. Dados da Conta", [
            ['Banco', ''],
            ['Agência', ''],
            ['Dígito da Agência', ''],
            ['Conta', ''],
            ['Dígito da Conta', ''],
            ['CNPJ', ''],
            ['Razão Social', '']
        ], 50);

        // --- 2. DADOS DO BOLETO ---
        nextY = createFormTable("2. Dados Técnicos do Boleto", [
            ['Código do Cedente', ''],
            ['Código do Convênio', ''],
            ['Modalidade', ''],
            ['Carteira', ''],
            ['Código Transmissão', ''],
            ['Layout (CNAB 240/400/444)', '']
        ], nextY);

        // --- 3. INSTRUÇÕES E FAIXAS ---
        nextY = createFormTable("3. Configurações e Instruções", [
            ['Taxa Juros ao Mês (%)', ''],
            ['Taxa Multa ao Mês (%)', ''],
            ['Envia para protesto?', '[ ] Sim  [ ] Não'],
            ['Dias para Protesto', ''],
            ['Nosso Número (Início)/(Fim)', ''],
            ['Chave NF-e no arquivo?', '[ ] Sim  [ ] Não']
        ], nextY);

        // --- MENSAGEM FIXA ---
        doc.setFont("helvetica", "bold");
        doc.text("4. Mensagem Fixa no Boleto", margin, nextY);
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, nextY + 2, pageWidth - (margin * 2), 15);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.text("Ex: Após o vencimento, o título poderá ser encaminhado a protesto.", margin + 2, nextY + 6);

        // --- RODAPÉ ---
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, margin, pageHeight - 10);
        doc.text("Syspro ERP - Documentação Técnica", pageWidth - margin, pageHeight - 10, { align: 'right' });

        doc.save(`solicitacao_homologacao_${new Date().getTime()}.pdf`);
    }, []);

    return (
        <div className="my-4">
            <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all active:scale-95 text-sm font-bold"
            >
                <Download className="w-5 h-5" />
                Gerar Check-list para o Banco (PDF)
            </button>
        </div>
    );
};

export default BankingExport;