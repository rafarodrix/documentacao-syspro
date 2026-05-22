"use client";

import type { StorageR2Settings } from "@dosc-syspro/contracts/settings";
import { Input } from "@dosc-syspro/ui";
import { FormField } from "../integration-form-primitives";

export function StorageModuleCard({
  title,
  description,
  values,
  onChange,
  defaultPrefix,
}: {
  title: string;
  description: string;
  values: StorageR2Settings["modules"]["tickets"];
  onChange: (next: StorageR2Settings["modules"]["tickets"]) => void;
  defaultPrefix: string;
}) {
  const fieldPrefix = `storage-module-${title.toLowerCase()}`;

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
      <div className="mb-4">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">
        <FormField id={`${fieldPrefix}-bucket`} label="Bucket dedicado (opcional)">
          <Input
            id={`${fieldPrefix}-bucket`}
            value={values.bucketName}
            onChange={(event) => onChange({ ...values, bucketName: event.target.value })}
            placeholder="Se vazio, usa o bucket padrao"
          />
        </FormField>
        <FormField id={`${fieldPrefix}-public-base-url`} label="Public Base URL dedicada (opcional)">
          <Input
            id={`${fieldPrefix}-public-base-url`}
            value={values.publicBaseUrl}
            onChange={(event) => onChange({ ...values, publicBaseUrl: event.target.value })}
            placeholder="Se vazio, usa a URL publica padrao"
          />
        </FormField>
        <FormField id={`${fieldPrefix}-prefix`} label="Pasta / prefixo">
          <Input
            id={`${fieldPrefix}-prefix`}
            value={values.prefix}
            onChange={(event) => onChange({ ...values, prefix: event.target.value })}
            placeholder={defaultPrefix}
          />
        </FormField>
      </div>
    </div>
  );
}
