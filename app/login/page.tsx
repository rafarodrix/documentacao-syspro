import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { Loader2 } from 'lucide-react';

function LoadingFallback() {
    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Carregando...</p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <main className="flex-1 flex flex-col items-center justify-center p-6">
            <Suspense fallback={<LoadingFallback />}>
                <LoginForm />
            </Suspense>
        </main>
    );
}