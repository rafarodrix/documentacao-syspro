import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "./dropdown-menu";
import { cn } from "./utils";

export interface ColumnToggleOption {
  key: string;
  label: string;
}

export interface ColumnToggleDropdownProps {
  columns: ColumnToggleOption[];
  visibility: Record<string, boolean>;
  onVisibilityChange: (key: string, visible: boolean) => void;
  label?: string;
  className?: string;
}

export function ColumnToggleDropdown({
  columns,
  visibility,
  onVisibilityChange,
  label = "Colunas",
  className,
}: ColumnToggleDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-2 border-border/60 bg-background/50 hover:bg-muted/50 text-xs shadow-sm transition-all duration-200",
            className
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
          <span>{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44 bg-card/95 backdrop-blur-md border border-border/40 shadow-xl animate-in fade-in duration-200"
      >
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2.5 py-1.5">
          Exibir Colunas
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/40 mx-1" />
        {columns.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.key}
            checked={visibility[col.key] !== false}
            onCheckedChange={(checked) => onVisibilityChange(col.key, !!checked)}
            className="text-xs focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
