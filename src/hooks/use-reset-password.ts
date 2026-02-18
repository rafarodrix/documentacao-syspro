"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authGateway } from "@/core/infrastructure/gateways/auth-gateway"
import { toast } from "sonner"

export function useResetPassword() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get("token")

    async function submitReset() {
        setLoading(true)
        setError("")

        // Validações de UI (antes de chamar o gateway)
        if (password !== confirmPassword) {
            setError("As senhas não coincidem.")
            setLoading(false)
            return
        }

        if (!token) {
            setError("Token de recuperação inválido ou expirado.")
            setLoading(false)
            return
        }

        // Chamada ao Core
        const result = await authGateway.resetPassword(password, token)

        if (result.success) {
            toast.success("Senha alterada com sucesso!")
            router.push("/login")
        } else {
            setError(result.error || "Não foi possível redefinir a senha.")
            setLoading(false)
        }
    }

    return {
        formState: { password, confirmPassword, loading, error, token },
        setPassword,
        setConfirmPassword,
        submitReset
    }
}