'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { LogIn, LogOut, Loader2, User } from 'lucide-react';

export function AuthButtons() {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
    }

    if (session) {
        return (
            <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground hidden md:inline-flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {session.user?.name?.split(' ')[0]}
                </span>
                <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    title="Sair"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => signIn('zammad', { callbackUrl: '/portal' })}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
            <LogIn className="w-5 h-5" />
            <span className="font-semibold">Acessar Portal</span>
        </button>
    );
}