"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
    AlertCircle,
    Check,
    Clock,
    Loader2,
    Palette,
    Plus,
    Save,
    Settings2,
    Tag,
    Trash2,
    Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
type TicketCategory = {
    id: string;
    label: string;
    value: string;
    icon: string;
    color: string;
};

type TicketPriorityConfig = {
    id: string;
    label: string;
    value: string;
    color: string;
    slaHours: number;
};

type TicketSettingsState = {
    categories: TicketCategory[];
    priorities: TicketPriorityConfig[];
    autoAssignToCreator: boolean;
    autoResponseEnabled: boolean;
    autoResponseMessage: string;
    defaultPriority: string;
};

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES: TicketCategory[] = [
    { id: "1", label: "Incidente / Erro", value: "incident", icon: "🔴", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    { id: "2", label: "Duvida", value: "question", icon: "🔵", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    { id: "3", label: "Solicitacao", value: "request", icon: "🟢", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
];

const DEFAULT_PRIORITIES: TicketPriorityConfig[] = [
    { id: "1", label: "Baixa", value: "1 low", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400", slaHours: 48 },
    { id: "2", label: "Normal", value: "2 normal", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", slaHours: 24 },
    { id: "3", label: "Alta (Urgente)", value: "3 high", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", slaHours: 4 },
];

const DEFAULT_AUTO_RESPONSE = "Olá! Recebemos sua solicitacao e nossa equipe ja esta ciente. Retornaremos em breve com uma analise detalhada.";

// ─── Component ───────────────────────────────────────────────────────────────
export function TicketSettingsTab() {
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<TicketSettingsState>({
        categories: DEFAULT_CATEGORIES,
        priorities: DEFAULT_PRIORITIES,
        autoAssignToCreator: true,
        autoResponseEnabled: false,
        autoResponseMessage: DEFAULT_AUTO_RESPONSE,
        defaultPriority: "2 normal",
    });

    // ── Category CRUD ────────────────────────────────────────────────────
    const addCategory = () => {
        const newId = String(Date.now());
        setSettings((prev) => ({
            ...prev,
            categories: [
                ...prev.categories,
                { id: newId, label: "", value: "", icon: "⚪", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
            ],
        }));
    };

    const updateCategory = (id: string, field: keyof TicketCategory, value: string) => {
        setSettings((prev) => ({
            ...prev,
            categories: prev.categories.map((c) =>
                c.id === id ? { ...c, [field]: value, ...(field === "label" ? { value: value.toLowerCase().replace(/\s+/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, "") } : {}) } : c,
            ),
        }));
    };

    const removeCategory = (id: string) => {
        if (settings.categories.length <= 1) {
            toast.error("E necessario manter ao menos uma categoria.");
            return;
        }
        setSettings((prev) => ({
            ...prev,
            categories: prev.categories.filter((c) => c.id !== id),
        }));
    };

    // ── Priority update ──────────────────────────────────────────────────
    const updatePriority = (id: string, field: keyof TicketPriorityConfig, value: string | number) => {
        setSettings((prev) => ({
            ...prev,
            priorities: prev.priorities.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
        }));
    };

    // ── Save (stub for future backend) ───────────────────────────────────
    const handleSave = async () => {
        setIsSaving(true);
        try {
            // TODO: POST /api/settings/tickets with settings payload
            await new Promise((r) => setTimeout(r, 800));
            toast.success("Configuracoes de tickets salvas com sucesso.");
        } catch {
            toast.error("Erro ao salvar configuracoes.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* ── Info banner ──────────────────────────────────────────── */}
            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Configuracoes do modulo de Tickets</p>
                    <p className="mt-1">Configure categorias, prioridades, SLA e comportamentos automaticos para os chamados da plataforma. As alteracoes afetam todos os novos tickets.</p>
                </div>
            </div>

            {/* ── Categories ──────────────────────────────────────────── */}
            <Card className="border-border/60">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Tag className="h-4 w-4 text-primary/70" />
                            Categorias de Ticket
                        </CardTitle>
                        <Button variant="outline" size="sm" className="gap-2 h-8" onClick={addCategory}>
                            <Plus className="h-3.5 w-3.5" />
                            Nova categoria
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Defina os tipos de ticket que os usuarios podem selecionar ao abrir um chamado.</p>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                    {settings.categories.map((cat) => (
                        <div
                            key={cat.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/10 hover:bg-muted/20 transition-colors"
                        >
                            <Input
                                value={cat.icon}
                                onChange={(e) => updateCategory(cat.id, "icon", e.target.value)}
                                className="w-14 h-9 text-center text-lg"
                                maxLength={2}
                            />
                            <Input
                                value={cat.label}
                                onChange={(e) => updateCategory(cat.id, "label", e.target.value)}
                                placeholder="Nome da categoria"
                                className="flex-1 h-9 text-sm"
                            />
                            <Badge variant="outline" className={cn("text-[10px] px-2 shrink-0", cat.color)}>
                                {cat.value || "slug"}
                            </Badge>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
                                onClick={() => removeCategory(cat.id)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* ── Priorities & SLA ────────────────────────────────────── */}
            <Card className="border-border/60">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Palette className="h-4 w-4 text-primary/70" />
                        Prioridades e SLA
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Configure os niveis de prioridade e o tempo de SLA (tempo maximo de resolucao) para cada nivel.</p>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                    {settings.priorities.map((priority) => (
                        <div
                            key={priority.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/10"
                        >
                            <Badge variant="outline" className={cn("text-[10px] px-3 py-1 min-w-20 justify-center shrink-0", priority.color)}>
                                {priority.label}
                            </Badge>
                            <div className="flex-1">
                                <Input
                                    value={priority.label}
                                    onChange={(e) => updatePriority(priority.id, "label", e.target.value)}
                                    className="h-9 text-sm"
                                    placeholder="Nome da prioridade"
                                />
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    type="number"
                                    min={1}
                                    max={720}
                                    value={priority.slaHours}
                                    onChange={(e) => updatePriority(priority.id, "slaHours", Number(e.target.value))}
                                    className="w-20 h-9 text-sm text-center"
                                />
                                <span className="text-xs text-muted-foreground">horas</span>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* ── Automations ─────────────────────────────────────────── */}
            <Card className="border-border/60">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Automacoes
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Configure comportamentos automaticos ao criar ou atualizar tickets.</p>
                </CardHeader>
                <CardContent className="space-y-5 pt-0">
                    {/* Auto-assign */}
                    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/50 bg-muted/10">
                        <div>
                            <p className="text-sm font-medium text-foreground">Auto-atribuicao</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Atribuir automaticamente o ticket ao usuario que o criou.</p>
                        </div>
                        <Switch
                            checked={settings.autoAssignToCreator}
                            onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoAssignToCreator: checked }))}
                        />
                    </div>

                    {/* Auto-response */}
                    <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/10">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-foreground">Resposta automatica</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Enviar uma mensagem automatica ao abrir o chamado.</p>
                            </div>
                            <Switch
                                checked={settings.autoResponseEnabled}
                                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoResponseEnabled: checked }))}
                            />
                        </div>

                        {settings.autoResponseEnabled && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mensagem</Label>
                                <Textarea
                                    rows={3}
                                    value={settings.autoResponseMessage}
                                    onChange={(e) => setSettings((prev) => ({ ...prev, autoResponseMessage: e.target.value }))}
                                    placeholder="Mensagem de resposta automatica..."
                                    className="mt-1.5 text-sm"
                                />
                            </div>
                        )}
                    </div>

                    {/* Default priority */}
                    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/50 bg-muted/10">
                        <div>
                            <p className="text-sm font-medium text-foreground">Prioridade padrao</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Prioridade atribuida automaticamente a novos tickets.</p>
                        </div>
                        <select
                            value={settings.defaultPriority}
                            onChange={(e) => setSettings((prev) => ({ ...prev, defaultPriority: e.target.value }))}
                            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            {settings.priorities.map((p) => (
                                <option key={p.id} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* ── Save button ─────────────────────────────────────────── */}
            <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={isSaving} className="gap-2 min-w-[180px]">
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    Salvar configuracoes
                </Button>
            </div>
        </div>
    );
}
