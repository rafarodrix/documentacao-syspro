import { Body, Controller, Get, Headers, Param, Post, Put, Query } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { ChatwootCompanyContextLinkSource } from '@prisma/client';
import { ChatwootConversationContextService } from './chatwoot-conversation-context.service';

type CompanyContextBody = {
  companyId?: string;
  accountId?: string;
  contactId?: string | null;
  portalContactId?: string;
  linkSource?: ChatwootCompanyContextLinkSource;
};

@Controller('chatwoot/conversations')
export class ChatwootConversationContextController {
  constructor(private readonly contexts: ChatwootConversationContextService) {}

  @Put(':conversationId/company-context')
  async bind(
    @Param('conversationId') conversationId: string,
    @Body() body: CompanyContextBody,
    @Headers() headers: IncomingHttpHeaders,
  ) {
    return this.contexts.bind({
      chatwootConversationId: conversationId,
      chatwootAccountId: String(body?.accountId ?? ''),
      chatwootContactId: body?.contactId,
      portalContactId: String(body?.portalContactId ?? ''),
      companyId: String(body?.companyId ?? ''),
      linkSource: body?.linkSource,
    }, headers);
  }

  @Post(':conversationId/company-context/retry')
  async retry(
    @Param('conversationId') conversationId: string,
    @Body() body: Pick<CompanyContextBody, 'accountId'>,
    @Headers() headers: IncomingHttpHeaders,
  ) {
    return this.contexts.retry({
      chatwootConversationId: conversationId,
      chatwootAccountId: String(body?.accountId ?? ''),
    }, headers);
  }

  @Get(':conversationId/workspace')
  async workspace(
    @Param('conversationId') conversationId: string,
    @Query('accountId') accountId: string,
    @Headers() headers: IncomingHttpHeaders,
  ) {
    return this.contexts.getWorkspace({ chatwootConversationId: conversationId, chatwootAccountId: String(accountId ?? '') }, headers);
  }
}
