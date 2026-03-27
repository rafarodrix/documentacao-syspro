export function DocsMetaChips({
  status,
  owner,
  updatedAtLabel,
}: {
  status?: string;
  owner?: string;
  updatedAtLabel?: string;
}) {
  if (!status && !owner && !updatedAtLabel) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {status ? <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 shadow-sm">Status: {status}</span> : null}
      {owner ? <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 shadow-sm">Owner: {owner}</span> : null}
      {updatedAtLabel ? (
        <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 shadow-sm">Atualizado em: {updatedAtLabel}</span>
      ) : null}
    </div>
  );
}
