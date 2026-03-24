"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { Role } from "@prisma/client"
import { redirect } from "next/navigation"

type AuthApiError = {
    body?: {
        message?: string
    }
}

function getAuthErrorMessage(error: unknown): string | null {
    if (typeof error !== "object" || error === null) return null

    const authError = error as AuthApiError
    return authError.body?.message ?? null
}

export async function registerUser(formData: FormData) {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!name || !email || !password) {
        return { error: "Preencha todos os campos." }
    }

    try {
        const authResponse = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name,
            },
            headers: await headers()
        })

        if (!authResponse?.user) {
            return { error: "Erro ao registrar usuario." }
        }

        await prisma.user.update({
            where: { id: authResponse.user.id },
            data: {
                role: Role.CLIENTE_USER,
                isActive: true
            }
        })

    } catch (error: unknown) {
        const authMessage = getAuthErrorMessage(error)
        if (authMessage) return { error: authMessage }
        return { error: "Erro ao processar cadastro." }
    }

    redirect("/app")
}
