import type { Release } from "@dosc-syspro/core";

export const releaseMonthNames = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export type ReleaseMonthSummary = {
  year: string;
  month: string;
  monthName: string;
  bugs: number;
  melhorias: number;
  novasFuncionalidades: number;
};

export function groupReleasesByMonth(releases: Release[]): ReleaseMonthSummary[] {
  const grouped = releases.reduce((acc, release) => {
    if (!release.isoDate || !release.type) return acc;

    const [year, month] = release.isoDate.split("-");
    const key = `${year}-${month}`;

    if (!acc[key]) {
      acc[key] = { year, month, monthName: releaseMonthNames[Number(month) - 1], bugs: 0, melhorias: 0, novasFuncionalidades: 0 };
    }

    const type = release.type.toLowerCase();
    if (type === "bug") {
      acc[key].bugs++;
    } else if (type === "nova funcionalidade") {
      acc[key].novasFuncionalidades++;
    } else if (type === "melhoria") {
      acc[key].melhorias++;
    }

    return acc;
  }, {} as Record<string, ReleaseMonthSummary>);

  return Object.values(grouped).sort((a, b) => b.year.localeCompare(a.year) || b.month.localeCompare(a.month));
}

export function groupReleasesByDate(releases: Release[]) {
  const grouped = releases.reduce((acc, release) => {
    if (!release.isoDate || !release.type) return acc;

    const [year, month] = release.isoDate.split("-");
    if (!acc[year]) acc[year] = {};
    if (!acc[year][month]) acc[year][month] = { bugs: 0, melhorias: 0, novasFuncionalidades: 0 };

    const type = release.type.toLowerCase();
    if (type === "bug") acc[year][month].bugs++;
    else if (type === "nova funcionalidade") acc[year][month].novasFuncionalidades++;
    else if (type === "melhoria" || type === "feature") acc[year][month].melhorias++;

    return acc;
  }, {} as Record<string, Record<string, { bugs: number; melhorias: number }>>);

  return Object.entries(grouped)
    .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
    .map(([year, monthsData]) => ({
      year,
      months: Object.entries(monthsData)
        .sort(([monthA], [monthB]) => Number(monthB) - Number(monthA))
        .map(([month, counts]) => ({ month, ...counts })),
    }));
}
