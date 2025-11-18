"use client";

import { useState } from 'react';
import type { SqlScript } from '@/src/lib/scripts';
import { Copy, Check, ChevronDown, Search } from 'lucide-react';
import { CodeBlock } from 'fumadocs-ui/components/codeblock';


export function ScriptCard({ script }: { script: SqlScript }) {
  return (
    <details className="border rounded-lg bg-card text-card-foreground shadow-sm group">
      <summary className="p-4 flex justify-between items-center cursor-pointer list-none">
        <div>
          <h3 className="font-semibold text-lg">{script.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{script.description}</p>
        </div>
        <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>
      
      <div className="px-4 pb-4">
        <CodeBlock
          lang="sql"
          title="Script SQL" 
        >
          {script.sql}
        </CodeBlock>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
          <span className="bg-muted px-2 py-0.5 rounded-full">{script.category}</span>
          <span>Autor: {script.author}</span>
          <span>Criado em: {new Date(script.createdAt).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </details>
  );
}

/**
 * Componente principal da página que exibe e filtra os scripts.
 */
export function ScriptClientPage({ scripts }: { scripts: SqlScript[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredScripts = scripts.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* NOVO: Input de busca com ícone para uma UI melhor */}
      <div className="relative w-full max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por título, descrição ou categoria..."
          className="w-full p-2 pl-10 border rounded-md bg-card"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="space-y-4">
        {filteredScripts.length > 0 ? (
          filteredScripts.map(script => <ScriptCard key={script.id} script={script} />)
        ) : (
          <p className="text-muted-foreground text-center py-8">Nenhum script encontrado para "{searchTerm}".</p>
        )}
      </div>
    </div>
  );
}