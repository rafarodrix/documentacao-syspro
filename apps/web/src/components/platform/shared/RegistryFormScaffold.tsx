"use client";

import type { ElementType, ReactNode } from "react";
import { CheckCircle2, AlertCircle, ChevronRight, Loader2, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShineBorder } from "@/components/magicui/ShineBorder";
import { cn } from "@/lib/utils";

export type RegistryFormSection<TId extends string = string> = {
  id: TId;
  title: string;
  description: string;
  icon: ElementType;
};

type RegistryFormScaffoldProps<TId extends string = string> = {
  title: ReactNode;
  description: ReactNode;
  onBack: () => void;
  children: ReactNode;
  formId?: string;
  sections?: RegistryFormSection<TId>[];
  currentSection?: TId;
  sectionStates?: Partial<Record<TId, "error" | "ready" | "idle">>;
  onSectionChange?: (sectionId: TId) => void;
  progressLabel?: string;
  progressValue?: number;
  progressText?: string;
  footerLeft?: ReactNode;
  footerCenter?: ReactNode;
  submitLabel: string;
  submittingLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  canSubmit?: boolean;
  contentClassName?: string;
};

export function RegistryFormScaffold<TId extends string = string>({
  title,
  description,
  onBack,
  children,
  formId,
  sections,
  currentSection,
  sectionStates,
  onSectionChange,
  progressLabel = "Progresso do cadastro",
  progressValue = 0,
  progressText,
  footerLeft,
  footerCenter,
  submitLabel,
  submittingLabel = "Salvando",
  cancelLabel = "Cancelar",
  isSubmitting = false,
  canSubmit = true,
  contentClassName,
}: RegistryFormScaffoldProps<TId>) {
  const safeProgress = Math.max(0, Math.min(100, progressValue));
  const hasSections = Boolean(sections?.length && currentSection && onSectionChange);

  return (
    <div className="relative w-full min-h-[calc(100vh-112px)] overflow-hidden rounded-2xl border border-border/50 bg-card/95 shadow-xl">
      <ShineBorder borderWidth={1} duration={16} shineColor={["#2dd4bf", "#60a5fa", "#a78bfa"]} />

      <div className="border-b border-border/50 bg-linear-to-r from-muted/30 via-background to-muted/20 px-5 py-4 md:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="border-b border-border/50 bg-muted/20 px-5 py-2.5 md:px-6">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{progressLabel}</span>
          <span className="font-medium text-foreground">{progressText ?? `${safeProgress}%`}</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
          <div
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              safeProgress >= 100 ? "bg-emerald-500" : "bg-primary",
            )}
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      </div>

      <div className={cn("flex min-h-[calc(100vh-220px)] flex-col", hasSections && "md:flex-row")}>
        {hasSections ? (
          <aside className="hide-scrollbar flex w-full gap-2 overflow-x-auto border-b border-border/50 bg-muted/20 p-3 backdrop-blur-sm md:w-52 md:flex-col md:gap-1 md:overflow-x-visible md:border-b-0 md:border-r">
            {sections!.map((section) => {
              const Icon = section.icon;
              const isCurrent = section.id === currentSection;
              const state = sectionStates?.[section.id] ?? "idle";
              const hasError = state === "error";
              const isReady = state === "ready";

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSectionChange!(section.id)}
                  className={cn(
                    "group flex w-48 shrink-0 items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all md:w-full",
                    isCurrent
                      ? "border-primary/20 bg-primary/10 shadow-sm"
                      : "border-transparent hover:border-border/50 hover:bg-muted/70",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      isCurrent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                      hasError && "bg-destructive/10 text-destructive",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          isCurrent ? "text-primary" : "text-foreground",
                          hasError && "text-destructive",
                        )}
                      >
                        {section.title}
                      </p>
                      {isReady && !hasError ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : null}
                      {hasError ? <AlertCircle className="h-3.5 w-3.5 text-destructive" /> : null}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground/70">{section.description}</p>
                    {isReady && !hasError ? (
                      <Badge
                        variant="outline"
                        className="mt-1 h-5 rounded-full border-emerald-500/30 bg-emerald-500/10 px-2 text-[10px] text-emerald-600"
                      >
                        Pronto
                      </Badge>
                    ) : null}
                  </div>
                  {isCurrent ? <ChevronRight className="mt-1 h-3.5 w-3.5 text-primary/70" /> : null}
                </button>
              );
            })}
          </aside>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className={cn("flex-1 overflow-y-auto px-5 py-5 pb-8 md:px-6 md:py-6 md:pb-10", contentClassName)}>{children}</div>

          <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border/50 bg-card/95 px-5 py-4 pr-24 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between md:px-6 md:pr-32">
            <div className="flex min-w-0 flex-wrap items-center gap-3">{footerLeft}</div>
            {footerCenter ? <div className="flex items-center gap-1">{footerCenter}</div> : null}
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onBack}>
                {cancelLabel}
              </Button>
              <Button type="submit" form={formId} className="gap-2" disabled={isSubmitting || !canSubmit}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSubmitting ? submittingLabel : submitLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
