import type {
  AssignConversationInput,
  ConversationDetails,
  ConversationQueueBoard,
  ConversationQueueKey,
  ConversationSummary,
  SendConversationMessageInput,
  StartConversationInput,
  UpdateConversationStatusInput,
} from "@/features/conversations/domain/model";

export interface ConversationReadRepository {
  getQueueBoard(input?: {
    queue?: ConversationQueueKey;
    search?: string;
    companyId?: string;
    assignedUserId?: string;
  }): Promise<ConversationQueueBoard>;
  getConversationDetails(conversationId: string): Promise<ConversationDetails | null>;
  listRecentConversations(input?: {
    companyId?: string;
    contactId?: string;
    limit?: number;
  }): Promise<ConversationSummary[]>;
}

export interface ConversationWriteRepository {
  startConversation(input: StartConversationInput): Promise<ConversationDetails>;
  sendMessage(input: SendConversationMessageInput): Promise<void>;
  assignConversation(input: AssignConversationInput): Promise<void>;
  updateStatus(input: UpdateConversationStatusInput): Promise<void>;
}
