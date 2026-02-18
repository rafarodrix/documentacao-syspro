"use client"

import Link from "next/link"
import { useRegister } from "@/hooks/use-register"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"
import { Loader2, Mail, Lock, User, AlertCircle } from "lucide-react"
import { AuthLayoutWrapper } from "@/components/auth/auth-layout-wrapper"
import { cn } from "@/lib/utils"

export function RegisterForm() {
    // 1. Lógica extraída
    const { loading, error, submitRegister } = useRegister()

    // 2. Handler simplificado
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        submitRegister(formData)
    }

    return (
        <AuthLayoutWrapper
            title="Crie sua conta"
            description="Junte-se à equipe da sua empresa no Syspro ERP."
        >
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
                        <Label htmlFor="name" className={cn("text-xs uppercase font-semibold tracking-wider transition-colors", error ? "text-red-500" : "text-muted-foreground")}>
                            Nome Completo
                        </Label>
                        <div className="relative group">
                            <div className={cn("absolute left-3 top-2.5 transition-colors duration-200", error ? "text-red-500" : "text-muted-foreground group-focus-within:text-primary")}>
                                <User className="h-5 w-5" />
                            </div>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="Ex: Meu Nome Completo"
                                required
                                disabled={loading}
                                className={cn(
                                    "pl-10 h-11 transition-all duration-200 bg-muted/30 border-muted-foreground/20",
                                    error ? "border-red-500 focus-visible:ring-red-500/30 bg-red-500/5" : "focus-visible:border-primary/50"
                                )}
                            />
                        </div>
                    </div>

                    {/* Campo Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email" className={cn("text-xs uppercase font-semibold tracking-wider transition-colors", error ? "text-red-500" : "text-muted-foreground")}>
                            E-mail Corporativo
                        </Label>
                        <div className="relative group">
                            <div className={cn("absolute left-3 top-2.5 transition-colors duration-200", error ? "text-red-500" : "text-muted-foreground group-focus-within:text-primary")}>
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
                                    "pl-10 h-11 transition-all duration-200 bg-muted/30 border-muted-foreground/20",
                                    error ? "border-red-500 focus-visible:ring-red-500/30 bg-red-500/5" : "focus-visible:border-primary/50"
                                )}
                            />
                        </div>
                    </div>

                    {/* Campo Senha */}
                    <div className="space-y-2">
                        <Label htmlFor="password" className={cn("text-xs uppercase font-semibold tracking-wider transition-colors", error ? "text-red-500" : "text-muted-foreground")}>
                            Senha
                        </Label>
                        <div className="relative group">
                            <div className={cn("absolute left-3 top-2.5 transition-colors duration-200", error ? "text-red-500" : "text-muted-foreground group-focus-within:text-primary")}>
                                <Lock className="h-5 w-5" />
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                disabled={loading}
                                className={cn(
                                    "pl-10 h-11 transition-all duration-200 bg-muted/30 border-muted-foreground/20",
                                    error ? "border-red-500 focus-visible:ring-red-500/30 bg-red-500/5" : "focus-visible:border-primary/50"
                                )}
                            />
                        </div>
                        <p className="text-[11px] text-muted-foreground ml-1">Mínimo de 6 caracteres</p>
                    </div>
                </div>

                {/* Nota Informativa */}
                <div className="bg-primary/5 border border-primary/10 p-3 rounded-md text-xs text-primary/80">
                    <strong>Nota:</strong> Se você deseja <strong>contratar o Syspro</strong> para sua empresa, entre em contato com nosso setor comercial.
                </div>

                <Button
                    type="submit"
                    className={cn(
                        "w-full h-11 text-base font-medium shadow-md transition-all hover:shadow-lg hover:translate-y-[-1px]",
                        loading && "opacity-80 cursor-not-allowed hover:translate-y-0"
                    )}
                    disabled={loading}
                >
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