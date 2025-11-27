import { Suspense } from 'react';
import LoginClientPage from './login-client';
import { Loader2, Terminal } from "lucide-react";

export const metadata = {
    title: "Login | Trilink Admin",
    description: "Acesso seguro ao portal administrativo.",
};

export default function LoginPage() {
    return (
        <Suspense fallback={<LoginLoadingSkeleton />}>
            <LoginClientPage />
        </Suspense>
    );
}

// --- Componente de Loading (Skeleton Visual) ---
// Mantém o layout dividido para que o usuário veja a marca (lado direito) instantaneamente
function LoginLoadingSkeleton() {
    return (
        <div className="w-full min-h-screen grid lg:grid-cols-2 animate-in fade-in duration-500">

            {/* Lado Esquerdo (Formulário) - Loader Centralizado */}
            <div className="flex flex-col items-center justify-center px-4 sm:px-12 bg-background relative">
                <div className="flex flex-col items-center space-y-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium animate-pulse">
                        Carregando acesso seguro...
                    </p>
                </div>
            </div>

            {/* Lado Direito (Branding) - Placeholder Escuro */}
            {/* Isso evita que a tela pisque de branco para preto quando o CSS carregar */}
            <div className="hidden lg:flex relative flex-col justify-between p-12 bg-[#09090b] border-l border-white/10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-900 to-zinc-950"></div>

                {/* Logo Placeholder */}
                <div className="relative z-10 flex items-center gap-3 opacity-50">
                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Terminal className="h-5 w-5 text-white/50" />
                    </div>
                    <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                </div>

                {/* Footer Placeholder */}
                <div className="relative z-10 opacity-30">
                    <div className="h-3 w-48 bg-white/10 rounded animate-pulse" />
                </div>
            </div>

        </div>
    );
}