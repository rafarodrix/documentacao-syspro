import Link from "next/link";
import { Terminal, ShieldCheck, Zap, CheckCircle2 } from "lucide-react";

interface AuthLayoutWrapperProps {
    children: React.ReactNode;
    title: string;
    description: string;
    backButton?: boolean;
}

export function AuthLayoutWrapper({ children, title, description, backButton = true }: AuthLayoutWrapperProps) {
    return (
        <div className="w-full min-h-screen grid lg:grid-cols-2">

            {/* --- COLUNA 1: Área do Formulário (Dinâmica) --- */}
            <div className="flex flex-col justify-center px-4 sm:px-12 relative bg-background overflow-hidden">

                {/* Background Grids Sutil */}
                <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                <div className="mx-auto w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                    {/* Cabeçalho do Form */}
                    <div className="flex flex-col space-y-2 text-center">
                        <div className="mx-auto mb-6 h-12 w-12 rounded-xl bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                            <Terminal className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                        <p className="text-muted-foreground text-sm">
                            {description}
                        </p>
                    </div>

                    {/* O CONTEÚDO ESPECÍFICO (Formulário) ENTRA AQUI */}
                    {children}

                    {/* Footer Comum */}
                    <div className="text-center text-xs text-muted-foreground">
                        © {new Date().getFullYear()} Trilink Software
                    </div>
                </div>
            </div>

            {/* --- COLUNA 2: Branding (Fixa e Reutilizável) --- */}
            <div className="hidden lg:flex relative flex-col justify-between p-12 text-white bg-[#09090b] overflow-hidden border-l border-white/10">

                {/* Background Effects (Magic UI) */}
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
                        <h2 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight mb-4">
                            A Central de Ajuda do Syspro ERP
                        </h2>
                        <p className="text-lg text-zinc-400 leading-relaxed">
                            Acesse sua conta para ter acesso a toda a documentação e configurações com segurança total.
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
                    <p>Todos os direitos reservados.</p>
                    <div className="flex gap-6">
                        <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
                        <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="flex items-start gap-4 group">
            <div className="mt-1 h-10 w-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/30 transition-all duration-500">
                <Icon className="h-5 w-5 text-zinc-400 group-hover:text-white transition-colors" />
            </div>
            <div>
                <h3 className="font-semibold text-zinc-200 text-base mb-1 group-hover:text-white transition-colors">{title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">{desc}</p>
            </div>
        </div>
    )
}