"use client";

import { Button, Input } from "@dosc-syspro/ui";
import { Calendar, CheckSquare, Plus, Square, Trash2 } from "lucide-react";
import type { CrmTask } from "@dosc-syspro/contracts/crm";
import { cn, formatDateSafe } from "@/lib/utils";

type Props = {
  tasks: CrmTask[];
  newTaskTitle: string;
  setNewTaskTitle: (v: string) => void;
  newTaskDueDate: string;
  setNewTaskDueDate: (v: string) => void;
  isCreatingTask: boolean;
  onCreateTask: () => void;
  onToggleTaskStatus: (task: CrmTask) => void;
  onDeleteTask: (taskId: string) => void;
};

export function SheetTarefasTab({
  tasks,
  newTaskTitle,
  setNewTaskTitle,
  newTaskDueDate,
  setNewTaskDueDate,
  isCreatingTask,
  onCreateTask,
  onToggleTaskStatus,
  onDeleteTask,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-3 p-4 rounded-xl border border-border/60 bg-muted/10">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Agendar Nova Tarefa</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Ex.: Enviar proposta revisada" className="h-9" />
          <Input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className="h-9 w-auto text-xs" />
          <Button type="button" onClick={onCreateTask} disabled={isCreatingTask || !newTaskTitle.trim()} size="sm" className="h-9 gap-1">
            <Plus className="h-3.5 w-3.5" /> Agendar
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tarefas Pendentes & Concluídas</p>
        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-xs text-muted-foreground">
            Nenhuma tarefa agendada para este lead.
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const isCompleted = task.status === "COMPLETED";
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-start justify-between gap-3 p-3 rounded-lg border border-border/60 transition-colors bg-muted/5",
                    isCompleted && "opacity-60 bg-muted/10",
                  )}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Button type="button" variant="ghost" size="sm" onClick={() => onToggleTaskStatus(task)} className="h-5 w-5 p-0 rounded mt-0.5 hover:bg-muted">
                      {isCompleted ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <div className="min-w-0">
                      <p className={cn("text-xs font-medium text-foreground truncate", isCompleted && "line-through text-muted-foreground")}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Vence em: {formatDateSafe(task.dueDate)}
                        </span>
                        {task.assigneeName && <span>Responsável: {task.assigneeName}</span>}
                      </div>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onDeleteTask(task.id)} className="h-7 w-7 p-0 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
