"use client";

import { useState } from 'react';
import type { SqlScript } from '@/lib/scripts';
import { Copy, Check } from 'lucide-react';
import { CodeBlock } from 'fumadocs-ui/components/codeblock';

// Este componente precisa ser exportado para ser usado em outros arquivos
export function ScriptCard({ script }: { script: SqlScript }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(script.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // A função PRECISA ter este 'return' para ser um componente React válido
  return (
    <div className="border rounded-lg bg-card text-card-foreground shadow-sm">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">{script.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{script.description}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
          <span className="bg-muted px-2 py-0.5 rounded-full">{script.category}</span>
          <span>Autor: {script.author}</span>
          <span>Criado em: {new Date(script.createdAt).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
      <div className="relative bg-black/80 rounded-b-lg">
        <div className="p-4">
          <CodeBlock lang="sql">{script.sql}</CodeBlock>
        </div>
        <button onClick={handleCopy} title="Copiar script" className="absolute top-3 right-3 p-1.5 bg-white/10 rounded-md text-white hover:bg-white/20 transition-colors">
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// O componente principal da página de scripts
export function ScriptClientPage({ scripts }: { scripts: SqlScript[] }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredScripts = scripts.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <input
        type="text"
        placeholder="Buscar por título, descrição ou categoria..."
        className="w-full max-w-lg p-2 border rounded-md bg-card"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      
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