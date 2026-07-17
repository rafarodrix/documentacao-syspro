export interface ChatwootClientPort {
  updateContact(context: any, chatwootContactId: string, data: any): Promise<any>;
  updateConversationCustomAttributes(context: any, conversationId: string, data: any): Promise<any>;
}

export interface EvolutionClientPort {
  fetchContacts(context: any): Promise<any[]>;
}

export interface IntegrationContextPort {
  resolveByConnectionKey(connectionKey: string): Promise<any>;
  getDefaultContext(): Promise<any>;
}
