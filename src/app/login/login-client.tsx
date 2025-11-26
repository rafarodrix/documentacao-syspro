'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, ShieldCheck, Zap, Terminal, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";

export function LoginClientPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null); // Estado local para erro

    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/client'; // Alterado default para /client (Dashboard)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null); // Limpa erros anteriores

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
                    // Tratamento de erros específicos
                    const msg = ctx.error.message || "";

                    if (msg.includes("Invalid email or password") || msg.includes("not found")) {
                        setError("Credenciais inválidas. Verifique seu e-mail e senha.");
                    } else if (msg.includes("verify your email")) {
                        setError("Por favor, verifique seu e-mail antes de fazer login.");
                    } else {
                        setError("Ocorreu um erro ao tentar entrar. Tente novamente.");
                    }

                    setIsLoading(false);
                }
            });
        } catch (err) {
            console.error(err);
            setError("Erro de conexão com o servidor.");
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen grid lg:grid-cols-2">

            {/* --- COLUNA 1: Formulário (Esquerda) --- */}
            <div className="flex items-center justify-center py-12 px-4 sm:px-8 relative bg-background overflow-hidden">

                {/* Background Grids (Sutil) */}
                <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                {/* Botão Voltar */}
                <Link
                    href="/"
                    className="absolute left-4 top-4 md:left-8 md:top-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
                >
                    <div className="p-2 rounded-full bg-muted/50 border border-border/50 group-hover:border-primary/20 group-hover:bg-primary/5 transition-all">
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    </div>
                    <span className="hidden sm:inline">Voltar para Home</span>
                </Link>

                <div className="mx-auto w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                    {/* Cabeçalho */}
                    <div className="flex flex-col space-y-2 text-center">
                        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center shadow-sm">
                            <Terminal className="h-7 w-7 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Acesso Restrito</h1>
                        <p className="text-sm text-muted-foreground">
                            Entre com suas credenciais corporativas.
                        </p>
                    </div>

                    {/* Alerta de Erro (Feedback Visual Claro) */}
                    {error && (
                        <Alert variant="destructive" className="animate-in fade-in zoom-in duration-300">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Acesso Negado</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

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
                                className={cn(
                                    "h-11 bg-background/50 backdrop-blur-sm transition-all focus:ring-2 focus:ring-primary/20",
                                    error && "border-red-500 focus:ring-red-500/20" // Borda vermelha no erro
                                )}
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
                                className={cn(
                                    "h-11 bg-background/50 backdrop-blur-sm transition-all focus:ring-2 focus:ring-primary/20",
                                    error && "border-red-500 focus:ring-red-500/20"
                                )}
                            />
                        </div>

                        <Button type="submit" className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...
                                </>
                            ) : (
                                "Entrar no Portal"
                            )}
                        </Button>
                    </form>

                    {/* Rodapé do Form (Suporte) */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border/50" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Não tem acesso?
                            </span>
                        </div>
                    </div>

                    <div className="text-center text-sm p-4 rounded-lg bg-muted/30 border border-border/50">
                        <p className="text-muted-foreground mb-2">
                            Se você é um cliente e ainda não possui acesso, entre em contato com nosso suporte.
                        </p>
                        <Link
                            href="https://wa.me/5534997713731?text=Olá,%20sou%20cliente%20e%20gostaria%20de%20solicitar%20acesso%20ao%20Portal"
                            target="_blank"
                            className="inline-flex items-center font-medium text-primary hover:underline underline-offset-4 gap-1"
                        >
                            Solicitar Acesso via WhatsApp <ArrowLeft className="h-3 w-3 rotate-180" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* --- COLUNA 2: Branding (Direita) --- */}
            <div className="hidden lg:flex relative flex-col justify-between p-12 text-white overflow-hidden bg-zinc-950 border-l border-white/10">

                {/* Background Dinâmico */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-zinc-900 to-zinc-950"></div>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
                </div>

                {/* Logo da Empresa */}
                <div className="relative z-10 flex items-center gap-3 text-lg font-medium animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="h-10 w-10 rounded-xl bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-2xl">
                        <Terminal className="h-5 w-5 text-white" />
                    </div>
                    <span className="tracking-wide">Trilink Software</span>
                </div>

                {/* Conteúdo Central */}
                <div className="relative z-10 max-w-md animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
                    <h2 className="text-4xl font-bold mb-8 leading-tight tracking-tight text-white">
                        A inteligência que o seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/50">Syspro ERP</span> precisava.
                    </h2>

                    <div className="space-y-6">
                        <FeatureItem
                            icon={ShieldCheck}
                            title="Segurança de Dados"
                            description="Acesso criptografado e auditável a documentos fiscais."
                        />
                        <FeatureItem
                            icon={Zap}
                            title="Alta Performance"
                            description="Ferramentas otimizadas para o fluxo de trabalho da sua equipe."
                        />
                        <FeatureItem
                            icon={CheckCircle2}
                            title="Sempre Atualizado"
                            description="Acesse as últimas versões e notas de lançamento em tempo real."
                        />
                    </div>
                </div>

                {/* Rodapé da Coluna */}
                <div className="relative z-10 flex items-center justify-between text-sm text-zinc-500 animate-in fade-in duration-1000 delay-500">
                    <p>© {new Date().getFullYear()} Trilink Software</p>
                    <div className="flex gap-6">
                        <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
                        <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
                    </div>
                </div>
            </div>

        </div>
    );
}

function FeatureItem({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <div className="flex gap-4 items-start group">
            <div className="mt-1 h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-primary/20 group-hover:bg-primary/10 transition-all duration-300">
                <Icon className="h-4 w-4 text-zinc-400 group-hover:text-primary transition-colors" />
            </div>
            <div>
                <h3 className="font-medium text-zinc-200 text-base mb-1 group-hover:text-white transition-colors">{title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">{description}</p>
            </div>
        </div>
    )
}