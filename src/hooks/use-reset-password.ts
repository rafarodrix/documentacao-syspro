"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authGateway } from "@/core/infrastructure/gateways/auth-gateway"
import { toast } from "sonner"

// ─── Validação de Força de Senha ──────────────────────────────────────────────

// ✅ MELHORIA: Validação de força de senha no cliente
// Regras alinhadas com o que o Better Auth exige no servidor.
export interface PasswordStrength {
  score: number          // 0–4
  label: "Muito fraca" | "Fraca" | "Razoável" | "Boa" | "Forte"
  color: string          // classe Tailwind para a barra de progresso
  passes: boolean        // true = atende os requisitos mínimos
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const levels: PasswordStrength[] = [
    { score: 0, label: "Muito fraca", color: "bg-red-500",    passes: false },
    { score: 1, label: "Fraca",       color: "bg-orange-400", passes: false },
    { score: 2, label: "Razoável",    color: "bg-yellow-400", passes: true  },
    { score: 3, label: "Boa",         color: "bg-blue-500",   passes: true  },
    { score: 4, label: "Forte",       color: "bg-green-500",  passes: true  },
  ]

  return levels[Math.min(score, 4)]
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useResetPassword() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  // ✅ MELHORIA: Expõe avaliação de força para o componente renderizar barra visual
  const passwordStrength = evaluatePasswordStrength(password)

  async function submitReset() {
    setLoading(true)
    setError("")

    // ✅ MELHORIA: Validações de UI mais completas antes de chamar o gateway
    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.")
      setLoading(false)
      return
    }

    if (!passwordStrength.passes) {
      setError("Escolha uma senha mais forte para proteger sua conta.")
      setLoading(false)
      return
    }

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
    submitReset,
    passwordStrength, // ✅ novo — usado pelo ResetPasswordForm para a barra visual
  }
}