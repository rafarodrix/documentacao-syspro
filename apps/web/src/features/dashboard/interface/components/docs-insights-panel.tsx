'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock3, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dosc-syspro/ui';
import { trpc } from '@/lib/api/trpc-client';
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
  const [audiencePopular, setAudiencePopular] = useState<DocsPopularItem[]>([]);
  const [globalPopular, setGlobalPopular] = useState<DocsPopularItem[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await trpc.docs.getViews.query();
        setAudiencePopular(Array.isArray(data.audiencePopular) ? data.audiencePopular : []);
        setGlobalPopular(Array.isArray(data.globalPopular) ? data.globalPopular : []);
      } catch {
        // no-op
      }
    };

    void run();
  }, []);

  const popular = useMemo(
    () => (audiencePopular.length > 0 ? audiencePopular : globalPopular).slice(0, 5),
    [audiencePopular, globalPopular],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="border-border/50 bg-card/70">
        <CardHeader className="space-y-1 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <CardTitle className="text-base font-semibold text-foreground">Mais acessados da documentacao</CardTitle>
          </div>
          <CardDescription>
            Paginas e manuais mais consultados na base de documentacao.
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
          )) : <p className="text-sm text-muted-foreground">Sem estatisticas de acesso agregadas ainda.</p>}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/70">
        <CardHeader className="space-y-1 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            <CardTitle className="text-base font-semibold text-foreground">Ultimas atualizacoes da documentacao</CardTitle>
          </div>
          <CardDescription>
            Conteudos novos ou revisados recentemente na base de documentacao.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {latestUpdates.length > 0 ? latestUpdates.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-lg px-2 py-2 no-underline transition-colors hover:bg-accent/50">
              <p className="text-sm text-foreground">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatDateMedium(item.lastUpdated) ?? 'Data nao informada'}</p>
            </Link>
          )) : <p className="text-sm text-muted-foreground">Sem atualizacoes recentes registradas.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
