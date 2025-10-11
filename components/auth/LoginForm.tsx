// Componente de formulário de login com tratamento de erros

'use client'; 

import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { LogIn, AlertTriangle } from 'lucide-react';

function ErrorCard({ error }: { error: string }) {
    const errorMessages: Record<string, { title: string, message: string }> = {
        'OAuthCallback': {
            title: 'Erro na Autenticação',
            message: 'Não foi possível completar o login com o Zammad. Verifique se o Client Secret está correto nas suas variáveis de ambiente e tente novamente.'
        },
        'default': {
            title: 'Erro Desconhecido',
            message: 'Ocorreu um erro durante o processo de login. Por favor, tente novamente.'
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
    )
}

export function LoginForm() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    return (
        <div className="max-w-sm w-full space-y-6 text-center">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Acessar Portal</h1>
                <p className="text-muted-foreground">Faça login com sua conta Zammad para continuar.</p>
            </div>

            {/* Exibe o card de erro se houver um na URL */}
            {error && <ErrorCard error={error} />}

            <button
                onClick={() => signIn('zammad')}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-md hover:bg-primary/90 transition-colors shadow-md"
            >
                <LogIn className="w-5 h-5" />
                Entrar com Zammad
            </button>
        </div>
    );
}