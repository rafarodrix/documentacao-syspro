"use client"

import { useState } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"
import { Loader2, Mail, AlertCircle, CheckCircle2 } from "lucide-react"
import { AuthLayoutWrapper } from "@/components/auth/auth-layout-wrapper"
import { cn } from "@/lib/utils"

export function ForgotPasswordForm() {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError("")
        setSuccess(false)

        try {
            const { error } = await authClient.forgetPassword({
                email,
                redirectTo: "/reset-password",
            })

            if (error) {
                setError(error.message || "Erro ao solicitar recuperação.")
            } else {
                setSuccess(true)
            }
        } catch (err) {
            setError("Ocorreu um erro inesperado. Tente novamente.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayoutWrapper
            title="Recuperar Senha"
            description="Digite seu e-mail para receber as instruções de redefinição."
            backButton={true}
        >
            {/* CENÁRIO DE SUCESSO */}
            {success ? (
                <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500 py-4">
                    <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center border-4 border-green-50">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-foreground">Verifique seu e-mail</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            Enviamos um link de recuperação para <strong className="text-foreground">{email}</strong>.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="w-full h-11 border-dashed hover:border-solid hover:bg-muted/50"
                        onClick={() => setSuccess(false)}
                    >
                        Tentar outro e-mail
                    </Button>
                </div>
            ) : (
                /* CENÁRIO DO FORMULÁRIO */
                <form onSubmit={handleSubmit} className="space-y-5">

                    {error && (
                        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-600 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="font-semibold">Erro</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label
                            htmlFor="email"
                            className={cn(
                                "text-xs uppercase font-semibold tracking-wider transition-colors",
                                error ? "text-red-500" : "text-muted-foreground"
                            )}
                        >
                            E-mail Corporativo
                        </Label>
                        <div className="relative group">
                            <div className={cn(
                                "absolute left-3 top-2.5 transition-colors duration-200",
                                error ? "text-red-500" : "text-muted-foreground group-focus-within:text-primary"
                            )}>
                                <Mail className="h-5 w-5" />
                            </div>
                            <Input
                                id="email"
                                type="email"
                                placeholder="nome@empresa.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                className={cn(
                                    "pl-10 h-11 transition-all duration-200 bg-muted/30 border-muted-foreground/20",
                                    error
                                        ? "border-red-500 focus-visible:ring-red-500/30 bg-red-500/5 placeholder:text-red-300"
                                        : "focus-visible:border-primary/50"
                                )}
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className={cn(
                            "w-full h-11 text-base font-medium shadow-md transition-all",
                            "hover:shadow-lg hover:translate-y-[-1px]",
                            loading && "opacity-80 cursor-not-allowed hover:translate-y-0"
                        )}
                    >
                        {loading ? (
                            <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</div>
                        ) : "Enviar Link de Recuperação"}
                    </Button>
                </form>
            )}

            {!success && (
                <div className="relative text-center pt-4">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                    >
                        Lembrei minha senha
                    </Link>
                </div>
            )}
        </AuthLayoutWrapper>
    )
}