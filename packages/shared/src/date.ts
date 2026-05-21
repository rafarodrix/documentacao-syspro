export function formatRecency(isoDate: string): string {
  const now = new Date();
  const updateDate = new Date(isoDate);

  now.setHours(0, 0, 0, 0);
  updateDate.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - updateDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays === 0) return "Atualizado hoje";
  if (diffDays === 1) return "Atualizado ontem";
  if (diffDays <= 7) return `Atualizado há ${diffDays} dias`;

  const formattedDate = updateDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return `Atualizado em ${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}`;
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "-";
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}