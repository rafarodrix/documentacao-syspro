//arquivo movido para novo projeto em
//src\lib\formatters.ts
// Adicione 'export' para que a função possa ser usada em outros arquivos
export function formatRecency(isoDate: string): string {
  const now = new Date();
  const updateDate = new Date(isoDate);

  now.setHours(0, 0, 0, 0);
  updateDate.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - updateDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays === 0) return "Atualizado Hoje!";
  if (diffDays === 1) return "Atualizado Ontem";
  if (diffDays <= 7) return `Atualizado há ${diffDays} dias`;

  const formattedDate = updateDate.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `Atualizado em ${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}`;
}