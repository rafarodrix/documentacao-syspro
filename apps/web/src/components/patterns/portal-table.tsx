import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dosc-syspro/ui";
import { EmptyState } from "./empty-state";
import { LoadingState } from "./async-state";
import { ResponsiveTableViewport } from "./responsive-table-viewport";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PortalTableViewport({
  children,
  className,
  minWidthClassName,
  flexible = false,
}: {
  children: ReactNode;
  className?: string;
  minWidthClassName?: string;
  flexible?: boolean;
}) {
  return (
    <ResponsiveTableViewport
      className={className}
      innerClassName={cn(flexible ? "w-full" : "min-w-max", minWidthClassName)}
      flexible={flexible}
    >
      {children}
    </ResponsiveTableViewport>
  );
}

export function PortalTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Table className={className}>{children}</Table>;
}

export function PortalTableHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <TableHeader className={cn("sticky top-0 z-10 bg-muted/20 backdrop-blur", className)}>{children}</TableHeader>;
}

export function PortalTableHead({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <TableHead className={cn("text-xs font-semibold uppercase tracking-wide text-muted-foreground", className)}>
      {children}
    </TableHead>
  );
}

export function PortalTableBody({
  children,
}: {
  children: ReactNode;
}) {
  return <TableBody>{children}</TableBody>;
}

export function PortalTableLoadingRow({
  colSpan,
  label,
  compact = true,
  className,
}: {
  colSpan: number;
  label: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className={cn("text-center", compact ? "h-32" : "h-64", className)}>
        <LoadingState label={label} compact={compact} />
      </TableCell>
    </TableRow>
  );
}

export function PortalTableEmptyRow({
  colSpan,
  icon,
  title,
  description,
  compact = true,
  className,
}: {
  colSpan: number;
  icon?: LucideIcon;
  title: string;
  description?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className={cn("h-64 text-center", className)}>
        <EmptyState icon={icon} title={title} description={description} compact={compact} />
      </TableCell>
    </TableRow>
  );
}
