import type { Release } from "@dosc-syspro/core";

export type ReleaseMonthSummary = {
  year: string;
  month: string;
  monthName: string;
  bugs: number;
  melhorias: number;
};

export function groupReleasesByMonth(releases: Release[]): ReleaseMonthSummary[] {
  const monthNames = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const grouped = releases.reduce((acc, release) => {
    if (!release.isoDate || !release.type) return acc;

    const [year, month] = release.isoDate.split("-");
    const key = `${year}-${month}`;

    if (!acc[key]) {
      acc[key] = { year, month, monthName: monthNames[Number(month) - 1], bugs: 0, melhorias: 0 };
    }

    if (release.type.toLowerCase() === "bug") {
      acc[key].bugs++;
    } else if (release.type.toLowerCase() === "melhoria") {
      acc[key].melhorias++;
    }

    return acc;
  }, {} as Record<string, ReleaseMonthSummary>);

  return Object.values(grouped).sort((a, b) => b.year.localeCompare(a.year) || b.month.localeCompare(a.month));
}
