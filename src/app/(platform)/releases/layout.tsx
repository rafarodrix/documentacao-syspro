import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export default function ReleasesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background font-sans antialiased flex flex-col">

            {/* 1. Reutilizando o Header do Site */}
            <SiteHeader />

            {/* 2. Background Decorativo 
         Mantive este background pois ele dá um toque visual sutil de "tech/grid" 
         que é muito comum em páginas de Release Notes, diferenciando levemente do resto do site.
         Se preferir o fundo 100% limpo igual ao site, basta remover esta div.
      */}
            <div className="fixed inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]" />
            </div>

            {/* 3. Conteúdo Principal Centralizado */}
            <main className="flex-1 container max-w-5xl mx-auto py-12 px-4 md:px-6">
                {children}
            </main>

            {/* 4. Reutilizando o Footer do Site */}
            <SiteFooter />
        </div>
    );
}