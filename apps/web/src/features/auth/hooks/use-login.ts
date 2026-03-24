"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authGateway } from "@/features/auth/infrastructure/gateways/auth-gateway"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"

export function useLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const urlCallback = searchParams.get("callbackUrl")

  async function submitLogin() {
    setIsLoading(true)
    setError(null)

    const result = await authGateway.login(email, password, urlCallback || "")

    if (!result.success) {
      setError(result.error ?? "Erro desconhecido.")
      setIsLoading(false)
      return
    }

    toast.success("Login realizado com sucesso!")

    try {
      const accessProbe = await fetch("/api/platform/session-role", {
        method: "GET",
        cache: "no-store",
      })

      if (!accessProbe.ok) {
        await authClient.signOut()
        setError("Seu acesso ao portal esta bloqueado. Verifique contrato ativo da empresa ou contate o suporte.")
        setIsLoading(false)
        return
      }
    } catch {
      await authClient.signOut()
      setError("Nao foi possivel validar seu acesso ao portal. Tente novamente.")
      setIsLoading(false)
      return
    }

    if (urlCallback) {
      router.push(urlCallback)
      return
    }

    try {
      await authClient.getSession()
      router.push("/portal")
    } catch {
      router.push("/portal")
    }
  }

  function resetForm() {
    setEmail("")
    setPassword("")
    setError(null)
    setIsLoading(false)
  }

  return {
    email, setEmail,
    password, setPassword,
    isLoading,
    error,
    submitLogin,
    resetForm,
  }
}