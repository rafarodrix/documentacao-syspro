'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Mail, Lock, AlertCircle } from 'lucide-react';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { AuthLayoutWrapper } from "@/components/auth/auth-layout-wrapper";

export default function LoginClientPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/client';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await authClient.signIn.email({
                email,
                password,
                callbackURL: callbackUrl
            }, {
                onSuccess: () => {
                    toast.success("Login realizado com sucesso!");
                    router.push(callbackUrl);
                },
                onError: (ctx) => {
                    const msg = ctx.error.message || "";
                    if (msg.includes("Invalid email or password") || msg.includes("not found")) {
                        setError("Credenciais inválidas. Verifique seu e-mail e senha.");
                    } else {
                        setError("Ocorreu um erro ao tentar entrar. Tente novamente.");
                    }
                    setIsLoading(false);
                }
            });
        } catch (err) {
            setError("Erro de conexão com o servidor.");
            setIsLoading(false);
        }
    };

    return (
        <AuthLayoutWrapper
            title="Acesso ao Portal"
            description="Entre com suas credenciais para acessar o portal."
        >
            {/* 1. Botão Voltar */}
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

            {/* 2. Alerta de Erro */}
            {error && (
                <Alert variant="destructive" className="animate-in fade-in zoom-in-95 duration-300 border-red-500/50 bg-red-500/10 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-semibold">Falha no login</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* 3. Formulário */}
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">E-mail Corporativo</Label>
                        <div className="relative group">
                            <div className="absolute left-3 top-2.5 text-muted-foreground group-focus-within:text-primary transition-colors">
                                <Mail className="h-5 w-5" />
                            </div>
                            <Input
                                id="email"
                                type="email"
                                placeholder="nome@empresa.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                className={cn(
                                    "pl-10 h-11 bg-muted/30 border-muted-foreground/20 focus:border-primary/50 transition-all",
                                    error && "border-red-500 focus:ring-red-500/20"
                                )}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Senha</Label>
                            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                                Esqueceu?
                            </Link>
                        </div>
                        <div className="relative group">
                            <div className="absolute left-3 top-2.5 text-muted-foreground group-focus-within:text-primary transition-colors">
                                <Lock className="h-5 w-5" />
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                className="pl-10 h-11 bg-muted/30 border-muted-foreground/20 focus:border-primary/50 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <Button type="submit" className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all" disabled={isLoading}>
                    {isLoading ? (
                        <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verificando...</div>
                    ) : "Entrar no Sistema"}
                </Button>
            </form>

            {/* 4. Rodapé do Formulário */}
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
                        href="https://wa.me/5534997713731?text=Olá,%20gostaria%20de%20solicitar%20acesso%20ao%20Trilink"
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