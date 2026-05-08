import type { CompanyOption } from "@dosc-syspro/contracts/company";
import type { ContactOption } from "@dosc-syspro/contracts/contact";
import type { TicketModuleSettings } from "@dosc-syspro/contracts/ticket";
import type { TicketListItem } from "@/features/tickets/domain/ticket-model";
import type { RemotePlatformDirectory } from "@/features/remote/domain/remote-host.types";

// ──────────────────────────────────────────────────────
// Chatwoot context (received from iframe parent)
// ──────────────────────────────────────────────────────

export type ChatwootAppContext = {
  conversation: {
    id?: number | string | null;
    account_id?: number | string | null;
    status?: string | null;
    custom_attributes?: Record<string, unknown> | null;
  } | null;
  contact: {
    id?: number | string | null;
    name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    custom_attributes?: Record<string, unknown> | null;
  } | null;
  currentAgent: {
    id?: number | string | null;
    name?: string | null;
    email?: string | null;
  } | null;
};

// ──────────────────────────────────────────────────────
// Internal domain types
// ──────────────────────────────────────────────────────

export type TicketListEntry = Pick<
  TicketListItem,
  "id" | "number" | "title" | "status" | "statusLabel" | "createdAt" | "updatedAt" | "customer"
>;

type RemoteHostDirectoryItem = RemotePlatformDirectory["items"][number];

export type RemoteHostEntry = Pick<
  RemoteHostDirectoryItem,
  "id" | "name" | "productStatus" | "operationalStatus" | "companyId" | "companyName"
> & {
  agent: Pick<RemoteHostDirectoryItem["agent"], "rustdeskId" | "lastHeartbeatAt">;
};

export type ContactLookupEntry = ContactOption;
export type ContactCompanyEntry = NonNullable<ContactLookupEntry["companies"]>[number];

export type TicketPriorityOption = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type EmbeddedTicketFormState = {
  title: string;
  description: string;
  priorityValue: string;
  team: "SUPORTE" | "DESENVOLVIMENTO";
  category: string;
  module: string;
};

export type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

// ──────────────────────────────────────────────────────
// Resolved context (derived from ChatwootAppContext)
// ──────────────────────────────────────────────────────

export type ResolvedDashboardContext = {
  companyId: string;
  companyName: string;
  hostId: string;
  rustdeskId: string;
  ticketNumber: string;
  contactName: string;
  customerEmail: string;
  customerPhone: string;
  conversationId: string;
  contactId: string;
  accountId: string;
  currentAgentName: string;
  ticketHref: string;
  infrastructureHostsHref: string;
};

// ──────────────────────────────────────────────────────
// Dashboard shared state shape (passed via context)
// ──────────────────────────────────────────────────────

export type ChatwootDashboardState = {
  // Context
  status: "loading" | "ready" | "empty";
  resolved: ResolvedDashboardContext;
  effectiveContactName: string;
  ticketSettings: TicketModuleSettings;

  // Tickets
  latestTickets: TicketListEntry[];
  isLoadingTickets: boolean;
  ticketError: string | null;
  showEmbeddedTicketForm: boolean;
  embeddedTicketForm: EmbeddedTicketFormState;
  isSubmittingEmbeddedTicket: boolean;
  embeddedTicketFeedback: FeedbackState;
  filteredCategories: TicketModuleSettings["categories"];
  matchedExistingTicket: TicketListEntry | null;
  hasExistingTicket: boolean;
  existingTicket: TicketListEntry;
  hasLatestCompanyTicket: boolean;
  latestCompanyTicket: TicketListEntry;
  priorityTicket: TicketListEntry | null;
  canCreateTicket: boolean;

  // Infrastructure
  companyHosts: RemoteHostEntry[];
  isLoadingHosts: boolean;
  hostError: string | null;
  startingHostId: string | null;
  isStartingSession: boolean;
  recommendedHost: RemoteHostEntry | null;
  canOpenInfrastructureHosts: boolean;

  // Company / contact binding
  portalContactMatch: ContactLookupEntry | null;
  isLoadingPortalContact: boolean;
  contactLookupError: string | null;
  contactNameDraft: string;
  isSavingContactName: boolean;
  companyOptions: CompanyOption[];
  isLoadingCompanyOptions: boolean;
  companyOptionsError: string | null;
  selectedCompanyId: string;
  selectedCompanyOption: CompanyOption | null;
  filteredCompanyOptions: CompanyOption[];
  shouldSearchCompanies: boolean;
  companySearchTerm: string;
  isBindingCompany: boolean;
  companyBindingFeedback: FeedbackState;
  primaryCompany: ContactCompanyEntry | null;
  linkedCompanies: ContactCompanyEntry[];
  contextCompanyId: string;
  contactEditHref: string;

  // Actions
  setActiveTab: (tab: string) => void;
  setTicketReloadToken: React.Dispatch<React.SetStateAction<number>>;
  setHostReloadToken: React.Dispatch<React.SetStateAction<number>>;
  setShowEmbeddedTicketForm: React.Dispatch<React.SetStateAction<boolean>>;
  setEmbeddedTicketForm: React.Dispatch<React.SetStateAction<EmbeddedTicketFormState>>;
  setEmbeddedTicketFeedback: React.Dispatch<React.SetStateAction<FeedbackState>>;
  setContactNameDraft: React.Dispatch<React.SetStateAction<string>>;
  setCompanySearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setSelectedCompanyId: React.Dispatch<React.SetStateAction<string>>;
  setCompanyBindingFeedback: React.Dispatch<React.SetStateAction<FeedbackState>>;
  setStartingHostId: React.Dispatch<React.SetStateAction<string | null>>;
  setStatus: React.Dispatch<React.SetStateAction<"loading" | "ready" | "empty">>;
  handleSelectContextCompany: (companyId: string) => void;
  handleCopySummary: () => Promise<void>;
  handleBindCompany: () => Promise<void>;
  handleSaveContactName: () => Promise<void>;
  handleEmbeddedTicketSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleStartHostSession: (host: RemoteHostEntry) => void;
  requestRefresh: () => void;
};
