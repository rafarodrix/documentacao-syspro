import Link from "next/link";
import { ArrowLeft, Book, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Ajuste o título conforme o nome do seu produto
const PRODUCT_NAME = "SysPro";

export default function ReleasesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background font-sans antialiased flex flex-col">
            {/* --- HEADER ESPECÍFICO DE RELEASES --- */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container max-w-5xl mx-auto flex h-14 items-center justify-between px-4">

                    {/* Lado Esquerdo: Logo / Título */}
                    <div className="flex items-center gap-2">
                        <Link href="/releases" className="flex items-center gap-2 font-bold transition-colors hover:text-primary">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <span className="hidden sm:inline-block">
                                {PRODUCT_NAME} <span className="text-muted-foreground font-normal">Changelog</span>
                            </span>
                        </Link>
                    </div>

                    {/* Lado Direito: Navegação */}
                    <nav className="flex items-center gap-2">
                        <Link href="/docs" passHref>
                            <Button variant="ghost" size="sm" className="gap-2 hidden sm:flex">
                                <Book className="w-4 h-4" />
                                Documentação
                            </Button>
                        </Link>

                        <Link href="/" passHref>
                            <Button variant="secondary" size="sm" className="gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">Voltar ao App</span>
                                <span className="sm:hidden">Voltar</span>
                            </Button>
                        </Link>
                    </nav>
                </div>
            </header>

            {/* --- BACKGROUND DECORATIVO (OPCIONAL) --- */}
            <div className="fixed inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]" />
            </div>

            {/* --- CONTEÚDO PRINCIPAL --- */}
            <main className="flex-1 container max-w-5xl mx-auto py-12 px-4 md:px-6">
                {children}
            </main>

            {/* --- FOOTER SIMPLES --- */}
            <footer className="border-t py-6 md:py-0">
                <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row max-w-5xl mx-auto px-4">
                    <p className="text-sm text-muted-foreground text-center md:text-left">
                        © {new Date().getFullYear()} {PRODUCT_NAME}. Todas as novidades em um só lugar.
                    </p>
                </div>
            </footer>
        </div>
    );
}