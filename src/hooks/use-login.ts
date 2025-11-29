"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authGateway } from "@/core/infrastructure/gateways/auth-gateway"
import { toast } from "sonner"

export function useLogin() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get('callbackUrl') || '/app' // Padrão vai para o App

    async function submitLogin() {
        setIsLoading(true)
        setError(null)

        const result = await authGateway.login(email, password, callbackUrl)

        if (result.success) {
            toast.success("Login realizado com sucesso!")
            router.push(callbackUrl)
            // Não paramos o loading aqui para evitar "flash" de conteúdo antes do redirect
        } else {
            setError(result.error || "Erro desconhecido.")
            setIsLoading(false)
        }
    }

    return {
        email, setEmail,
        password, setPassword,
        isLoading,
        error,
        submitLogin
    }
}