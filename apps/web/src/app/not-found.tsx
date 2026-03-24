import Link from "next/link";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorContainer } from "@/components/ui/error-container";

export default function NotFound() {
    return (
        <ErrorContainer>
            {/* Ãcone ou IlustraÃ§Ã£o */}
            <div className="p-4 bg-muted/50 rounded-full mb-4 ring-1 ring-border shadow-sm">
                <FileQuestion className="w-12 h-12 text-muted-foreground" />
            </div>

            {/* TÃ­tulos */}
            <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl bg-linear-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                404
            </h1>
            <h2 className="text-xl font-semibold text-foreground">
                PÃ¡gina nÃ£o encontrada
            </h2>
            <p className="max-w-150 text-muted-foreground md:text-lg">
                Desculpe, nÃ£o conseguimos encontrar a pÃ¡gina que vocÃª estÃ¡ procurando.
                Ela pode ter sido movida ou excluÃ­da.
            </p>

            {/* AÃ§Ãµes */}
            <div className="flex gap-4 mt-8">
                <Link href="/">
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </Button>
                </Link>
                <Link href="/portal">
                    <Button className="gap-2 bg-primary text-primary-foreground shadow-lg hover:shadow-primary/20">
                        <Home className="w-4 h-4" />
                        Ir para o InÃ­cio
                    </Button>
                </Link>
            </div>
        </ErrorContainer>
    );
}
