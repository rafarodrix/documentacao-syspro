'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Terminal, ArrowLeft } from 'lucide-react'; // Ícones
import { toast } from "sonner"; // Assumindo que você usa sonner para feedback

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
                callbackURL: callbackUrl // Passa o callback para o Better Auth
            }, {
                onSuccess: () => {
                    toast.success("Login realizado com sucesso!");
                    router.push(callbackUrl);
                },
                onError: (ctx) => {
                    toast.error(ctx.error.message || "Credenciais inválidas.");
                    setIsLoading(false); // Para o loading apenas no erro
                }
            });
        } catch (err) {
            console.error(err);
            toast.error("Ocorreu um erro inesperado.");
            setIsLoading(false);
        }
    };

    return (
        // Container Principal: Grid de 2 Colunas em telas grandes (lg)
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
            
            {/* --- COLUNA DA ESQUERDA (Formulário) --- */}
            <div className="flex items-center justify-center py-12">
                <div className="mx-auto w-full max-w-[350px] space-y-6">
                    
                    {/* Link de Voltar */}
                    <Link 
                        href="/" 
                        className="absolute left-4 top-4 md:left-8 md:top-8 inline-flex items-center justify-center rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Link>

                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-3xl font-bold tracking-tight">Bem-vindo de volta</h1>
                        <p className="text-sm text-muted-foreground">
                            Entre com seu e-mail corporativo para acessar o portal.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="nome@empresa.com.br"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Senha</Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-primary hover:underline"
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
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Acessar Portal
                        </Button>
                    </form>

                    <div className="text-center text-sm text-muted-foreground">
                        Não tem acesso?{" "}
                        <Link href="/suporte" className="underline underline-offset-4 hover:text-primary">
                            Fale com o suporte
                        </Link>
                    </div>
                </div>
            </div>

            {/* --- COLUNA DA DIREITA (Branding / Visual) --- */}
            {/* Oculta em mobile, visível em telas grandes (lg:block) */}
            <div className="hidden bg-muted lg:block relative">
                {/* Imagem de Fundo ou Padrão */}
                <div className="absolute inset-0 bg-zinc-900" />
                
                {/* Conteúdo Sobreposto */}
                <div className="relative z-20 flex h-full flex-col justify-between p-10 text-white">
                    {/* Logo */}
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <Terminal className="h-6 w-6" />
                        Trilink Software
                    </div>

                    {/* Depoimento ou Mensagem de Marketing */}
                    <div className="space-y-2">
                        <blockquote className="space-y-2">
                            <p className="text-lg">
                                &ldquo;A centralização da documentação e das ferramentas fiscais reduziu nosso tempo de suporte em 40%. Essencial para a operação.&rdquo;
                            </p>
                            <footer className="text-sm font-medium text-zinc-400">
                                Equipe de Operações Syspro
                            </footer>
                        </blockquote>
                    </div>
                </div>
            </div>
        </div>
    );
}