"use server";

import { prisma } from "@/lib/prisma"; // Ajuste o import do seu client prisma
import { revalidatePath } from "next/cache";

// Dados estáticos para exemplo (Baseado na Tabela 08 do eSocial - Classificação Tributária)
// Em um cenário real, você poderia buscar isso de uma API externa aqui.
const MOCK_TAX_CLASSIFICATIONS = [
    { code: "01", name: "Empresa enquadrada no regime de tributação Simples Nacional com tributação previdenciária substituída" },
    { code: "02", name: "Empresa enquadrada no regime de tributação Simples Nacional com tributação previdenciária não substituída" },
    { code: "03", name: "Empresa enquadrada no regime de tributação Simples Nacional com tributação previdenciária substituída e não substituída" },
    { code: "04", name: "MEI - Microempreendedor Individual" },
    { code: "21", name: "Pessoa Física, exceto Segurado Especial" },
    { code: "99", name: "Pessoas Jurídicas em Geral" },
];

export async function syncTaxClassificationsAction() {
    try {
        // 1. Simular delay de rede ou chamada de API externa
        await new Promise((resolve) => setTimeout(resolve, 1500));

        console.log("Iniciando sincronização de tabelas fiscais...");

        // 2. Transação para garantir integridade
        const transactionResult = await prisma.$transaction(async (tx) => {
            let count = 0;

            for (const item of MOCK_TAX_CLASSIFICATIONS) {
                // Upsert: Cria se não existe, atualiza se existe (baseado no código)
                // Ajuste 'taxClassification' para o nome real da sua tabela no Prisma
                await tx.taxClassification.upsert({
                    where: { code: item.code },
                    update: { name: item.name },
                    create: {
                        code: item.code,
                        name: item.name,
                        description: `Sincronizado via sistema`,
                    },
                });
                count++;
            }
            return count;
        });

        // 3. Revalidar cache se necessário (opcional, dependendo de onde exibe os dados)
        revalidatePath("/admin/settings");

        return {
            success: true,
            message: `${transactionResult} classificações tributárias sincronizadas com sucesso!`,
        };

    } catch (error) {
        console.error("Erro ao sincronizar tabelas fiscais:", error);
        return {
            success: false,
            error: "Falha ao conectar com o banco de dados ou processar tabelas.",
        };
    }
}