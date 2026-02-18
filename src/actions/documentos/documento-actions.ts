'use server'

import { prisma } from "@/lib/prisma"
import { DocumentoFormValues, documentoSchema } from "@/core/application/schema/documento-schema"
import { revalidatePath } from "next/cache"

// --- LISTAR ---
export async function getDocumentos() {
    try {
        const docs = await prisma.documentoConfig.findMany({
            orderBy: { updatedAt: 'desc' }
        })
        return { success: true, data: docs }
    } catch (error) {
        console.error("Erro ao buscar documentos:", error)
        return { success: false, error: "Falha ao carregar dados." }
    }
}

// --- SALVAR (CRIAR ou EDITAR) ---
export async function saveDocumento(data: DocumentoFormValues) {
    // 1. Validação no Servidor (Segurança extra)
    const validation = documentoSchema.safeParse(data)

    if (!validation.success) {
        return { success: false, error: "Dados inválidos." }
    }

    // 2. Sanitização (A CORREÇÃO DO ERRO ESTÁ AQUI)
    // Separamos o ID e os campos que NÃO existem no banco para não enviá-los ao Prisma
    const {
        id,
        emitente,           // Removido do payload
        maximoItens,        // Removido do payload
        atualizaComercial,  // Removido do payload
        processamentoEtapa, // Removido do payload
        ...payload          // O resto vai para o banco
    } = validation.data

    try {
        // Verifica se é Edição (ID existe e é válido)
        if (id && id.length > 10) {
            // --- ATUALIZAR (UPDATE) ---
            await prisma.documentoConfig.update({
                where: { id },
                data: {
                    ...payload,
                    // Garante array vazio se undefined para evitar erro no banco
                    comportamentos: payload.comportamentos || []
                },
            })
        } else {
            // --- CRIAR (CREATE) ---
            await prisma.documentoConfig.create({
                data: {
                    ...payload,
                    comportamentos: payload.comportamentos || []
                },
            })
        }

        // Atualiza o cache da listagem
        revalidatePath("/platform/tools/configuracao-documentos")
        return { success: true }

    } catch (error) {
        console.error("Erro crítico ao salvar no Prisma:", error)
        return { success: false, error: "Erro interno ao persistir dados." }
    }
}

// --- EXCLUIR ---
export async function deleteDocumento(id: string) {
    try {
        await prisma.documentoConfig.delete({ where: { id } })
        revalidatePath("/platform/tools/configuracao-documentos")
        return { success: true }
    } catch (error) {
        console.error("Erro ao excluir:", error)
        return { success: false, error: "Erro ao excluir registro." }
    }
}