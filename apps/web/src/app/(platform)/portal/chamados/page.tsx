import { redirect } from "next/navigation";

interface ChamadosPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function stringifySearchParams(params?: Record<string, string | string[] | undefined>): string {
  if (!params) return "";
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
    }
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export default async function ChamadosPage({ searchParams }: ChamadosPageProps) {
  const params = searchParams ? await searchParams : undefined;
  redirect(`/portal/tickets${stringifySearchParams(params)}`);
}
