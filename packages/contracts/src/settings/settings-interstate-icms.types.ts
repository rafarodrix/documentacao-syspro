import { z } from "zod";
import { SEFAZ_UFS } from "../sefaz/sefaz-topology.types";

const UF_VALUES = SEFAZ_UFS as unknown as readonly [string, ...string[]];

const interstateRateSchema = z.coerce
  .number()
  .min(0, "Aliquota invalida.")
  .max(40, "Aliquota invalida.");

const interstateRateMapShape = Object.fromEntries(
  SEFAZ_UFS.map((uf) => [uf, interstateRateSchema]),
) as Record<string, typeof interstateRateSchema>;

export const interstateIcmsRateMapSchema = z.object(interstateRateMapShape);

export const interstateIcmsRateRowSchema = z.object({
  origin: z.enum(UF_VALUES),
  rates: interstateIcmsRateMapSchema,
});

export const interstateIcmsSettingsSchema = z
  .array(interstateIcmsRateRowSchema)
  .length(SEFAZ_UFS.length)
  .superRefine((rows, ctx) => {
    const seen = new Set<string>();
    rows.forEach((row, index) => {
      if (seen.has(row.origin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "origin"],
          message: `UF de origem duplicada: ${row.origin}.`,
        });
      }
      seen.add(row.origin);
    });
  });

export type InterstateIcmsRateMap = z.infer<typeof interstateIcmsRateMapSchema>;
export type InterstateIcmsRateRow = z.infer<typeof interstateIcmsRateRowSchema>;
export type InterstateIcmsSettings = z.infer<typeof interstateIcmsSettingsSchema>;

const INTERNAL_RATES_2026: Record<string, number> = {
  AC: 19,
  AL: 20,
  AM: 20,
  AP: 18,
  BA: 20.5,
  CE: 20,
  DF: 20,
  ES: 17,
  GO: 19,
  MA: 23,
  MT: 17,
  MS: 17,
  MG: 18,
  PA: 19,
  PB: 20,
  PR: 19.5,
  PE: 20.5,
  PI: 22.5,
  RN: 20,
  RS: 17,
  RJ: 22,
  RO: 19.5,
  RR: 20,
  SC: 17,
  SP: 18,
  SE: 20,
  TO: 20,
};

const REDUCED_ORIGIN_UFS = new Set(["MG", "PR", "RJ", "RS", "SC", "SP"]);
const REDUCED_DESTINATION_UFS = new Set([
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "PA",
  "PB",
  "PE",
  "PI",
  "RN",
  "RO",
  "RR",
  "SE",
  "TO",
]);

function resolveInterstateRate(origin: string, destination: string) {
  if (origin === destination) {
    return INTERNAL_RATES_2026[origin] ?? 18;
  }

  if (REDUCED_ORIGIN_UFS.has(origin) && REDUCED_DESTINATION_UFS.has(destination)) {
    return 7;
  }

  return 12;
}

export function buildDefaultInterstateIcmsSettings(): InterstateIcmsSettings {
  return SEFAZ_UFS.map((origin) => ({
    origin,
    rates: Object.fromEntries(
      SEFAZ_UFS.map((destination) => [destination, resolveInterstateRate(origin, destination)]),
    ) as InterstateIcmsRateMap,
  }));
}
