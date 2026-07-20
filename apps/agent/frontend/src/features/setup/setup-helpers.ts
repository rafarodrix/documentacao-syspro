import type { AgentSetupViewModel, SetupStepView } from "../../types/agent-ui";
import { Route, normalizeRoute } from "../../types/route";

const bootstrapFlowLabels: Record<string, string> = {
  pending_link: "pronto para bootstrap tecnico e aguardando vinculo no portal",
  pending_link_bootstrapped: "instalacao concluida e aguardando vinculo no portal",
  host_bootstrap_required: "host vinculado sem credencial ativa",
  token_invalid: "credencial do host invalida ou expirada",
  linked_host_detected: "host vinculado detectado",
};

export function formatRustDeskId(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length === 9) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
  if (digits.length >= 6) return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  return id;
}

export function formatSetupCopy(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return "";

  return Object.entries(bootstrapFlowLabels).reduce(
    (text, [flow, label]) => text.replaceAll(flow, label),
    raw,
  );
}

export function resolveStartupRoute(target: string | undefined, status: AgentSetupViewModel): Route {
  if (!status.complete) return "agent://setup";
  return target === "agent://setup" ? "agent://support" : normalizeRoute(target);
}

export function getSetupHeadline(
  status: AgentSetupViewModel,
  activeStep: SetupStepView | null | undefined,
  overallState: "complete" | "error" | "running" | "idle",
): string {
  if (overallState === "complete") return "Historico do provisionamento";
  return displaySetupStepLabel(activeStep?.key, activeStep?.label ?? status.stage);
}

export function getSetupDetail(
  status: AgentSetupViewModel,
  activeStep: SetupStepView | null | undefined,
  overallState: "complete" | "error" | "running" | "idle",
): string {
  if (overallState === "complete") return "Instalacao concluida. Revise as etapas executadas neste dispositivo.";
  return formatSetupCopy(activeStep?.detail || status.summary || "Aguardando proxima etapa do onboarding.");
}

export function displaySetupStepLabel(stepKey: string | null | undefined, fallback: string): string {
  const labels: Record<string, string> = {
    identity: "Registro do dispositivo",
    portal: "Conexao com a Trilink",
    discover: "Identificacao da maquina",
    link: "Vinculo com a empresa",
    rustdesk: "Configuracao do acesso remoto",
    sync: "Validacao do acesso remoto",
  };

  return labels[stepKey ?? ""] ?? fallback;
}

export function getSetupHint(
  status: AgentSetupViewModel,
  activeStep: SetupStepView | null | undefined,
): string {
  const combined = [
    status.stage,
    status.summary,
    status.lastError,
    ...status.steps.map((step: SetupStepView) => step.detail),
  ]
    .join(" ")
    .toLowerCase();

  if (
    combined.includes("pending_link_bootstrapped") ||
    combined.includes("acesso remoto preparado nesta maquina") ||
    combined.includes("instalacao concluida. falta apenas associar")
  ) {
    return "O acesso remoto ja foi preparado nesta maquina. Falta apenas concluir o vinculo empresarial no portal para liberar a validacao final.";
  }
  if (activeStep?.key === "link" || combined.includes("pending_link") || combined.includes("aguardando vincul")) {
    return "O agente ja pode preparar o acesso remoto antes do vinculo. O portal ainda precisa associar esta maquina a uma empresa.";
  }
  if (combined.includes("host_bootstrap_required")) {
    return "O host ja foi identificado, mas ainda nao recebeu uma credencial valida para concluir o bootstrap.";
  }
  if (combined.includes("token_invalid")) {
    return "A credencial remota anterior foi invalidada. O portal precisa emitir um novo bootstrap para este host.";
  }
  if (activeStep?.key === "rustdesk") {
    return "O portal ja autorizou a maquina, mas o RustDesk ainda nao foi detectado nesta estacao.";
  }
  return "";
}

export function stepBadge(status: SetupStepView["status"]) {
  if (status === "complete") return "Concluido";
  if (status === "error") return "Erro";
  return "Pendente";
}
