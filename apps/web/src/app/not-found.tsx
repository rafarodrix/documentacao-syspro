import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-xl text-center space-y-4">
        <h1 className="text-5xl font-bold tracking-tight">404</h1>
        <h2 className="text-xl font-semibold">Pagina nao encontrada</h2>
        <p className="text-muted-foreground">
          Desculpe, nao foi possivel localizar esta pagina.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <Link href="/" className="underline underline-offset-4">
            Voltar
          </Link>
          <Link href="/portal" className="underline underline-offset-4">
            Ir para o portal
          </Link>
        </div>
      </div>
    </main>
  );
}
