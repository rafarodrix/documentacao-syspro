'use client';

import { useState, useMemo } from 'react';
import { getSqlScripts } from '@/lib/scripts';
import { ScriptClientPage } from '@/components/admin/ScriptClientPage';
import { Search } from 'lucide-react';

export default function AdminDashboardPage() {
  // --- Scripts carregados localmente ---
  const scripts = getSqlScripts();

  // --- Estados de busca e filtro ---
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Todas');

  // --- Extrai as categorias únicas ---
  const categories = useMemo(() => {
    const cats = scripts.map((s) => s.category);
    return ['Todas', ...new Set(cats)];
  }, [scripts]);

  // --- Filtragem dinâmica ---
  const filteredScripts = useMemo(() => {
    return scripts.filter((script) => {
      const matchesCategory = category === 'Todas' || script.category === category;
      const matchesSearch = script.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [scripts, searchTerm, category]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Painel Interno</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Recursos e ferramentas para a equipe de desenvolvimento e suporte.
      </p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- Card 1: Consulta de Códigos --- */}
        <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
          <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Consulta de Códigos</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Busque por códigos de erro ou funcionalidades.
          </p>
          {/* Futuramente, o componente de busca virá aqui */}
        </div>

        {/* --- Card 2: Scripts SQL --- */}
        <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
          <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 mb-2">
            Scripts de Banco de Dados
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Repositório de resoluções e scripts úteis.
          </p>

          {/* --- Barra de busca --- */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar script..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* --- Filtro por categoria --- */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* --- Lista de scripts --- */}
          {filteredScripts.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum script encontrado.</p>
          ) : (
            <div className="space-y-4">
              {filteredScripts.slice(0, 3).map((script) => (
                <ScriptClientPage key={script.id} script={script} />
              ))}
            </div>
          )}

          {/* --- Link para ver todos --- */}
          <div className="mt-4 text-right">
            <a
              href="/scripts"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver todos os scripts →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
