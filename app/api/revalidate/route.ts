import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// Esta rota receberá as chamadas do Zammad
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);

  // 1. Valida o token secreto
  const secret = searchParams.get("secret");
  if (secret !== process.env.REVALIDATE_TOKEN) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  // 2. Lê os parâmetros de ano e mês
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  try {
    // Sempre revalida índice e API
    revalidatePath("/docs/suporte/releasenotes");
    revalidatePath("/api/releases");

    let revalidatedPaths: string[] = [
      "/docs/suporte/releasenotes",
      "/api/releases",
    ];

    // Se ano e mês forem fornecidos, revalida apenas a página específica
    if (year && month) {
      const dynamicPath = `/docs/suporte/release/${year}/${month}`;
      revalidatePath(dynamicPath);
      revalidatedPaths.push(dynamicPath);
    } else {
      // Caso não venha ano/mês, revalida o modelo genérico
      revalidatePath("/docs/suporte/release/[year]/[month]");
      revalidatedPaths.push("/docs/suporte/release/[year]/[month]");
    }

    console.log("Cache revalidado com sucesso para:", revalidatedPaths);

    return NextResponse.json({ revalidated: true, paths: revalidatedPaths, now: Date.now() });
  } catch (err) {
    console.error("Erro ao revalidar cache:", err);
    return NextResponse.json(
      { message: "Error revalidating" },
      { status: 500 }
    );
  }
}
