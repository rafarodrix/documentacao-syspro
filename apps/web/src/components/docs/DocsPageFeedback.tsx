'use client';

import { useMemo, useState } from 'react';
import { DocsSurface } from '@/components/docs/DocsSurface';

type Vote = 'yes' | 'no';
type FeedbackReason = 'desatualizado' | 'incompleto' | 'dificil' | 'nao-encontrei';

const NO_REASONS: Array<{ value: FeedbackReason; label: string }> = [
  { value: 'desatualizado', label: 'Desatualizado' },
  { value: 'incompleto', label: 'Incompleto' },
  { value: 'dificil', label: 'Dificil de entender' },
  { value: 'nao-encontrei', label: 'Nao encontrei o que precisava' },
];

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
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved) as { vote?: Vote };
      if (parsed.vote === 'yes' || parsed.vote === 'no') return parsed.vote;
    } catch {
      // backward compatibility with old string storage
    }
    return saved === 'yes' || saved === 'no' ? saved : null;
  });

  const [reason, setReason] = useState<FeedbackReason | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(storageKey);
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved) as { reason?: FeedbackReason };
      return parsed.reason ?? null;
    } catch {
      return null;
    }
  });

  const [sending, setSending] = useState(false);
  const [awaitingReason, setAwaitingReason] = useState(false);

  async function submit(nextVote: Vote, nextReason?: FeedbackReason) {
    if (sending) return;
    setSending(true);

    try {
      const payload = {
        slug,
        title,
        helpful: nextVote === 'yes',
        reason: nextReason ?? null,
        votedAt: new Date().toISOString(),
      };

      await fetch('/api/docs/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      localStorage.setItem(storageKey, JSON.stringify({ vote: nextVote, reason: nextReason ?? null }));
      setVote(nextVote);
      setReason(nextReason ?? null);
      setAwaitingReason(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <DocsSurface className="mt-10 border-border/35 bg-background/25 p-3 md:p-3.5" hoverable>
      <p className="text-sm font-medium">Esse conteudo ajudou?</p>
      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => submit('yes')}
          disabled={sending}
          className={`rounded-md border px-2.5 py-1.5 text-sm transition-all ${
            vote === 'yes'
              ? 'border-primary/35 bg-primary/10 text-foreground'
              : 'border-border/45 bg-background/60 hover:border-primary/20 hover:bg-accent/35'
          }`}
        >
          Sim
        </button>
        <button
          type="button"
          onClick={() => setAwaitingReason(true)}
          disabled={sending}
          className={`rounded-md border px-2.5 py-1.5 text-sm transition-all ${
            vote === 'no'
              ? 'border-red-500/35 bg-red-500/10 text-red-500'
              : 'border-border/45 bg-background/60 hover:border-primary/20 hover:bg-accent/35'
          }`}
        >
          Nao
        </button>
      </div>

      {(awaitingReason || vote === 'no') ? (
        <div className="mt-2.5">
          <p className="text-xs text-muted-foreground/85">Qual foi o principal motivo?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {NO_REASONS.map((item) => (
              <button
                key={item.value}
                type="button"
                disabled={sending}
                onClick={() => submit('no', item.value)}
                className={`rounded-md border px-2 py-1 text-xs transition-all ${
                  reason === item.value
                    ? 'border-primary/35 bg-primary/10 text-foreground'
                    : 'border-border/45 bg-background/60 hover:border-primary/20 hover:bg-accent/35'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {vote ? (
        <p className="mt-2 text-xs text-muted-foreground/85">Obrigado pelo feedback. Vamos usar isso para priorizar melhorias.</p>
      ) : null}
    </DocsSurface>
  );
}
