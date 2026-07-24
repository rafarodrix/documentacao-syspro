"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";

const DEVICE_LIST_HREF = "/portal/infraestrutura?tab=dispositivos";

type DeviceDetailBackLinkProps = {
  href?: string;
  label?: string;
  className?: string;
  variant?: "icon" | "ghost";
};

export function DeviceDetailBackLink({
  href = DEVICE_LIST_HREF,
  label = "Voltar para dispositivos",
  className,
  variant = "icon",
}: DeviceDetailBackLinkProps) {
  if (variant === "ghost") {
    return (
      <Button asChild variant="ghost" size="sm" className={cn("h-8 px-2 text-muted-foreground", className)}>
        <Link href={href}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          {label}
        </Link>
      </Button>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/40 text-muted-foreground transition-all hover:scale-105 hover:bg-muted/80 hover:text-foreground",
        className,
      )}
      title={label}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </Link>
  );
}
