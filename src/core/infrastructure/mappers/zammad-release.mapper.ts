// utils/transform-releases.ts
import { Release } from '@/core/domain/entities/release.entity';

export const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function groupReleasesByDate(releases: Release[]) {
    if (!releases) return [];

    const grouped = releases.reduce((acc, release) => {
        if (!release.isoDate || !release.type) return acc;

        const [year, month] = release.isoDate.split("-");
        if (!acc[year]) acc[year] = {};
        if (!acc[year][month]) acc[year][month] = { bugs: 0, melhorias: 0 };

        const type = release.type.toLowerCase();
        if (type === "bug") acc[year][month].bugs++;
        else if (type === "melhoria") acc[year][month].melhorias++;

        return acc;
    }, {} as Record<string, Record<string, { bugs: number; melhorias: number }>>);

    return Object.entries(grouped)
        .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA)) // Ano desc
        .map(([year, monthsData]) => ({
            year,
            months: Object.entries(monthsData)
                .sort(([monthA], [monthB]) => Number(monthB) - Number(monthA)) // Mês desc
                .map(([month, counts]) => ({ month, ...counts })),
        }));
}