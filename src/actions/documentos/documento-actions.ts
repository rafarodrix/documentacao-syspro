'use server'

import { prisma } from "@/lib/prisma" // Certifique-se que o caminho do seu prisma client está correto
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

    const { id, ...payload } = validation.data

    try {
        if (id && id.length > 10) {
            // --- ATUALIZAR (UPDATE) ---
            await prisma.documentoConfig.update({
                where: { id },
                data: {
                    ...payload,
                    // Garante que array venha vazio se for undefined
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

        // Atualiza a tela sem recarregar a página
        revalidatePath("/platform/tools/configuracao-documentos")
        return { success: true }

    } catch (error) {
        console.error("Erro ao salvar:", error)
        return { success: false, error: "Erro de banco de dados." }
    }
}

// --- EXCLUIR ---
export async function deleteDocumento(id: string) {
    try {
        await prisma.documentoConfig.delete({ where: { id } })
        revalidatePath("/platform/tools/configuracao-documentos")
        return { success: true }
    } catch (error) {
        return { success: false, error: "Erro ao excluir." }
    }
}