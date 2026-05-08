"use client";

import { cn } from "@/lib/utils";

interface FilterTabsOption<TValue extends string> {
  value: TValue;
  label: string;
  count?: number;
}

interface FilterTabsProps<TValue extends string> {
  options: FilterTabsOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  className?: string;
}

export function FilterTabs<TValue extends string>({
  options,
  value,
  onChange,
  className,
}: FilterTabsProps<TValue>) {
  return (
    <div
      className={cn(
        "overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <div className="inline-flex min-w-max items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
              value === option.value
                ? "border border-border/50 bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                {option.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
