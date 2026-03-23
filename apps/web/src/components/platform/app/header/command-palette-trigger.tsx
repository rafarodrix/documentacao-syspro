import { Search } from "lucide-react";

export function CommandPaletteTrigger() {
    return (
        <button className="relative group w-full flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <div className="flex h-9 w-full items-center rounded-lg border border-border/50 bg-muted/40 px-3 pl-10 text-sm text-muted-foreground shadow-sm transition-all hover:bg-background hover:border-primary/30 hover:shadow-md cursor-pointer">
                <span className="opacity-60 mr-auto truncate">Buscar...</span>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex shadow-sm">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </div>
        </button>
    );
}