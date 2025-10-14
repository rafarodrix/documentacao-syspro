// components/admin/AdminDashboardClient.tsx

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import type { SqlScript } from '@/lib/scripts';

// --- Componente para o card de preview do script (local a este arquivo) ---
// Ele exibe apenas as informações essenciais para o dashboard.
function ScriptCard({ script }: { script: SqlScript }) {
  return (
    <div className="p-3 border rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <h4 className="font-semibold text-sm">{script.title}</h4>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <span className="bg-background px-2 py-0.5 rounded-full border">{script.category}</span>
        <span>- por {script.author}</span>
      </div>
    </div>
  );
}


// --- Componente principal da página do dashboard ---
export function AdminDashboardClient({ initialScripts }: { initialScripts: SqlScript[] }) {
  // --- Estados de busca e filtro ---
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Todas');

  // --- Extrai as categorias únicas ---
  const categories = useMemo(() => {
    const cats = initialScripts.map((s) => s.category);
    return ['Todas', ...new Set(cats)];
  }, [initialScripts]);

  // --- Filtragem dinâmica ---
  const filteredScripts = useMemo(() => {
    return initialScripts.filter((script) => {
      const matchesCategory = category === 'Todas' || script.category === category;
      const matchesSearch = script.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [initialScripts, searchTerm, category]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold">Painel Interno</h1>
      <p className="text-muted-foreground">
        Recursos e ferramentas para a equipe de desenvolvimento e suporte.
      </p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Consulta de Códigos */}
        <div className="p-6 border rounded-xl bg-card shadow-sm">
          <h2 className="font-semibold text-lg">Consulta de Códigos</h2>
          <p className="text-sm text-muted-foreground">
            Busque por códigos de erro ou funcionalidades.
          </p>
        </div>

        {/* Card 2: Scripts SQL */}
        <div className="p-6 border rounded-xl bg-card shadow-sm">
          <h2 className="font-semibold text-lg mb-2">Scripts de Banco de Dados</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Repositório de resoluções e scripts úteis.
          </p>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar script..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border bg-background px-2 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {filteredScripts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum script encontrado.</p>
          ) : (
            <div className="space-y-2">
              {filteredScripts.slice(0, 3).map((script) => (
                <ScriptCard key={script.id} script={script} />
              ))}
            </div>
          )}

          <div className="mt-4 text-right">
            <Link href="/admin/scripts" className="text-sm text-primary hover:underline">
              Ver todos os scripts →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}