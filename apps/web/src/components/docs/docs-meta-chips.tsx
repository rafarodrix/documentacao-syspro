import { Avatar, AvatarFallback, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@dosc-syspro/ui";

function getInitials(name: string): string {
  return name
    .split(/[\s-_]+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

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
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {status ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default rounded-full border border-border/70 bg-background/80 px-2.5 py-1 shadow-sm">
                {status}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Status de desenvolvimento desta página</p>
            </TooltipContent>
          </Tooltip>
        ) : null}

        {owner ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-default items-center gap-1.5 rounded-full border border-border/70 bg-background/80 py-0.5 pl-1 pr-2.5 shadow-sm">
                <Avatar className="h-4 w-4">
                  <AvatarFallback className="text-[9px]">{getInitials(owner)}</AvatarFallback>
                </Avatar>
                {owner}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Responsável por manter este conteúdo atualizado.</p>
            </TooltipContent>
          </Tooltip>
        ) : null}

        {updatedAtLabel ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default rounded-full border border-border/70 bg-background/80 px-2.5 py-1 shadow-sm">
                {updatedAtLabel}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Data da última atualização do conteúdo</p>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
