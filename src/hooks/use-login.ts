"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authGateway } from "@/core/infrastructure/gateways/auth-gateway"
import { authClient } from "@/lib/auth-client" // Import necessário para verificar a role
import { toast } from "sonner"

export function useLogin() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const router = useRouter()
    const searchParams = useSearchParams()

    // Pegamos o callbackUrl APENAS se ele existir na barra de endereço.
    // Não definimos um padrão aqui para podermos aplicar a lógica de Admin vs App.
    const urlCallback = searchParams.get('callbackUrl')

    async function submitLogin() {
        setIsLoading(true)
        setError(null)

        // 1. Tenta realizar o login via Gateway
        const result = await authGateway.login(email, password, urlCallback || "")

        if (result.success) {
            toast.success("Login realizado com sucesso!")

            // 2. Lógica de Redirecionamento Inteligente

            // A: Se o usuário estava tentando acessar uma página específica, manda pra lá
            if (urlCallback) {
                router.push(urlCallback)
                return
            }

            // B: Se foi um login direto, verificamos quem é o usuário para mandar pro lugar certo
            try {
                const sessionData = await authClient.getSession()

                // Usamos 'as any' para acessar a propriedade 'role' que o TS desconhece no cliente
                const user = sessionData.data?.user as any
                const role = user?.role

                // Admins e Devs vão para o Painel Administrativo
                if (role === 'ADMIN' || role === 'DEVELOPER') {
                    router.push("/admin")
                }
                // Clientes e Suporte vão para o App
                else {
                    router.push("/app")
                }
            } catch (err) {
                // Fallback de segurança se falhar ao pegar sessão
                router.push("/app")
            }

            // Nota: Não setamos isLoading(false) aqui para evitar que o formulário
            // fique editável novamente enquanto o redirecionamento acontece.
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