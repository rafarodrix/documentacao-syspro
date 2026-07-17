export interface ChatwootClientPort {
  updateContact(context: any, chatwootContactId: number, data: any): Promise<any>;
  updateConversationCustomAttributes(context: any, conversationId: number, data: any): Promise<any>;
  searchContacts(context: any, query: string): Promise<any[]>;
  createContact(context: any, data: any): Promise<any>;
}

export interface EvolutionClientPort {
  searchContact(instanceName: string, number: string): Promise<any>;
}
