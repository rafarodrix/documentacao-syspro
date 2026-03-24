export type ConversationChannel = "WHATSAPP" | "EMAIL" | "PORTAL" | "PHONE";

export type ConversationStatus =
  | "NEW"
  | "UNASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_CUSTOMER"
  | "RESOLVED"
  | "ARCHIVED";

export type ConversationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type ConversationParticipantKind = "COMPANY_CONTACT" | "USER" | "EXTERNAL";

export type ConversationMessageDirection = "INBOUND" | "OUTBOUND" | "INTERNAL";

export type ConversationMessageType =
  | "TEXT"
  | "IMAGE"
  | "DOCUMENT"
  | "AUDIO"
  | "VIDEO"
  | "SYSTEM_EVENT";

export type ConversationAssignmentStatus = "ACTIVE" | "TRANSFERRED" | "RELEASED";

export type ConversationQueueKey =
  | "new"
  | "unassigned"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "archived";

export type ConversationContactRef = {
  id: string;
  companyId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  status: "PENDING_LINK" | "LINKED" | "ARCHIVED";
  source: "MANUAL" | "WHATSAPP" | "IMPORT";
};

export type ConversationSummary = {
  id: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  priority: ConversationPriority;
  companyId: string | null;
  companyName: string | null;
  contactId: string | null;
  contactName: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  ticketId: string | null;
  ticketNumber: string | null;
  subject: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationDetails = {
  conversation: ConversationSummary & {
    externalThreadId: string | null;
    connectionId: string | null;
    metadata: Record<string, unknown> | null;
  };
  contact: ConversationContactRef | null;
  messages: ConversationMessage[];
  assignments: ConversationAssignment[];
  queue: ConversationQueueState | null;
};

export type ConversationMessage = {
  id: string;
  conversationId: string;
  direction: ConversationMessageDirection;
  type: ConversationMessageType;
  authorKind: ConversationParticipantKind;
  authorUserId: string | null;
  authorContactId: string | null;
  externalMessageId: string | null;
  body: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  metadata: Record<string, unknown> | null;
  sentAt: string | null;
  createdAt: string;
};

export type ConversationQueueState = {
  id: string;
  queueKey: ConversationQueueKey;
  position: number;
  waitingSince: string;
  slaDeadlineAt: string | null;
  assignedTeam: string | null;
};

export type ConversationAssignment = {
  id: string;
  conversationId: string;
  assignedUserId: string;
  assignedUserName: string | null;
  assignedByUserId: string | null;
  assignedByUserName: string | null;
  status: ConversationAssignmentStatus;
  reason: string | null;
  startedAt: string;
  endedAt: string | null;
};

export type ConversationQueueBoard = {
  queueCounts: Record<ConversationQueueKey, number>;
  items: ConversationSummary[];
};

export type StartConversationInput = {
  channel: ConversationChannel;
  companyId?: string;
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  subject?: string;
  priority?: ConversationPriority;
  initialMessage?: string;
};

export type SendConversationMessageInput = {
  conversationId: string;
  direction: ConversationMessageDirection;
  type: ConversationMessageType;
  body?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  metadata?: Record<string, unknown>;
};

export type AssignConversationInput = {
  conversationId: string;
  assignedUserId: string;
  reason?: string;
};

export type UpdateConversationStatusInput = {
  conversationId: string;
  status: ConversationStatus;
  reason?: string;
};
