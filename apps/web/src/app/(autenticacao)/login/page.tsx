import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center items-center h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}