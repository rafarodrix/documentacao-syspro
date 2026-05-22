"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS,
  type ChatwootBehaviorSettings,
} from "@dosc-syspro/contracts/chatwoot";
import { Badge, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@dosc-syspro/ui";
import { BehaviorToggle, FormField, MessageTemplateField, SettingsGroup } from "../integration-form-primitives";

export function ChatwootCsatSection({
  behavior,
  setBehavior,
}: {
  behavior: ChatwootBehaviorSettings;
  setBehavior: Dispatch<SetStateAction<ChatwootBehaviorSettings>>;
}) {
  const csatCanReopen = behavior.csatEnabled && behavior.csatReopenOnLowScore;
  const csatRequestLength = behavior.csatRequestMessage.trim().length;
  const csatThankYouLength = behavior.csatThankYouMessage.trim().length;
  const csatInvalidReplyRetryLength = behavior.csatInvalidReplyRetryMessage.trim().length;
  const csatInvalidReplyFinalLength = behavior.csatInvalidReplyFinalMessage.trim().length;

  return (
    <SettingsGroup
      title="CSAT no WhatsApp"
      description="Pesquisa automatica no fechamento da conversa, com tratamento de nota e tentativas invalidas."
    >
      <div className="grid min-w-0 gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">1 Pessimo</Badge>
          <Badge variant="outline">2 Ruim</Badge>
          <Badge variant="outline">3 Regular</Badge>
          <Badge variant="outline">4 Bom</Badge>
          <Badge variant="outline">5 Excelente</Badge>
        </div>

        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          <BehaviorToggle
            id="csatEnabled"
            label="Habilitar CSAT automatico"
            description="Dispara avaliacao no encerramento conforme a politica de status."
            checked={behavior.csatEnabled}
            onCheckedChange={(checked) => setBehavior((prev) => ({ ...prev, csatEnabled: checked }))}
          />
          <BehaviorToggle
            id="sendCsatThankYouMessage"
            label="Enviar mensagem apos a nota"
            description="Confirma ao cliente quando a resposta valida for recebida."
            checked={behavior.sendCsatThankYouMessage}
            onCheckedChange={(checked) => setBehavior((prev) => ({ ...prev, sendCsatThankYouMessage: checked }))}
          />
          <BehaviorToggle
            id="csatReopenOnLowScore"
            label="Reabrir conversa em nota baixa"
            description="Reabre automaticamente quando a nota ficar igual ou abaixo do limite."
            checked={behavior.csatReopenOnLowScore}
            onCheckedChange={(checked) => setBehavior((prev) => ({ ...prev, csatReopenOnLowScore: checked }))}
          />
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <FormField
            id="csatTriggerStatus"
            label="Disparar CSAT quando status for"
            description="Use apenas resolved se archived for usado por rotina tecnica."
          >
            <Select
              value={behavior.csatTriggerStatus}
              onValueChange={(value) =>
                setBehavior((prev) => ({
                  ...prev,
                  csatTriggerStatus: value as ChatwootBehaviorSettings["csatTriggerStatus"],
                }))
              }
              disabled={!behavior.csatEnabled}
            >
              <SelectTrigger id="csatTriggerStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resolved_or_archived">Resolved ou archived</SelectItem>
                <SelectItem value="resolved_only">Apenas resolved</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            id="csatLowScoreThreshold"
            label="Limite de nota baixa"
            description={
              csatCanReopen
                ? "Notas ate esse valor reabrem a conversa."
                : "Disponivel apenas com CSAT ativo e reabertura por nota baixa habilitada."
            }
          >
            <Input
              id="csatLowScoreThreshold"
              type="number"
              min={1}
              max={5}
              value={behavior.csatLowScoreThreshold}
              disabled={!csatCanReopen}
              onChange={(event) =>
                setBehavior((prev) => ({
                  ...prev,
                  csatLowScoreThreshold: Number(event.target.value || prev.csatLowScoreThreshold),
                }))
              }
            />
          </FormField>

          <FormField
            id="csatPendingTimeoutHours"
            label="Timeout do CSAT (horas)"
            description="Avaliacao pendente e encerrada ao fim desse prazo."
          >
            <Input
              id="csatPendingTimeoutHours"
              type="number"
              min={1}
              max={168}
              value={behavior.csatPendingTimeoutHours}
              onChange={(event) =>
                setBehavior((prev) => ({
                  ...prev,
                  csatPendingTimeoutHours: Number(event.target.value || prev.csatPendingTimeoutHours),
                }))
              }
            />
          </FormField>

          <FormField
            id="csatInvalidReplyMaxAttempts"
            label="Tentativas de resposta invalida"
            description="Limite antes de encerrar a avaliacao e tratar a proxima mensagem como novo atendimento."
          >
            <Input
              id="csatInvalidReplyMaxAttempts"
              type="number"
              min={1}
              max={10}
              value={behavior.csatInvalidReplyMaxAttempts}
              disabled={!behavior.csatEnabled}
              onChange={(event) =>
                setBehavior((prev) => ({
                  ...prev,
                  csatInvalidReplyMaxAttempts: Number(event.target.value || prev.csatInvalidReplyMaxAttempts),
                }))
              }
            />
          </FormField>
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <MessageTemplateField
            id="csatRequestMessage"
            label="Mensagem de solicitacao"
            counter={`${csatRequestLength}/2000`}
            description="Enviada logo apos a conversa ser resolvida."
            onRestore={() =>
              setBehavior((prev) => ({
                ...prev,
                csatRequestMessage: DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS.csatRequestMessage,
              }))
            }
          >
            <Textarea
              id="csatRequestMessage"
              className="min-h-32"
              value={behavior.csatRequestMessage}
              onChange={(event) => setBehavior((prev) => ({ ...prev, csatRequestMessage: event.target.value }))}
            />
          </MessageTemplateField>
          <MessageTemplateField
            id="csatThankYouMessage"
            label="Mensagem pos-avaliacao"
            counter={`${csatThankYouLength}/1000`}
            description={
              behavior.sendCsatThankYouMessage
                ? "Enviada depois que o cliente responde com uma nota valida."
                : "Ative a confirmacao para enviar essa mensagem final."
            }
            onRestore={() =>
              setBehavior((prev) => ({
                ...prev,
                csatThankYouMessage: DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS.csatThankYouMessage,
              }))
            }
          >
            <Textarea
              id="csatThankYouMessage"
              className="min-h-32"
              value={behavior.csatThankYouMessage}
              disabled={!behavior.sendCsatThankYouMessage}
              onChange={(event) => setBehavior((prev) => ({ ...prev, csatThankYouMessage: event.target.value }))}
            />
          </MessageTemplateField>
          <MessageTemplateField
            id="csatInvalidReplyRetryMessage"
            label="Mensagem para resposta invalida"
            counter={`${csatInvalidReplyRetryLength}/1000`}
            description="Usada nas tentativas intermediarias; o contador e acrescentado pelo backend."
            onRestore={() =>
              setBehavior((prev) => ({
                ...prev,
                csatInvalidReplyRetryMessage: DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS.csatInvalidReplyRetryMessage,
              }))
            }
          >
            <Textarea
              id="csatInvalidReplyRetryMessage"
              className="min-h-28"
              value={behavior.csatInvalidReplyRetryMessage}
              disabled={!behavior.csatEnabled}
              onChange={(event) => setBehavior((prev) => ({ ...prev, csatInvalidReplyRetryMessage: event.target.value }))}
            />
          </MessageTemplateField>
          <MessageTemplateField
            id="csatInvalidReplyFinalMessage"
            label="Mensagem ao encerrar a avaliacao"
            counter={`${csatInvalidReplyFinalLength}/1000`}
            description="Enviada quando o limite e atingido e a proxima mensagem passa a abrir um novo atendimento."
            onRestore={() =>
              setBehavior((prev) => ({
                ...prev,
                csatInvalidReplyFinalMessage: DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS.csatInvalidReplyFinalMessage,
              }))
            }
          >
            <Textarea
              id="csatInvalidReplyFinalMessage"
              className="min-h-28"
              value={behavior.csatInvalidReplyFinalMessage}
              disabled={!behavior.csatEnabled}
              onChange={(event) => setBehavior((prev) => ({ ...prev, csatInvalidReplyFinalMessage: event.target.value }))}
            />
          </MessageTemplateField>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
          Fluxo atual:
          <span className="ml-1 text-foreground">
            resposta publica do agente
            {" -> "}resolver conversa
            {behavior.csatTriggerStatus === "resolved_only" ? " (apenas status resolved)" : " (status resolved ou archived)"}
            {" -> "}enviar CSAT
            {" -> "}aguardar resposta por ate {behavior.csatPendingTimeoutHours}h
            {" -> "}cobrar nota invalida ate {behavior.csatInvalidReplyMaxAttempts}x
            {behavior.sendCsatThankYouMessage ? " -> confirmar recebimento da nota" : ""}
            {csatCanReopen ? ` -> reabrir se nota <= ${behavior.csatLowScoreThreshold}` : ""}
            {" -> "}nova conversa apos esgotar tentativas
          </span>
        </div>
      </div>
    </SettingsGroup>
  );
}
