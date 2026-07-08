export function TabSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-lg border border-border/50 bg-muted/30" />
      ))}
    </div>
  );
}

export function TabListSkeleton() {
  return (
    <div className="space-y-4">
      <TabSkeleton cards={4} />
      <div className="h-64 animate-pulse rounded-lg border border-border/50 bg-muted/30" />
    </div>
  );
}

export function OperacionalTabSkeleton() {
  return (
    <div className="space-y-5">
      {/* 5 columns grid of metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-border/40 bg-muted/20" />
        ))}
      </div>
      
      {/* Chart and daily password area */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 h-[340px] animate-pulse rounded-lg border border-border/40 bg-muted/20" />
        <div className="h-[340px] animate-pulse rounded-lg border border-border/40 bg-muted/20" />
      </div>
    </div>
  );
}

export function SuporteTabSkeleton() {
  return (
    <div className="space-y-5">
      {/* Main filter area */}
      <div className="h-28 animate-pulse rounded-lg border border-border/40 bg-muted/20" />

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-border/40 bg-muted/20" />
        ))}
      </div>

      {/* Main support area (chart & queue) */}
      <div className="h-[360px] animate-pulse rounded-lg border border-border/40 bg-muted/20" />

      {/* Double column lists */}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded-lg border border-border/40 bg-muted/20" />
        <div className="h-96 animate-pulse rounded-lg border border-border/40 bg-muted/20" />
      </div>
    </div>
  );
}

export function CadastrosTabSkeleton() {
  return (
    <div className="space-y-5">
      {/* Grid of metrics */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-border/40 bg-muted/20" />
        ))}
      </div>

      {/* Three columns grid of records */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[420px] animate-pulse rounded-lg border border-border/40 bg-muted/20" />
        ))}
      </div>
    </div>
  );
}

export function ComercialTabSkeleton() {
  return (
    <div className="space-y-4">
      {/* Top metrics rows */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-border/40 bg-muted/20" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-border/40 bg-muted/20" />
        ))}
      </div>

      {/* Chart and executive summary column */}
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="h-[380px] animate-pulse rounded-lg border border-border/40 bg-muted/20" />
        <div className="h-[380px] animate-pulse rounded-lg border border-border/40 bg-muted/20" />
      </div>
    </div>
  );
}
