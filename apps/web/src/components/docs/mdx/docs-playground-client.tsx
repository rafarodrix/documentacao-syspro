'use client';

import { useMemo, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';

function buildSrcDoc(code: string): string {
  const escaped = code.replace(/<\/script>/gi, '<\\/script>');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; padding: 12px; color: #e5e7eb; background: #09090b; }
      .error { color: #fda4af; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script>
      const container = document.getElementById('app');
      const toText = (v) => typeof v === 'string' ? v : JSON.stringify(v, null, 2);
      console.log = (...args) => {
        const el = document.createElement('pre');
        el.textContent = args.map(toText).join(' ');
        container.appendChild(el);
      };
      try {
        ${escaped}
      } catch (err) {
        const el = document.createElement('pre');
        el.className = 'error';
        el.textContent = String(err?.stack || err);
        container.appendChild(el);
      }
    </script>
  </body>
</html>`;
}

export function DocsPlaygroundClient({
  code,
  height = 240,
  title = 'Playground',
}: {
  code: string;
  height?: number;
  title?: string;
}) {
  const [editorValue, setEditorValue] = useState(code);
  const [runVersion, setRunVersion] = useState(0);

  const srcDoc = useMemo(() => buildSrcDoc(editorValue), [editorValue]);

  return (
    <section className="my-4 overflow-hidden rounded-xl border border-border/70">
      <div className="flex items-center justify-between border-b border-border/70 bg-card/50 px-3 py-2">
        <p className="text-sm font-medium">{title}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditorValue(code)}
            className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => setRunVersion((v) => v + 1)}
            className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Play className="h-3.5 w-3.5" />
            Executar
          </button>
        </div>
      </div>

      <div className="grid gap-0 border-t-0 md:grid-cols-2">
        <textarea
          value={editorValue}
          onChange={(e) => setEditorValue(e.target.value)}
          className="min-h-[220px] w-full resize-y border-r border-border/70 bg-background p-3 font-mono text-xs outline-none"
          spellCheck={false}
        />
        <iframe
          key={runVersion}
          title={`${title} result`}
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          className="w-full bg-black"
          style={{ minHeight: `${height}px` }}
        />
      </div>
    </section>
  );
}
