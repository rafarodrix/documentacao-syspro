'use client';

import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { LogIn } from 'lucide-react';

// Um componente simples para exibir mensagens de erro
function ErrorCard({ error }: { error: string }) {
    const errorMessages: Record<string, { title: string, message: string }> = {
        'OAuthCallback': {
            title: 'Erro de Callback',
            message: 'Houve um problema ao se comunicar com o servidor de autenticação após o redirecionamento. Verifique os logs do servidor para mais detalhes.'
        },
        'default': {
            title: 'Erro de Autenticação',
            message: 'Ocorreu um erro durante o processo de login. Por favor, tente novamente.'
        }
    };
    const details = errorMessages[error] || errorMessages.default;

    return (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md text-left">
            <p className="font-bold">{details.title}</p>
            <p className="text-sm mt-1">{details.message}</p>
        </div>
    )
}

export default function LoginPage() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    return (
        <main className="flex-1 flex flex-col items-center justify-center p-6">
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
        </main>
    );
}