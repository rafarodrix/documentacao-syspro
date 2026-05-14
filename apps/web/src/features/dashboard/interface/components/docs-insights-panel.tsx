'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Clock3, History, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dosc-syspro/ui';
import { trpc } from '@/lib/api/trpc-client';
import { DOCS_STORAGE_KEYS, readStorage, type RecentDocItem } from '@/lib/docs-storage';
import { formatDateMedium, formatDateTime } from '@/lib/docs-utils';
import type { DocsPopularItem } from '@dosc-syspro/contracts/docs';

type LatestDocItem = {
  href: string;
  title: string;
  lastUpdated?: string;
};

type DocsInsightsPanelProps = {
  latestUpdates: LatestDocItem[];
};

export function DocsInsightsPanel({ latestUpdates }: DocsInsightsPanelProps) {
  const [recentItems, setRecentItems] = useState<RecentDocItem[]>([]);
  const [audiencePopular, setAudiencePopular] = useState<DocsPopularItem[]>([]);
  const [globalPopular, setGlobalPopular] = useState<DocsPopularItem[]>([]);
  const [lastRead, setLastRead] = useState<RecentDocItem | null>(null);

  useEffect(() => {
    setRecentItems(readStorage<RecentDocItem[]>(DOCS_STORAGE_KEYS.recent, []));
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await trpc.docs.getViews.query();
        setAudiencePopular(Array.isArray(data.audiencePopular) ? data.audiencePopular : []);
        setGlobalPopular(Array.isArray(data.globalPopular) ? data.globalPopular : []);
        setLastRead(data.lastRead ? {
          href: data.lastRead.href,
          title: data.lastRead.title,
          visitedAt: data.lastRead.visitedAt,
        } : null);
      } catch {
        // no-op
      }
    };

    void run();
  }, []);

  const recent = useMemo(() => recentItems.slice(0, 5), [recentItems]);
  const popular = useMemo(() => (audiencePopular.length > 0 ? audiencePopular : globalPopular).slice(0, 5), [audiencePopular, globalPopular]);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr]">
      <Card className="border-border/50 bg-card/70">
        <CardHeader className="space-y-1 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <CardTitle className="text-base font-semibold text-foreground">Documentação operacional</CardTitle>
          </div>
          <CardDescription>
            Continuidade de leitura e atalhos para os manuais mais relevantes da equipe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-background/60 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Última leitura</p>
            {lastRead ? (
              <Link href={lastRead.href} className="mt-2 block rounded-lg px-2 py-2 no-underline transition-colors hover:bg-accent/50">
                <p className="text-sm font-semibold text-foreground">{lastRead.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(lastRead.visitedAt)}</p>
              </Link>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Ainda não há leitura registrada para esta sessão.</p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <History className="h-4 w-4 text-muted-foreground" />
              Últimos acessados
            </div>
            <div className="space-y-1">
              {recent.length > 0 ? recent.map((item) => (
                <Link key={`${item.href}-${item.visitedAt}`} href={item.href} className="block rounded-lg px-2 py-2 no-underline transition-colors hover:bg-accent/50">
                  <p className="text-sm text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(item.visitedAt)}</p>
                </Link>
              )) : <p className="text-sm text-muted-foreground">Sem histórico local recente.</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/70">
        <CardHeader className="space-y-1 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <CardTitle className="text-base font-semibold text-foreground">Mais acessados</CardTitle>
          </div>
          <CardDescription>
            Conteúdos mais buscados pela audiência atual da documentação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {popular.length > 0 ? popular.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-start justify-between gap-3 rounded-lg px-2 py-2 no-underline transition-colors hover:bg-accent/50">
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(item.lastViewed)}</p>
              </div>
              <span className="shrink-0 rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {item.count}x
              </span>
            </Link>
          )) : <p className="text-sm text-muted-foreground">Sem estatísticas de acesso agregadas ainda.</p>}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/70">
        <CardHeader className="space-y-1 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            <CardTitle className="text-base font-semibold text-foreground">Últimas atualizações</CardTitle>
          </div>
          <CardDescription>
            Manuais novos ou revisados recentemente na base de conhecimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {latestUpdates.length > 0 ? latestUpdates.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-lg px-2 py-2 no-underline transition-colors hover:bg-accent/50">
              <p className="text-sm text-foreground">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatDateMedium(item.lastUpdated) ?? 'Data não informada'}</p>
            </Link>
          )) : <p className="text-sm text-muted-foreground">Sem atualizações recentes registradas.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
