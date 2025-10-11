'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { LogIn, AlertTriangle, Loader2 } from 'lucide-react';

// Componente para exibir erros de forma elegante
function ErrorCard({ error }: { error: string }) {
    const errorMessages: Record<string, { title: string, message: string }> = {
        'OAuthCallback': {
            title: 'Erro na Autenticação',
            message: 'Não foi possível conectar com o servidor do Zammad. Verifique se suas credenciais (Client Secret) estão corretas e tente novamente.'
        },
        'default': {
            title: 'Erro Desconhecido',
            message: 'Ocorreu um erro durante o processo de login. Por favor, tente novamente mais tarde.'
        }
    };
    const details = errorMessages[error] || errorMessages.default;

    return (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md text-left flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
                <p className="font-bold">{details.title}</p>
                <p className="text-sm mt-1">{details.message}</p>
            </div>
        </div>
    );
}

// Componente principal do formulário, que é um Client Component
function LoginForm() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    return (
        <div className="max-w-sm w-full space-y-8">
            <div className="text-center">
                {/* Você pode adicionar seu logo aqui */}
                {/* <img src="/logo.svg" alt="Syspro ERP" className="mx-auto h-12 w-auto" /> */}
                <h1 className="mt-6 text-3xl font-bold">Acessar Portal do Cliente</h1>
                <p className="mt-2 text-muted-foreground">Use sua conta do suporte para continuar.</p>
            </div>

            {error && <ErrorCard error={error} />}

            <button
                onClick={() => signIn('zammad')}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-3 rounded-md hover:bg-primary/90 transition-colors shadow-lg hover:shadow-primary/30"
            >
                <LogIn className="w-5 h-5" />
                Entrar com a conta Syspro
            </button>
        </div>
    );
}

// Componente de Fallback para o Suspense
function LoadingFallback() {
    return <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />;
}

// A página em si, que é um Server Component que usa Suspense
export default function LoginPage() {
    return (
        <main className="flex-1 flex flex-col items-center justify-center p-6 bg-secondary/30">
            <Suspense fallback={<LoadingFallback />}>
                <LoginForm />
            </Suspense>
        </main>
    );
}