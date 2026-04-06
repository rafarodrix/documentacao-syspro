"use server"

import { redirect } from "next/navigation"
import { getBackendApiBaseUrl } from "@/lib/backend-api"

export async function registerUser(formData: FormData) {
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!name || !email || !password) {
        return { error: "Preencha todos os campos." }
    }

    try {
        const response = await fetch(`${getBackendApiBaseUrl()}/auth/register`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                email,
                password,
                name,
            }),
            cache: "no-store",
        })

        const data = (await response.json().catch(() => null)) as
            | { success?: boolean; error?: string }
            | null

        if (!response.ok || !data?.success) {
            return { error: data?.error || "Erro ao registrar usuario." }
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.message) return { error: error.message }
        return { error: "Erro ao processar cadastro." }
    }

    redirect("/login")
}
