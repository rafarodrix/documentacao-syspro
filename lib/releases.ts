import type { Release } from "./types";

export async function getReleases(): Promise<Release[]> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const apiUrl = `${baseUrl}/api/releases`;

  try {
    // ALTERAÇÃO: Adicionando { cache: 'no-store' } para forçar uma busca nova
    const response = await fetch(apiUrl, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Failed to fetch releases: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar releases:", error);
    return [];
  }
}