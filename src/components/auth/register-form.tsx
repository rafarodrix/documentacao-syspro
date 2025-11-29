"use client"

import { useState } from "react"
import Link from "next/link"
import { registerUser } from "@/actions/auth/register"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"
import { Loader2, ArrowLeft, Mail, Lock, User, AlertCircle } from "lucide-react"
import { AuthLayoutWrapper } from "@/components/auth/auth-layout-wrapper"
import { cn } from "@/lib/utils"

export function RegisterForm() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        setError("")

        const formData = new FormData(event.currentTarget)
        const result = await registerUser(formData)

        if (result?.error) {
            setError(result.error)
            setLoading(false)
        }
    }

    return (
        <AuthLayoutWrapper
            title="Crie sua conta"
            description="Junte-se à equipe da sua empresa no Syspro ERP."
        >
            {/* Botão Voltar */}
            <div className="absolute top-8 left-8">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <div className="p-2 rounded-full bg-muted/50 border border-border/50 group-hover:border-primary/20 group-hover:bg-primary/5 transition-all">
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    </div>
                    Voltar
                </Link>
            </div>

            {/* Alerta de Erro */}
            {error && (
                <Alert variant="destructive" className="animate-in fade-in zoom-in-95 duration-300 border-red-500/50 bg-red-500/10 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-semibold">Erro no cadastro</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-4">

                    {/* Campo Nome */}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Nome Completo</Label>
                        <div className="relative group">
                            <div className="absolute left-3 top-2.5 text-muted-foreground group-focus-within:text-primary transition-colors">
                                <User className="h-5 w-5" />
                            </div>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="Ex: Rafael Rodrigues"
                                required
                                disabled={loading}
                                className={cn(
                                    "pl-10 h-11 bg-muted/30 border-muted-foreground/20 focus:border-primary/50 transition-all",
                                    error && "border-red-500 focus:ring-red-500/20"
                                )}
                            />
                        </div>
                    </div>

                    {/* Campo Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">E-mail Corporativo</Label>
                        <div className="relative group">
                            <div className="absolute left-3 top-2.5 text-muted-foreground group-focus-within:text-primary transition-colors">
                                <Mail className="h-5 w-5" />
                            </div>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="voce@empresa.com"
                                required
                                disabled={loading}
                                className={cn(
                                    "pl-10 h-11 bg-muted/30 border-muted-foreground/20 focus:border-primary/50 transition-all",
                                    error && "border-red-500 focus:ring-red-500/20"
                                )}
                            />
                        </div>
                    </div>

                    {/* Campo Senha */}
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Senha</Label>
                        <div className="relative group">
                            <div className="absolute left-3 top-2.5 text-muted-foreground group-focus-within:text-primary transition-colors">
                                <Lock className="h-5 w-5" />
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                disabled={loading}
                                className="pl-10 h-11 bg-muted/30 border-muted-foreground/20 focus:border-primary/50 transition-all"
                            />
                        </div>
                        <p className="text-[11px] text-muted-foreground ml-1">Mínimo de 6 caracteres</p>
                    </div>
                </div>

                {/* Nota Informativa */}
                <div className="bg-primary/5 border border-primary/10 p-3 rounded-md text-xs text-primary/80">
                    <strong>Nota:</strong> Se você deseja <strong>contratar o Syspro</strong> para sua empresa, entre em contato com nosso setor comercial. Esta tela é exclusiva para colaboradores.
                </div>

                <Button type="submit" className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all" disabled={loading}>
                    {loading ? (
                        <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Criando Conta...</div>
                    ) : "Criar Minha Conta"}
                </Button>
            </form>

            {/* Rodapé */}
            <div className="space-y-4">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Já tem acesso?</span>
                    </div>
                </div>

                <div className="text-center">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                    >
                        Fazer login na sua conta
                    </Link>
                </div>
            </div>
        </AuthLayoutWrapper>
    )
}