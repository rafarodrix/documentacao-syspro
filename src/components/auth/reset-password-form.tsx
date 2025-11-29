"use client"

import { useResetPassword } from "@/hooks/use-reset-password"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"
import { Loader2, Lock, AlertCircle, CheckCircle2 } from "lucide-react"
import { AuthLayoutWrapper } from "@/components/auth/auth-layout-wrapper"
import { cn } from "@/lib/utils"

export function ResetPasswordForm() {
    // 1. Hook
    const {
        formState: { password, confirmPassword, loading, error, token },
        setPassword,
        setConfirmPassword,
        submitReset
    } = useResetPassword()

    // 2. Handler
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        submitReset()
    }

    // Caso token não exista (link quebrado)
    if (!token) {
        return (
            <AuthLayoutWrapper title="Link Inválido" description="Solicitação não encontrada." backButton={true}>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>O link de recuperação parece inválido ou expirado.</AlertDescription>
                </Alert>
                <Button className="w-full mt-4" asChild>
                    <a href="/forgot-password">Solicitar nova senha</a>
                </Button>
            </AuthLayoutWrapper>
        )
    }

    return (
        <AuthLayoutWrapper
            title="Redefinir Senha"
            description="Crie uma nova senha segura para sua conta."
            backButton={false}
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
                        <Label htmlFor="password" className={cn("text-xs uppercase font-semibold", error ? "text-red-500" : "text-muted-foreground")}>Nova Senha</Label>
                        <div className="relative group">
                            <div className={cn("absolute left-3 top-2.5", error ? "text-red-500" : "text-muted-foreground group-focus-within:text-primary")}><Lock className="h-5 w-5" /></div>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                className={cn("pl-10", error && "border-red-500 bg-red-50")}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className={cn("text-xs uppercase font-semibold", error ? "text-red-500" : "text-muted-foreground")}>Confirmar Senha</Label>
                        <div className="relative group">
                            <div className={cn("absolute left-3 top-2.5", error ? "text-red-500" : "text-muted-foreground group-focus-within:text-primary")}><CheckCircle2 className="h-5 w-5" /></div>
                            <Input
                                id="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading}
                                className={cn("pl-10", error && "border-red-500 bg-red-50")}
                            />
                        </div>
                    </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-11">
                    {loading ? <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</div> : "Alterar Senha"}
                </Button>
            </form>
        </AuthLayoutWrapper>
    )
}