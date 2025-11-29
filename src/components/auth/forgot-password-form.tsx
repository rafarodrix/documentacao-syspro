"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"
import { Loader2, Mail, AlertCircle, CheckCircle2 } from "lucide-react"
import { AuthLayoutWrapper } from "@/components/auth/auth-layout-wrapper"
import { cn } from "@/lib/utils"
import { authGateway } from "@/core/infrastructure/gateways/auth-gateway"

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

        const result = await authGateway.requestPasswordReset(email)

        if (result.success) {
            setSuccess(true)
        } else {
            setError(result.error || "Erro ao solicitar recuperação.")
        }

        setLoading(false)
    }

    return (
        <AuthLayoutWrapper
            title="Recuperar Senha"
            description="Digite seu e-mail para receber as instruções de redefinição."
            backButton={true}
        >
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
                    <Button variant="outline" className="w-full h-11 border-dashed hover:border-solid" onClick={() => setSuccess(false)}>
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
                        <Label htmlFor="email" className={cn("text-xs uppercase font-semibold", error ? "text-red-500" : "text-muted-foreground")}>E-mail Corporativo</Label>
                        <div className="relative group">
                            <div className={cn("absolute left-3 top-2.5", error ? "text-red-500" : "text-muted-foreground group-focus-within:text-primary")}><Mail className="h-5 w-5" /></div>
                            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} className={cn("pl-10 h-11 bg-muted/30 border-muted-foreground/20", error && "border-red-500 bg-red-500/5")} />
                        </div>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-11">
                        {loading ? <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</div> : "Enviar Link de Recuperação"}
                    </Button>
                </form>
            )}

            {!success && (
                <div className="relative text-center pt-4">
                    <Link href="/login" className="text-sm font-medium text-primary hover:underline">Lembrei minha senha</Link>
                </div>
            )}
        </AuthLayoutWrapper>
    )
}