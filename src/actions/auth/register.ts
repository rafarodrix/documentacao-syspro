"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { Role } from "@prisma/client"
import { redirect } from "next/navigation"

export async function registerUser(formData: FormData) {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!name || !email || !password) {
        return { error: "Preencha todos os campos obrigatórios." }
    }

    try {
        // 1. Cria usuário no Better Auth (Hash seguro)
        const authResponse = await auth.api.signUpEmail({
            body: { email, password, name },
            headers: await headers()
        })

        if (!authResponse?.user) throw new Error("Falha na autenticação.")

        // 2. Define role inicial como CLIENTE_USER (sem poder) no Prisma
        await prisma.user.update({
            where: { id: authResponse.user.id },
            data: { role: Role.CLIENTE_USER, isActive: true }
        })

    } catch (error: any) {
        if (error?.body?.message) return { error: error.body.message }
        return { error: "Erro ao criar conta. Tente novamente." }
    }

    // Redireciona para o App (onde cairá na tela de "Aguardando Vínculo")
    redirect("/app")
}