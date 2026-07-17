"use client"

import { useState } from "react"
import { authGateway } from "@/features/auth/infrastructure/gateways/auth-gateway"

export function useForgotPassword() {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    async function submitRequest() {
        setLoading(true)
        setError("")
        setSuccess(false)

        const result = await authGateway.requestPasswordReset(email)

        if (result.success) {
            setSuccess(true)
        } else {
            setError(result.error || "Erro desconhecido.")
        }

        setLoading(false)
    }

    return {
        formState: { email, loading, error, success },
        setEmail,
        setSuccess,
        submitRequest
    }
}
