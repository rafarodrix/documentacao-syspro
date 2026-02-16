"use client"

import { useState } from "react"
import { authGateway } from "@/core/infrastructure/gateways/auth-gateway"

export function useForgotPassword() {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    // A função de submit fica aqui, limpa
    async function submitRequest() {
        setLoading(true)
        setError("")
        setSuccess(false)

        // Chama o Core 
        const result = await authGateway.requestPasswordReset(email)

        if (result.success) {
            setSuccess(true)
        } else {
            setError(result.error || "Erro desconhecido.")
        }

        setLoading(false)
    }

    // Retorna apenas o necessário para a tela desenhar
    return {
        formState: { email, loading, error, success },
        setEmail,
        setSuccess, // Para o botão de "Tentar outro"
        submitRequest
    }
}