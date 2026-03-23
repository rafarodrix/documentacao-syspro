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
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {status ? <span className="rounded-full border border-border/70 px-2 py-1">Status: {status}</span> : null}
      {owner ? <span className="rounded-full border border-border/70 px-2 py-1">Owner: {owner}</span> : null}
      {updatedAtLabel ? (
        <span className="rounded-full border border-border/70 px-2 py-1">Atualizado em: {updatedAtLabel}</span>
      ) : null}
    </div>
  );
}
