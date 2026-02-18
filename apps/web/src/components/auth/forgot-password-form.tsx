"use client"

import { useForgotPassword } from "@/hooks/use-forgot-password" // Importa o Hook
import { AuthLayoutWrapper } from "@/components/auth/auth-layout-wrapper"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"
import { Loader2, Mail, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function ForgotPasswordForm() {
    // 1. Uma linha para trazer toda a lógica
    const { formState, setEmail, setSuccess, submitRequest } = useForgotPassword()
    const { email, loading, error, success } = formState

    // 2. Handler de UI simples
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        submitRequest()
    }

    return (
        <AuthLayoutWrapper
            title="Recuperar Senha"
            description="Digite seu e-mail para receber as instruções."
            backButton={true}
        >
            {success ? (
                <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500 py-4">
                    <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center border-4 border-green-50">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold">Verifique seu e-mail</h3>
                        <p className="text-sm text-muted-foreground">Enviamos um link para <strong>{email}</strong>.</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setSuccess(false)}>
                        Tentar outro e-mail
                    </Button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erro</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email" className={cn("text-xs uppercase font-bold", error ? "text-red-500" : "text-muted-foreground")}>E-mail</Label>
                        <div className="relative group">
                            <div className={cn("absolute left-3 top-2.5", error ? "text-red-500" : "text-muted-foreground")}><Mail className="h-5 w-5" /></div>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                className={cn(
                                    "pl-10 h-11 transition-all duration-200 bg-muted/30 border-muted-foreground/20",
                                    error
                                        ? "border-red-500 focus-visible:ring-red-500/30 bg-red-50 text-red-900 placeholder:text-red-400"
                                        : "focus-visible:border-primary/50"
                                )}
                            />
                        </div>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Link"}
                    </Button>
                </form>
            )}
        </AuthLayoutWrapper>
    )
}