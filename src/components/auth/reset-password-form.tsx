"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation" // useSearchParams pega o token
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"
import { Loader2, Lock, AlertCircle, CheckCircle2 } from "lucide-react"
import { AuthLayoutWrapper } from "@/components/auth/auth-layout-wrapper"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function ResetPasswordForm() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get("token") // O Better Auth manda isso na URL

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError("")

        if (password !== confirmPassword) {
            setError("As senhas não coincidem.")
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError("A senha deve ter no mínimo 6 caracteres.")
            setLoading(false)
            return
        }

        if (!token) {
            setError("Token de recuperação inválido ou expirado.")
            setLoading(false)
            return
        }

        try {
            const { error } = await authClient.resetPassword({
                newPassword: password,
                token: token
            })

            if (error) {
                setError(error.message || "Não foi possível redefinir a senha.")
            } else {
                toast.success("Senha alterada com sucesso!")
                router.push("/login")
            }
        } catch (err) {
            setError("Erro ao conectar com o servidor.")
        } finally {
            setLoading(false)
        }
    }

    if (!token) {
        return (
            <AuthLayoutWrapper title="Link Inválido" description="Não foi possível identificar sua solicitação." backButton={true}>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>O link de recuperação parece inválido ou expirado. Solicite um novo.</AlertDescription>
                </Alert>
                <Button className="w-full mt-4" onClick={() => router.push("/forgot-password")}>
                    Solicitar nova senha
                </Button>
            </AuthLayoutWrapper>
        )
    }

    return (
        <AuthLayoutWrapper
            title="Redefinir Senha"
            description="Crie uma nova senha segura para sua conta."
            backButton={false} // Não precisa voltar aqui, o foco é concluir
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Erro</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password" className={cn("text-xs uppercase font-semibold tracking-wider", error ? "text-red-500" : "text-muted-foreground")}>Nova Senha</Label>
                        <div className="relative group">
                            <div className={cn("absolute left-3 top-2.5 transition-colors", error ? "text-red-500" : "text-muted-foreground group-focus-within:text-primary")}>
                                <Lock className="h-5 w-5" />
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                className={cn("pl-10 h-11 bg-muted/30 border-muted-foreground/20", error && "border-red-500 bg-red-500/5")}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className={cn("text-xs uppercase font-semibold tracking-wider", error ? "text-red-500" : "text-muted-foreground")}>Confirmar Senha</Label>
                        <div className="relative group">
                            <div className={cn("absolute left-3 top-2.5 transition-colors", error ? "text-red-500" : "text-muted-foreground group-focus-within:text-primary")}>
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading}
                                className={cn("pl-10 h-11 bg-muted/30 border-muted-foreground/20", error && "border-red-500 bg-red-500/5")}
                            />
                        </div>
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 font-medium shadow-md transition-all hover:shadow-lg"
                >
                    {loading ? (
                        <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</div>
                    ) : "Alterar Senha"}
                </Button>
            </form>
        </AuthLayoutWrapper>
    )
}