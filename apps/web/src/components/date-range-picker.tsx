"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale"; // Localização PT-BR
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export function CalendarDateRangePicker({
    className,
}: React.HTMLAttributes<HTMLDivElement>) {
    // Estado inicial: Últimos 30 dias
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: new Date(2025, 10, 1), // Exemplo: 01 Nov
        to: addDays(new Date(2025, 10, 1), 30), // +30 dias
    });

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal h-9 bg-background border-border/60 shadow-sm hover:bg-muted/50 transition-all",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "dd LLL, y", { locale: ptBR })} -{" "}
                                    {format(date.to, "dd LLL, y", { locale: ptBR })}
                                </>
                            ) : (
                                format(date.from, "dd LLL, y", { locale: ptBR })
                            )
                        ) : (
                            <span>Selecione uma data</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                        locale={ptBR} // Tradução do calendário
                        className="p-3 border-border/50 shadow-xl bg-background/95 backdrop-blur-xl rounded-xl"
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}