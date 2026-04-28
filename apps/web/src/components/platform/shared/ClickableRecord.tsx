"use client";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ClickableRecordProps = {
  enabled: boolean;
  onOpen: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

function handleRecordKeyDown(event: KeyboardEvent<HTMLElement>, enabled: boolean, onOpen: () => void) {
  if (!enabled) return;
  if (event.key !== "Enter" && event.key !== " ") return;

  event.preventDefault();
  onOpen();
}

export function stopRecordClick(event: Pick<Event, "stopPropagation">) {
  event.stopPropagation();
}

export function ClickableCard({
  enabled,
  onOpen,
  children,
  className,
  style,
  title,
}: ClickableRecordProps) {
  return (
    <div
      className={cn("transition-colors", enabled && "cursor-pointer hover:bg-muted/20", className)}
      style={style}
      onClick={enabled ? onOpen : undefined}
      role={enabled ? "button" : undefined}
      tabIndex={enabled ? 0 : undefined}
      onKeyDown={(event) => handleRecordKeyDown(event, enabled, onOpen)}
      title={enabled ? title : undefined}
    >
      {children}
    </div>
  );
}

export function ClickableTableRow({
  enabled,
  onOpen,
  children,
  className,
  style,
  title,
}: ClickableRecordProps) {
  return (
    <TableRow
      className={cn(enabled && "cursor-pointer", className)}
      style={style}
      onClick={enabled ? onOpen : undefined}
      role={enabled ? "button" : undefined}
      tabIndex={enabled ? 0 : undefined}
      onKeyDown={(event) => handleRecordKeyDown(event, enabled, onOpen)}
      title={enabled ? title : undefined}
    >
      {children}
    </TableRow>
  );
}
