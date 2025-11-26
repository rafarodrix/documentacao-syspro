import { Suspense } from 'react';
import { LoginClientPage } from './login-client';

// Componente Wrapper para lidar com a exigência do hook useSearchParams()
function LoginWrapper() {
    return <LoginClientPage />;
}

// Exporta o componente principal, envolvido em Suspense para evitar o erro de compilação.
export default function LoginPageServer() {
    return (
        <Suspense fallback={<div>Carregando tela de login...</div>}>
            <LoginWrapper />
        </Suspense>
    );
}