"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
    value: number;
    direction?: "up" | "down";
    delay?: number;
    className?: string;
    decimalPlaces?: number;
    // Adicionamos o formatter opcional para lidar com Moeda e Porcentagem
    formatter?: (val: number) => string;
}

export default function NumberTicker({
    value,
    direction = "up",
    delay = 0,
    className,
    decimalPlaces = 0,
    formatter = (v) => v.toFixed(0), // Formatter padrão se nenhum for passado
}: NumberTickerProps) {
    const ref = useRef<HTMLSpanElement>(null);

    // Inicia o valor: Se for "up", começa em 0. Se "down", começa no valor total.
    const motionValue = useMotionValue(direction === "down" ? value : 0);

    // Configuração da "Mola" (Physics) para dar o efeito suave e premium
    const springValue = useSpring(motionValue, {
        damping: 60,    // Controla o "peso" da parada (quanto maior, menos oscila)
        stiffness: 100, // Controla a velocidade/rigidez
    });

    // Só anima quando o elemento entra na tela
    const isInView = useInView(ref, { once: true, margin: "0px" });

    useEffect(() => {
        if (isInView) {
            setTimeout(() => {
                motionValue.set(direction === "down" ? 0 : value);
            }, delay * 1000);
        }
    }, [motionValue, isInView, delay, value, direction]);

    useEffect(() => {
        // Ouve as mudanças do valor animado
        return springValue.on("change", (latest) => {
            if (ref.current) {
                // 1. Arredonda para as casas decimais desejadas durante a animação
                const fixedValue = Number(latest.toFixed(decimalPlaces));

                // 2. Aplica o formatador (R$, %, etc) e atualiza o texto direto no DOM (Performance)
                ref.current.textContent = formatter(fixedValue);
            }
        });
    }, [springValue, decimalPlaces, formatter]);

    return (
        <span
            className={cn("inline-block tabular-nums tracking-tight text-foreground", className)}
            ref={ref}
        />
    );
}