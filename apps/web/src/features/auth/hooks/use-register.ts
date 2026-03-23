"use client"

import { useState } from "react"
import { authGateway } from "@/features/auth/infrastructure/gateways/auth-gateway"

export function useRegister() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function submitRegister(formData: FormData) {
        setLoading(true)
        setError("")

        const result = await authGateway.register(formData)

        if (!result.success) {
            setError(result.error || "Erro desconhecido.")
            setLoading(false)
        }
    }

    return {
        loading,
        error,
        submitRegister
    }
}