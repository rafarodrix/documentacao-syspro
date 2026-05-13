'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { DocsSurface } from '@/components/docs/docs-surface';
import { ToggleGroup, ToggleGroupItem } from "@dosc-syspro/ui";

type Vote = 'yes' | 'no';
type FeedbackReason = 'desatualizado' | 'incompleto' | 'dificil' | 'nao-encontrei';

const NO_REASONS: Array<{ value: FeedbackReason; label: string }> = [
  { value: 'desatualizado', label: 'Desatualizado' },
  { value: 'incompleto', label: 'Incompleto' },
  { value: 'dificil', label: 'Difícil de entender' },
  { value: 'nao-encontrei', label: 'Não encontrei o que precisava' },
];

type StoredFeedback = { vote: Vote; reason?: FeedbackReason };

function readFeedback(storageKey: string): StoredFeedback | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFeedback;
    if (parsed.vote === 'yes' || parsed.vote === 'no') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function DocsPageFeedback({
  slug,
  title,
  variant = 'card',
}: {
  slug: string;
  title: string;
  variant?: 'card' | 'inline';
}) {
  const storageKey = useMemo(() => `docs:feedback:${slug}`, [slug]);

  const [vote, setVote] = useState<Vote | null>(() => readFeedback(storageKey)?.vote ?? null);
  const [reason, setReason] = useState<FeedbackReason | null>(
    () => readFeedback(storageKey)?.reason ?? null,
  );
  const [sending, setSending] = useState(false);
  const [awaitingReason, setAwaitingReason] = useState(false);

  async function submit(nextVote: Vote, nextReason?: FeedbackReason) {
    if (sending) return;
    setSending(true);
    try {
      const response = await fetch('/api/docs/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug,
          title,
          helpful: nextVote === 'yes',
          reason: nextReason ?? null,
          votedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) {
        throw new Error('docs_feedback_request_failed');
      }
      localStorage.setItem(storageKey, JSON.stringify({ vote: nextVote, reason: nextReason ?? null }));
      setVote(nextVote);
      setReason(nextReason ?? null);
      setAwaitingReason(false);
    } finally {
      setSending(false);
    }
  }

  const inline = variant === 'inline';

  return (
    <DocsSurface
      className={cn('border-border/35 bg-background/25 p-3 md:p-3.5', inline ? 'mt-4' : 'mt-10')}
      hoverable={!inline}
    >
      <p
        className={cn(
          inline
            ? 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'
            : 'text-sm font-medium',
        )}
      >
        Esse conteúdo ajudou?
      </p>

      {/* Botões sim/não */}
      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => submit('yes')}
          disabled={sending}
          className={cn(
            'rounded-md border px-2.5 py-1.5 transition-all',
            inline ? 'text-xs' : 'text-sm',
            vote === 'yes'
              ? 'border-primary/35 bg-primary/10 text-foreground'
              : 'border-border/45 bg-background/60 hover:border-primary/20 hover:bg-accent/35',
          )}
        >
          Sim
        </button>
        <button
          type="button"
          onClick={() => setAwaitingReason(true)}
          disabled={sending}
          className={cn(
            'rounded-md border px-2.5 py-1.5 transition-all',
            inline ? 'text-xs' : 'text-sm',
            vote === 'no'
              ? 'border-red-500/35 bg-red-500/10 text-red-500'
              : 'border-border/45 bg-background/60 hover:border-primary/20 hover:bg-accent/35',
          )}
        >
          Não
        </button>
      </div>

      {/* Motivos — ToggleGroup do shadcn (estado controlado, acessível) */}
      {(awaitingReason || vote === 'no') ? (
        <div className="mt-2.5">
          <p className="mb-2 text-xs text-muted-foreground/85">Qual foi o principal motivo?</p>
          <ToggleGroup
            type="single"
            value={reason ?? ''}
            onValueChange={(value) => {
              if (value) void submit('no', value as FeedbackReason);
            }}
            disabled={sending}
            className="flex flex-wrap justify-start gap-2"
          >
            {NO_REASONS.map((item) => (
              <ToggleGroupItem
                key={item.value}
                value={item.value}
                size="sm"
                className="rounded-md border border-border/45 bg-background/60 text-xs data-[state=on]:border-primary/35 data-[state=on]:bg-primary/10"
              >
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}

      {vote ? (
        <p className="mt-2 text-xs text-muted-foreground/85">
          Obrigado pelo feedback. Vamos usar isso para priorizar melhorias.
        </p>
      ) : null}
    </DocsSurface>
  );
}
