import { getSqlScripts } from '@/lib/scripts';
import { ScriptClientPage } from '@/components/admin/ScriptClientPage';

export const metadata = {
  title: 'Scripts SQL',
  description: 'Coleção de scripts SQL úteis para administração e relatórios do Syspro ERP.',
};

export default function ScriptsPage() {
  const scripts = getSqlScripts();

  return (
    <main className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-zinc-800 dark:text-zinc-100">
        Scripts SQL
      </h1>

      <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-sm">
        Aqui você encontra uma coleção de scripts SQL úteis para análise e manutenção do sistema.
      </p>

      {scripts.length === 0 ? (
        <p className="text-zinc-500 text-sm">Nenhum script encontrado.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {scripts.map((script) => (
            <ScriptClientPage key={script.id} script={script} />
          ))}
        </div>
      )}
    </main>
  );
}
