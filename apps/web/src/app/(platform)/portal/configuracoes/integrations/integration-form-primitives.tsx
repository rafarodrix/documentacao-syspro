"use client";

import type { ReactNode } from "react";
import { Button, Checkbox, Label, Textarea } from "@dosc-syspro/ui";
import type { ChatwootBehaviorSettings } from "@dosc-syspro/contracts/chatwoot";

export function SectionShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-muted/15 p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-background p-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function FormField({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function BehaviorToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  id: keyof ChatwootBehaviorSettings;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex min-w-0 items-start justify-between gap-4 rounded-xl border border-border/70 bg-background px-4 py-3 ${disabled ? "opacity-60" : ""}`}>
      <span className="min-w-0 space-y-1">
        <Label htmlFor={id} className={`block text-sm font-medium ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
          {label}
        </Label>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(value) => onCheckedChange(value === true)} />
    </div>
  );
}

export function MessageTemplateField({
  id,
  label,
  counter,
  description,
  onRestore,
  children,
}: {
  id: string;
  label: string;
  counter: string;
  description: string;
  onRestore: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2 rounded-xl border border-border/70 bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{counter}</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={onRestore}>
            Restaurar
          </Button>
        </div>
      </div>
      {children}
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function CopyInfoCard({
  title,
  description,
  value,
  copyLabel,
  onCopy,
}: {
  title: string;
  description: string;
  value: string;
  copyLabel: string;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-background p-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Textarea readOnly value={value} className="min-h-24 w-full min-w-0 break-all font-mono text-xs" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onCopy}>
          {copyLabel}
        </Button>
      </div>
    </div>
  );
}
