"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { ClientSidebar } from "../app-layout/ClientSidebar";

interface MobileMenuProps {
    user: any; // Tipagem simplificada para facilitar a importação
}

export function MobileMenu({ user }: MobileMenuProps) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0 text-muted-foreground hover:bg-muted/50 transition-colors">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Abrir menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-r-border/50">
                <ClientSidebar mobile user={user} />
            </SheetContent>
        </Sheet>
    );
}