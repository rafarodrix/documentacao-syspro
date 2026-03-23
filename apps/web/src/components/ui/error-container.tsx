import { ReactNode } from "react";

export function ErrorContainer({ children }: { children: ReactNode }) {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background relative overflow-hidden">
            {/* Background Decorativo (Grid + Glow) */}
            <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
                <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]" />
            </div>

            {/* Conteúdo Centralizado */}
            <div className="container px-4 md:px-6 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
                {children}
            </div>
        </div>
    );
}