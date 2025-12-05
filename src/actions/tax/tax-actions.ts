"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// MOCK: Dados da Reforma Tributária (Exemplo simplificado para popular o banco)
// Estrutura: CST -> Classificações
const MOCK_TAX_DATA = [
    {
        cst: "01", // Código do CST
        description: "Operação tributável com alíquota básica",
        publishDate: new Date("2024-01-01"),
        startDate: new Date("2024-01-01"),
        indIBSCBS: true, // Incide imposto
        classifications: [
            {
                code: "101", // cClassTrib
                description: "Venda de mercadoria padrão",
                pRedIBS: 0,
                pRedCBS: 0,
                indTribRegular: true,
                publishDate: new Date("2024-01-01"),
                startDate: new Date("2024-01-01"),
            },
            {
                code: "102",
                description: "Prestação de serviço padrão",
                pRedIBS: 0,
                pRedCBS: 0,
                indTribRegular: true,
                publishDate: new Date("2024-01-01"),
                startDate: new Date("2024-01-01"),
            }
        ]
    },
    {
        cst: "40",
        description: "Operação isenta",
        publishDate: new Date("2024-01-01"),
        startDate: new Date("2024-01-01"),
        indIBSCBS: false,
        classifications: [
            {
                code: "401",
                description: "Operação isenta conf. Lei X",
                pRedIBS: 100, // 100% de redução (Isento)
                pRedCBS: 100,
                indTribRegular: false,
                publishDate: new Date("2024-01-01"),
                startDate: new Date("2024-01-01"),
            }
        ]
    }
];

export async function syncTaxClassificationsAction() {
    try {
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Fake delay

        console.log("Iniciando sincronização CST + Classificações...");

        const result = await prisma.$transaction(async (tx) => {
            let countCST = 0;
            let countClass = 0;

            for (const item of MOCK_TAX_DATA) {
                // 1. Upsert do CST (Pai)
                const cstRecord = await tx.taxCST.upsert({
                    where: { cst: item.cst },
                    update: {
                        description: item.description
                    },
                    create: {
                        cst: item.cst,
                        description: item.description,
                        publishDate: item.publishDate,
                        startDate: item.startDate,
                        indIBSCBS: item.indIBSCBS,
                        // Defaults para os outros booleans conforme seu schema
                        indRedBC: false,
                        indRedAliq: false,
                        indTransfCred: true,
                        indDif: false,
                        indAjusteCompet: false,
                        indIBSCBSMono: false,
                        indCredPresIBSZFM: false,
                    }
                });
                countCST++;

                // 2. Upsert das Classificações (Filhos) vinculadas ao CST
                for (const cls of item.classifications) {
                    await tx.taxClassification.upsert({
                        where: { code: cls.code },
                        update: {
                            description: cls.description,
                            cstId: cstRecord.id // Garante o vínculo se mudar algo
                        },
                        create: {
                            code: cls.code,
                            description: cls.description,
                            cstId: cstRecord.id, // VÍNCULO OBRIGATÓRIO (Foreign Key)

                            // Valores Decimais e Flags
                            pRedIBS: cls.pRedIBS,
                            pRedCBS: cls.pRedCBS,
                            indTribRegular: cls.indTribRegular,

                            // Datas
                            publishDate: cls.publishDate,
                            startDate: cls.startDate,

                            // Defaults obrigatórios
                            indNFe: true,
                            indNFCe: true,
                            indCTe: false,
                            indNFSe: false,
                            indCredPresOper: false,
                            indEstornoCred: false,
                        }
                    });
                    countClass++;
                }
            }
            return { cst: countCST, class: countClass };
        });

        revalidatePath("/admin/settings");

        return {
            success: true,
            message: `Sincronização concluída: ${result.cst} CSTs e ${result.class} Classificações atualizadas.`,
        };

    } catch (error) {
        console.error("Erro ao sincronizar tabelas fiscais:", error);
        return {
            success: false,
            error: "Falha ao processar dados fiscais. Verifique os logs.",
        };
    }
}