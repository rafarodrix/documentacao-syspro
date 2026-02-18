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
        return { error: "Preencha todos os campos." }
    }

    try {
        // O Better Auth cria User e Account (com a senha) automaticamente aqui
        const authResponse = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name,
            },
            headers: await headers()
        })

        if (!authResponse?.user) {
            return { error: "Erro ao registrar usuário." }
        }

        // Atualizamos apenas campos extras que o Better Auth não conhece (Role)
        await prisma.user.update({
            where: { id: authResponse.user.id },
            data: {
                role: Role.CLIENTE_USER,
                isActive: true
            }
        })

    } catch (error: any) {
        // Se der erro de APIError, pegamos a mensagem
        if (error?.body?.message) return { error: error.body.message }
        return { error: "Erro ao processar cadastro." }
    }

    redirect("/app")
}