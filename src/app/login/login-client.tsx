'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, ShieldCheck, Zap, Terminal } from 'lucide-react';
import { toast } from "sonner";

export function LoginClientPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/docs';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await authClient.signIn.email({
                email,
                password,
                callbackURL: callbackUrl
            }, {
                onSuccess: () => {
                    toast.success("Bem-vindo de volta!");
                    router.push(callbackUrl);
                },
                onError: (ctx) => {
                    toast.error(ctx.error.message || "E-mail ou senha incorretos.");
                    setIsLoading(false);
                }
            });
        } catch (err) {
            console.error(err);
            toast.error("Erro de conexão. Tente novamente.");
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen grid lg:grid-cols-2">

            {/* --- COLUNA 1: Formulário (Esquerda) --- */}
            <div className="flex items-center justify-center py-12 px-4 sm:px-8 relative bg-background">

                {/* Botão Voltar Flutuante */}
                <Link
                    href="/"
                    className="absolute left-4 top-4 md:left-8 md:top-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
                >
                    <div className="p-2 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    </div>
                    Voltar para Home
                </Link>

                <div className="mx-auto w-full max-w-[400px] space-y-8">

                    {/* Cabeçalho do Form */}
                    <div className="flex flex-col space-y-2 text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Terminal className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h1>
                        <p className="text-sm text-muted-foreground">
                            Acesse o Portal Trilink para gerenciar sua operação.
                        </p>
                    </div>

                    {/* Formulário */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail Corporativo</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="nome@empresa.com.br"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                className="h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Senha</Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs font-medium text-primary hover:underline underline-offset-2"
                                >
                                    Esqueceu a senha?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                className="h-11"
                            />
                        </div>

                        <Button type="submit" className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Autenticando...
                                </>
                            ) : (
                                "Acessar Portal"
                            )}
                        </Button>
                    </form>

                    {/* Rodapé do Form */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Precisa de ajuda?
                            </span>
                        </div>
                    </div>

                    <div className="text-center text-sm">
                        Não tem credenciais de acesso?{" "}
                        <Link href="https://wa.me/5534997713731?text=Gostaria%20de%20falar%20com%20o%20Suporte" className="font-medium text-primary hover:underline underline-offset-4">
                            Fale com o suporte &rarr;
                        </Link>
                    </div>
                </div>
            </div>

            {/* --- COLUNA 2: Branding (Direita) --- */}
            <div className="hidden lg:flex relative flex-col justify-between p-12 text-white overflow-hidden bg-zinc-900">

                {/* Background Dinâmico */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-zinc-900 to-zinc-950"></div>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
                </div>

                {/* Logo da Empresa */}
                <div className="relative z-10 flex items-center gap-2 text-lg font-medium">
                    <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">
                        <Terminal className="h-5 w-5" />
                    </div>
                    Trilink Software
                </div>

                {/* Conteúdo Central */}
                <div className="relative z-10 max-w-md">
                    <h2 className="text-3xl font-bold mb-6 leading-tight">
                        A inteligência que o seu <span className="text-primary">Syspro ERP</span> precisava.
                    </h2>
                    <div className="space-y-4 text-zinc-300">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                            <p className="text-sm">Acesso seguro e criptografado à documentação confidencial.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <Zap className="h-5 w-5 text-primary mt-0.5" />
                            <p className="text-sm">Ferramentas de alta performance para sua equipe fiscal.</p>
                        </div>
                    </div>
                </div>

                {/* Rodapé da Coluna */}
                <div className="relative z-10 flex items-center justify-between text-sm text-zinc-400">
                    <p>© {new Date().getFullYear()} Trilink Software</p>
                    <div className="flex gap-4">
                        <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
                        <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
                    </div>
                </div>
            </div>

        </div>
    );
}