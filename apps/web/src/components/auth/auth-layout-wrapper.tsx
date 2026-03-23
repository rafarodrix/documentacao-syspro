import Link from "next/link";
import { Terminal, ShieldCheck, Zap, CheckCircle2, ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthLayoutWrapperProps {
    children: React.ReactNode;
    title: string;
    description: string;
    backButton?: boolean;
    className?: string; // Adicionado para flexibilidade (padrão Shadcn)
}

export function AuthLayoutWrapper({
    children,
    title,
    description,
    backButton = true,
    className
}: AuthLayoutWrapperProps) {
    return (
        // Usamos 'cn' aqui para permitir estilos externos se necessário
        <div className={cn("w-full min-h-screen grid lg:grid-cols-2", className)}>

            {/* --- COLUNA 1: Área do Formulário --- */}
            <div className="flex flex-col justify-center px-4 sm:px-12 relative bg-background overflow-y-auto">

                {/* Botão Voltar */}
                {backButton && (
                    <div className="absolute top-6 left-6 md:top-8 md:left-8 z-20 animate-in fade-in slide-in-from-left-4 duration-500">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
                        >
                            <div className="p-2 rounded-full bg-muted/50 border border-border/50 group-hover:border-primary/20 group-hover:bg-primary/5 transition-all">
                                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            </div>
                            <span className="hidden sm:inline">Voltar</span>
                        </Link>
                    </div>
                )}

                {/* Background Grids Sutil */}
                <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                <div className="mx-auto w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 py-12 lg:py-0">

                    {/* Cabeçalho */}
                    <div className="flex flex-col space-y-2 text-center">
                        <div className="mx-auto mb-6 h-12 w-12 rounded-xl bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                            <Terminal className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                        <p className="text-muted-foreground text-sm">
                            {description}
                        </p>
                    </div>

                    {/* CONTEÚDO */}
                    <main>
                        {children}
                    </main>
                </div>
            </div>

            {/* --- COLUNA 2: Branding (Fixa) --- */}
            <div className="hidden lg:flex relative flex-col justify-between p-12 text-white bg-zinc-950 overflow-hidden border-l border-white/10">

                {/* Background Effects */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-50 mix-blend-screen animate-pulse-slow"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] opacity-30 mix-blend-screen"></div>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                </div>

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3 animate-in fade-in slide-in-from-top-8 duration-1000">
                    <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center">
                        <Terminal className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-semibold tracking-wide">Trilink Software</span>
                </div>

                {/* Features */}
                <div className="relative z-10 max-w-lg space-y-8 animate-in fade-in slide-in-from-right-8 duration-1000 delay-100">
                    <div>
                        <h2 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight mb-4 text-white">
                            A Central de Ajuda do Syspro ERP
                        </h2>
                        <p className="text-lg text-zinc-400 leading-relaxed">
                            Acesse sua conta para ter acesso a toda a documentação, chamados e configurações com segurança total.
                        </p>
                    </div>

                    <div className="grid gap-6 pt-4">
                        <FeatureItem icon={ShieldCheck} title="Segurança" desc="Criptografia de ponta a ponta." />
                        <FeatureItem icon={Zap} title="Performance" desc="Dashboard otimizado em tempo real." />
                        <FeatureItem icon={CheckCircle2} title="Compliance" desc="Regras de negócio atualizadas." />
                    </div>
                </div>

                {/* Footer Links */}
                <div className="relative z-10 flex items-center justify-between text-sm text-zinc-500 pt-8 animate-in fade-in duration-1000 delay-300">
                    <p>© {new Date().getFullYear()} Trilink Software. Todos os direitos reservados.</p>
                    <div className="flex gap-6">
                        <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
                        <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Subcomponente puramente visual
function FeatureItem({ icon: Icon, title, desc }: { icon: LucideIcon, title: string, desc: string }) {
    return (
        <div className="flex items-start gap-4 group cursor-default">
            <div className="mt-1 h-10 w-10 shrink-0 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/30 transition-all duration-500">
                <Icon className="h-5 w-5 text-zinc-400 group-hover:text-white transition-colors" />
            </div>
            <div>
                <h3 className="font-semibold text-zinc-200 text-base mb-1 group-hover:text-white transition-colors">{title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">{desc}</p>
            </div>
        </div>
    )
}