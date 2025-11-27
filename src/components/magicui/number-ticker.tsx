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
    type?: "currency" | "percent" | "number";
}

export default function NumberTicker({
    value,
    direction = "up",
    delay = 0,
    className,
    decimalPlaces = 0,
    type = "number",
}: NumberTickerProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(direction === "down" ? value : 0);
    const springValue = useSpring(motionValue, {
        damping: 60,
        stiffness: 100,
    });
    const isInView = useInView(ref, { once: true, margin: "0px" });

    useEffect(() => {
        if (isInView) {
            setTimeout(() => {
                motionValue.set(direction === "down" ? 0 : value);
            }, delay * 1000);
        }
    }, [motionValue, isInView, delay, value, direction]);

    useEffect(() => {
        return springValue.on("change", (latest) => {
            if (ref.current) {
                const fixedValue = Number(latest.toFixed(decimalPlaces));

                let formattedText = String(fixedValue);

                if (type === "currency") {
                    formattedText = new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL"
                    }).format(fixedValue);
                } else if (type === "percent") {
                    formattedText = new Intl.NumberFormat("pt-BR", {
                        minimumFractionDigits: decimalPlaces
                    }).format(fixedValue) + "%";
                } else {
                    formattedText = new Intl.NumberFormat("pt-BR", {
                        minimumFractionDigits: decimalPlaces
                    }).format(fixedValue);
                }

                ref.current.textContent = formattedText;
            }
        });
    }, [springValue, decimalPlaces, type]);

    return (
        <span
            className={cn("inline-block tabular-nums tracking-tight text-foreground", className)}
            ref={ref}
        />
    );
}