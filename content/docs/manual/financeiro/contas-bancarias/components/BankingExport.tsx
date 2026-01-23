import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateBankingConfigPDF = (data: any) => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    // --- 1. CABEÇALHO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("Configurações Bancárias e Homologação", margin, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Manual de Integração - Syspro ERP", margin, 26);

    // Linha decorativa
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 30, pageWidth - margin, 30);

    // --- 2. VISÃO GERAL ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Visão Geral", margin, 40);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const introText = "Este documento descreve os passos necessários para configurar e homologar a emissão de boletos e o envio de arquivos de remessa entre o Syspro ERP e sua instituição financeira.";
    const splitIntro = doc.splitTextToSize(introText, pageWidth - (margin * 2));
    doc.text(splitIntro, margin, 46);

    // --- 3. TABELA DE DICIONÁRIO ---
    doc.setFont("helvetica", "bold");
    doc.text("Dicionário de Dados Técnicos", margin, 65);

    autoTable(doc, {
        startY: 70,
        head: [['Campo', 'Descrição', 'Importância']],
        body: [
            ['Código Cedente', 'Identificação da empresa no banco.', 'Essencial para crédito do valor.'],
            ['Carteira', 'Tipo de modalidade (com/sem registro).', 'Define regras de juros e protesto.'],
            ['Layout CNAB', 'Padrão 240, 400 ou 444.', 'Define como o arquivo é lido pelo banco.'],
            ['Nosso Número', 'Sequencial único do boleto.', 'Evita duplicidade de cobrança.'],
        ],
        theme: 'striped',
        // CORREÇÃO LINHA 57: fillStyle -> fillColor
        headStyles: { fillColor: [51, 122, 183], textColor: 255 },
        margin: { left: margin, right: margin }
    });

    // --- 4. FLUXO DE HOMOLOGAÇÃO ---
    let currentY = (doc as any).lastAutoTable.finalY + 15;

    doc.setFont("helvetica", "bold");
    doc.text("Passos para Homologação", margin, currentY);

    const steps = [
        "1. Coleta de dados com o gerente da conta bancária.",
        "2. Preenchimento do cadastro no módulo Financeiro do Syspro ERP.",
        "3. Geração e envio do arquivo de remessa de teste ao banco.",
        "4. Validação da leitura do boleto impresso."
    ];

    doc.setFont("helvetica", "normal");
    steps.forEach((step, index) => {
        doc.text(step, margin + 2, currentY + 7 + (index * 6));
    });

    // --- 5. RODAPÉ ---
    const date = new Date().toLocaleDateString('pt-BR');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Documento gerado em: ${date}`, margin, pageHeight - 10);
    doc.text("Syspro ERP - Suporte Técnico", pageWidth - 50, pageHeight - 10);

    // --- DOWNLOAD ---
    doc.save(`homologacao_bancaria_${date.replace(/\//g, '-')}.pdf`);
};