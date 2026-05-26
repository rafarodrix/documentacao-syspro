import { formatDate, formatDateTimeSafe } from "@/lib/date";
import { markdownToPlainText } from "@dosc-syspro/tickets-domain";
import type { TicketModuleStatus } from "@dosc-syspro/contracts/ticket";
import type { TicketArticleItem, TicketDetailsItem } from "./ticket-view.types";

export function isTicketClosed(status?: string | null) {
  const normalized = (status || "").toLowerCase();
  return ["resolvido", "resolved", "fechado", "arquivado", "archived", "finalizado"].some((item) =>
    normalized.includes(item),
  );
}

export function withTechnicalResourceArticles(
  articles: TicketArticleItem[],
  ticket: TicketDetailsItem,
): TicketArticleItem[] {
  const resources = [
    { id: "database", label: "Base de dados", url: ticket.operations?.databaseUrl },
    { id: "video", label: "Video explicativo", url: ticket.operations?.developmentVideoUrl },
  ].filter((resource): resource is { id: string; label: string; url: string } => Boolean(resource.url));

  if (!resources.length) return articles;

  const existingTechnicalResourceArticles = articles.filter((article) => isTechnicalResourceArticle(article));
  if (existingTechnicalResourceArticles.some((article) => article.messageType !== "SYSTEM_EVENT")) {
    return articles;
  }

  const cleanedArticles = articles.filter((article) => !isTechnicalResourceArticle(article));
  const openingArticleIndex = findOpeningArticleIndex(cleanedArticles);

  if (openingArticleIndex === -1) return cleanedArticles;

  const openingArticle = cleanedArticles[openingArticleIndex];
  const existingResourcesArticle = cleanedArticles.find((article) => article.id === "opening-technical-resources");
  const missingResources = resources.filter(
    (resource) =>
      !openingArticle.body.includes(resource.url) && !existingResourcesArticle?.body.includes(resource.url),
  );

  if (!missingResources.length) return cleanedArticles;

  const resourceMarkdown = missingResources
    .map((resource) => [`### ${resource.label}`, `[${resource.url}](${resource.url})`].join("\n"))
    .join("\n\n");

  const resourceBody = ["## Recursos tecnicos para abertura do ticket", resourceMarkdown].join("\n\n");

  const nextArticles = [...cleanedArticles];
  nextArticles.splice(openingArticleIndex + 1, 0, {
    id: "opening-technical-resources",
    from: "Recursos internos",
    body: resourceBody,
    createdAt: openingArticle.createdAt,
    sender: "Agent",
    isInternal: true,
    messageType: "TEXT",
  });

  return nextArticles.filter((article, index, currentArticles) => {
    if (article.id !== "opening-technical-resources") return true;
    return currentArticles.findIndex((candidate) => candidate.id === "opening-technical-resources") === index;
  });
}

export function findOpeningArticleIndex(articles: TicketArticleItem[]) {
  let bestIndex = -1;
  let bestTimestamp = Number.POSITIVE_INFINITY;

  articles.forEach((article, index) => {
    if (article.messageType === "SYSTEM_EVENT" || isTechnicalResourceArticle(article) || !markdownToPlainText(article.body).trim()) {
      return;
    }
    const timestamp = parsePtBrDateTime(article.createdAt);
    if (timestamp < bestTimestamp) {
      bestTimestamp = timestamp;
      bestIndex = index;
    }
  });

  return bestIndex;
}

export function parsePtBrDateTime(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:,\s*(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return Number.POSITIVE_INFINITY;
  const [, day, month, year, hour = "00", minute = "00", second = "00"] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)).getTime();
}

export function isTechnicalResourceArticle(article: TicketArticleItem) {
  const body = article.body.toLowerCase();
  return body.includes("recurso tecnico") || body.includes("recurso de diagn");
}


export function normalizeStatusValue(status?: string | null): TicketModuleStatus | null {
  const normalized = (status || "").trim().toLowerCase();
  if (normalized === "novo" || normalized === "new") return "NEW";
  if (normalized === "sem dono" || normalized === "unassigned") return "UNASSIGNED";
  if (normalized === "triagem" || normalized === "triage") return "TRIAGE";
  if (normalized === "em andamento" || normalized === "em desenvolvimento" || normalized === "in_progress") return "IN_PROGRESS";
  if (normalized === "em teste" || normalized === "em testes" || normalized === "testing") return "TESTING";
  if (normalized === "pendente cliente" || normalized === "waiting_customer") return "WAITING_CUSTOMER";
  if (normalized === "aguardando interno" || normalized === "waiting_internal") return "WAITING_INTERNAL";
  if (normalized === "resolvido" || normalized === "resolved") return "RESOLVED";
  if (normalized === "arquivado" || normalized === "archived") return "ARCHIVED";
  return null;
}

export function formatTicketDate(value?: string | null, fallback = "N/D") {
  return formatDate(value, fallback);
}

export function formatTicketDateTime(value?: string | null, fallback = "N/D") {
  return formatDateTimeSafe(value, fallback);
}

export function formatSlaDelta(minutes?: number) {
  if (typeof minutes !== "number") return "Sem prazo";
  const sign = minutes < 0 ? "-" : "";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  return `${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}h`;
}
