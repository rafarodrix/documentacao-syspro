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

export type ConversationEntryPoint = "INBOUND" | "OUTBOUND" | "CAMPAIGN" | "SYSTEM";

export type ConversationMessageDirection = "INBOUND" | "OUTBOUND" | "INTERNAL";

export type ConversationMessageType =
  | "TEXT"
  | "IMAGE"
  | "DOCUMENT"
  | "AUDIO"
  | "VIDEO"
  | "SYSTEM_EVENT";

export type ConversationAssignmentStatus = "ACTIVE" | "TRANSFERRED" | "RELEASED";
export type ConversationAssignmentType = "AUTO" | "MANUAL" | "TRANSFER";

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
  entryPoint: ConversationEntryPoint;
  ticketId: string | null;
  ticketNumber: string | null;
  subject: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationDetails = {
  conversation: ConversationSummary & {
    externalThreadId: string | null;
    connectionId: string | null;
    contactPhoneSnapshot: string | null;
    contactWhatsappSnapshot: string | null;
    contactNameSnapshot: string | null;
    resolvedByUserId: string | null;
    resolvedByUserName: string | null;
    closedAt: string | null;
    metadata: Record<string, unknown> | null;
  };
  contact: ConversationContactRef | null;
  messages: ConversationMessage[];
  assignments: ConversationAssignment[];
  currentQueue: ConversationQueueState | null;
  queueHistory: ConversationQueueEvent[];
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
  replyToMessageId: string | null;
  quotedExternalMessageId: string | null;
  body: string | null;
  mediaUrl: string | null;
  storageKey: string | null;
  mediaMimeType: string | null;
  fileSize: number | null;
  checksum: string | null;
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  providerStatus: string | null;
  providerError: string | null;
  retryCount: number;
  metadata: Record<string, unknown> | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
};

export type ConversationQueueState = {
  id: string;
  queueKey: ConversationQueueKey;
  position: number;
  waitingSince: string;
  slaDeadlineAt: string | null;
  breachedAt: string | null;
  slaPolicyId: string | null;
  assignedTeam: string | null;
};

export type ConversationQueueEvent = {
  id: string;
  conversationId: string;
  queueKey: ConversationQueueKey;
  enteredAt: string;
  leftAt: string | null;
  position: number | null;
  assignedTeam: string | null;
  slaDeadlineAt: string | null;
  breachedAt: string | null;
  metadata: Record<string, unknown> | null;
};

export type ConversationAssignment = {
  id: string;
  conversationId: string;
  assignedUserId: string;
  assignedUserName: string | null;
  assignmentType: ConversationAssignmentType;
  assignedByUserId: string | null;
  assignedByUserName: string | null;
  transferFromUserId: string | null;
  transferFromUserName: string | null;
  status: ConversationAssignmentStatus;
  reason: string | null;
  startedAt: string;
  acceptedAt: string | null;
  declinedAt: string | null;
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
  entryPoint?: ConversationEntryPoint;
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
  assignmentType?: ConversationAssignmentType;
  reason?: string;
};

export type UpdateConversationStatusInput = {
  conversationId: string;
  status: ConversationStatus;
  reason?: string;
};
