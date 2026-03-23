"use client"

import { useState } from "react"
import { authGateway } from "@/core/infrastructure/gateways/auth-gateway"

export function useRegister() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function submitRegister(formData: FormData) {
        setLoading(true)
        setError("")

        const result = await authGateway.register(formData)

        if (!result.success) {
            setError(result.error || "Erro desconhecido.")
            setLoading(false) // Só para loading se der erro. Se der sucesso, o redirect acontece.
        }
        // Se sucesso, a Server Action faz o redirect, então não precisamos setar loading false
    }

    return {
        loading,
        error,
        submitRegister
    }
}