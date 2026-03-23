"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authGateway } from "@/core/infrastructure/gateways/auth-gateway"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"

// ─── Constantes ───────────────────────────────────────────────────────────────

// ─── Hook ─────────────────────────────────────────────────────────────────────

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

    // ✅ MELHORIA: Toast só após sucesso confirmado
    toast.success("Login realizado com sucesso!")

    // Validação final de sessão ativa/autorizada no servidor.
    // Evita loop quando há cookie de login, mas o usuário está sem acesso válido no portal.
    try {
      const accessProbe = await fetch("/api/platform/session-role", {
        method: "GET",
        cache: "no-store",
      })

      if (!accessProbe.ok) {
        await authClient.signOut()
        setError("Seu acesso ao portal está bloqueado. Verifique contrato ativo da empresa ou contate o suporte.")
        setIsLoading(false)
        return
      }
    } catch {
      await authClient.signOut()
      setError("Não foi possível validar seu acesso ao portal. Tente novamente.")
      setIsLoading(false)
      return
    }

    // Se havia uma rota de destino, respeita ela
    if (urlCallback) {
      router.push(urlCallback)
      return
    }

    // ✅ MELHORIA: Redirect baseado na role com tratamento de erro isolado
    try {
      await authClient.getSession()
      router.push("/app")
    } catch {
      // Fallback seguro — se falhar ao ler sessão, manda para /app
      router.push("/app")
    }

    // Não reseta isLoading aqui intencionalmente:
    // o formulário não deve ficar editável durante o redirect
  }

  // ✅ MELHORIA: Função de reset para casos de navegação sem recarregar a página
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
