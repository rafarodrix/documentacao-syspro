// app/admin/scripts/page.tsx

import { getSqlScripts } from '@/lib/scripts';
import { ScriptClientPage } from '@/src/app/admin/scripts/components/ScriptClientPage';

// Seus metadados estão perfeitos.
export const metadata = {
  title: 'Scripts SQL',
  description: 'Coleção de scripts SQL úteis para administração e relatórios do Syspro ERP.',
};

export default function ScriptsPage() {
  // 1. Buscamos os dados no servidor, como você já fez.
  const scripts = getSqlScripts();

  return (
    // Seu layout principal está ótimo.
    <main className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-2">
        Scripts SQL
      </h1>

      <p className="text-zinc-600 dark:text-zinc-400 mb-8">
        Aqui você encontra uma coleção de scripts SQL úteis para análise e manutenção do sistema. Use com responsabilidade.
      </p>

      {/* 2. Passamos o array completo de scripts para o ScriptClientPage.
        Ele cuidará da busca, da listagem e da mensagem de "nenhum script encontrado".
      */}
      <ScriptClientPage scripts={scripts} />

    </main>
  );
}