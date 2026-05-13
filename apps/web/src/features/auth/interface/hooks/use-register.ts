"use client"

import { useState } from "react"
import { authGateway } from "@/features/auth/infrastructure/gateways/auth-gateway"

export function useRegister() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    async function submitRegister(formData: FormData) {
        setIsLoading(true)
        setError("")

        const result = await authGateway.register(formData)

        if (!result.success) {
            setError(result.error || "Erro desconhecido.")
            setIsLoading(false)
        }
    }

    return {
        isLoading,
        error,
        submitRegister,
    }
}
