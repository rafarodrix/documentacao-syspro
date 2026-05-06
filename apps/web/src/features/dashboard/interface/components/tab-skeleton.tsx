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
