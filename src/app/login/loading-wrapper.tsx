'use client';

import { Suspense } from 'react';
import LoginPage from './page';

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LoginPage />
    </Suspense>
  );
}