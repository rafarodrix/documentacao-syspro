'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SqlScript {
  title: string;
  sql: string;
}

export function ScriptClientPage({ script }: { script: SqlScript }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Não foi possível copiar o conteúdo.');
    }
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm overflow-hidden mb-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <h3 className="font-medium text-zinc-800 dark:text-zinc-100 text-sm">
          {script.title}
        </h3>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
        >
          {copied ? (
            <>
              <Check size={14} />
              Copiado
            </>
          ) : (
            <>
              <Copy size={14} />
              Copiar
            </>
          )}
        </button>
      </div>

      {/* Código SQL */}
      <SyntaxHighlighter
        language="sql"
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '0.85rem',
          padding: '1rem',
          background: 'transparent',
        }}
      >
        {script.sql}
      </SyntaxHighlighter>
    </div>
  );
}
