'use client';

import { useMemo, useState } from 'react';

type Vote = 'yes' | 'no';

export function DocsPageFeedback({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const storageKey = useMemo(() => `docs:feedback:${slug}`, [slug]);
  const [vote, setVote] = useState<Vote | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(storageKey);
    return saved === 'yes' || saved === 'no' ? saved : null;
  });
  const [sending, setSending] = useState(false);

  async function submit(nextVote: Vote) {
    if (sending) return;
    setSending(true);

    try {
      const payload = {
        slug,
        title,
        helpful: nextVote === 'yes',
        votedAt: new Date().toISOString(),
      };
      await fetch('/api/docs/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      localStorage.setItem(storageKey, nextVote);
      setVote(nextVote);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-10 rounded-lg border border-border/70 bg-card/40 p-4">
      <p className="text-sm font-medium">Esse conteúdo ajudou?</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => submit('yes')}
          disabled={sending}
          className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
            vote === 'yes'
              ? 'border-green-500/60 bg-green-500/15 text-green-600'
              : 'border-border/70 hover:bg-accent'
          }`}
        >
          Sim
        </button>
        <button
          type="button"
          onClick={() => submit('no')}
          disabled={sending}
          className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
            vote === 'no'
              ? 'border-red-500/60 bg-red-500/15 text-red-600'
              : 'border-border/70 hover:bg-accent'
          }`}
        >
          Não
        </button>
      </div>
      {vote ? (
        <p className="mt-2 text-xs text-muted-foreground">Obrigado pelo feedback. Vamos usar isso para priorizar melhorias.</p>
      ) : null}
    </div>
  );
}

