export interface ChatwootClientPort {
  updateContact(context: any, chatwootContactId: string, data: any): Promise<any>;
  updateConversationCustomAttributes(context: any, conversationId: string, data: any): Promise<any>;
}

export interface EvolutionClientPort {
  // metodos a serem adicionados conforme a necessidade das extracoes
}
