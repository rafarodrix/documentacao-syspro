"use client";

import React from 'react';
import Link from 'next/link';
import { useLogin } from "@/hooks/use-login"; // Hook novo
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Mail, Lock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { AuthLayoutWrapper } from "@/components/auth/auth-layout-wrapper";

export function LoginForm() {
    const {
        email, setEmail,
        password, setPassword,
        isLoading, error, submitLogin
    } = useLogin();

    // 2. Handler simples
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitLogin();
    };

    return (
        <AuthLayoutWrapper
            title="Acesso ao Portal"
            description="Entre com suas credenciais para acessar o portal."
            backButton={true}
        >
            {/* Alerta de Erro */}
            {error && (
                <Alert variant="destructive" className="animate-in fade-in zoom-in-95 duration-300 border-red-500/50 bg-red-500/10 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-semibold">Falha no login</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-4">
                    {/* CAMPO DE E-MAIL */}
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
                                type="email"
                                placeholder="nome@empresa.com"
                                required
                                value={email} // Vem do Hook
                                onChange={(e) => setEmail(e.target.value)} // Vem do Hook
                                disabled={isLoading}
                                className={cn(
                                    "pl-10 h-11 transition-all duration-200 bg-muted/30 border-muted-foreground/20",
                                    error ? "border-red-500 focus-visible:ring-red-500/30 bg-red-500/5 placeholder:text-red-300" : "focus-visible:border-primary/50"
                                )}
                            />
                        </div>
                    </div>

                    {/* CAMPO DE SENHA */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className={cn("text-xs uppercase font-semibold tracking-wider transition-colors", error ? "text-red-500" : "text-muted-foreground")}>
                                Senha
                            </Label>

                            {/* LINK DE ESQUECEU SENHA */}
                            <Link
                                href="/forgot-password"
                                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors z-10 relative"
                            >
                                Esqueceu?
                            </Link>
                        </div>
                        <div className="relative group">
                            <div className={cn("absolute left-3 top-2.5 transition-colors duration-200", error ? "text-red-500" : "text-muted-foreground group-focus-within:text-primary")}>
                                <Lock className="h-5 w-5" />
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                value={password} // Vem do Hook
                                onChange={(e) => setPassword(e.target.value)} // Vem do Hook
                                disabled={isLoading}
                                className={cn(
                                    "pl-10 h-11 transition-all duration-200 bg-muted/30 border-muted-foreground/20",
                                    error ? "border-red-500 focus-visible:ring-red-500/30 bg-red-500/5 placeholder:text-red-300" : "focus-visible:border-primary/50"
                                )}
                            />
                        </div>
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                        "w-full h-11 text-base font-medium shadow-md transition-all",
                        "hover:shadow-lg hover:translate-y-[-1px]",
                        isLoading && "opacity-80 cursor-not-allowed hover:translate-y-0"
                    )}
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verificando...</div>
                    ) : "Entrar no Sistema"}
                </Button>
            </form>

            {/* Rodapé */}
            <div className="space-y-4">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Precisa de acesso?</span>
                    </div>
                </div>
                <div className="text-center">
                    <Link
                        href="https://wa.me/5534997713731?text=Olá"
                        target="_blank"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group"
                    >
                        Fale com o suporte
                        <ArrowLeft className="h-3 w-3 rotate-180 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </AuthLayoutWrapper>
    );
}