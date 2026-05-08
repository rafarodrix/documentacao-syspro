import { Injectable } from '@nestjs/common'
import { z } from 'zod'
import { TrpcService } from '../trpc/trpc.service'
import { ContactsService } from './contacts.service'
import { createContactSchema, updateContactSchema, contactListQuerySchema } from '@dosc-syspro/contracts/contact'

@Injectable()
export class ContactsRouter {
  public router!: ReturnType<typeof this.createRouter>

  constructor(
    private readonly trpc: TrpcService,
    private readonly contactsService: ContactsService,
  ) {
    this.router = this.createRouter()
  }

  private createRouter() {
    return this.trpc.router({
      list: this.trpc.publicProcedure
        .input(contactListQuerySchema)
        .query(({ input, ctx }) =>
          this.contactsService.getContacts(input, ctx.headers),
        ),

      getUnlinked: this.trpc.publicProcedure
        .query(({ ctx }) =>
          this.contactsService.getUnlinkedContacts(ctx.headers),
        ),

      getStats: this.trpc.publicProcedure
        .query(({ ctx }) =>
          this.contactsService.getContactStats(ctx.headers),
        ),

      getOne: this.trpc.publicProcedure
        .input(z.object({ id: z.string() }))
        .query(({ input, ctx }) =>
          this.contactsService.getContactById(input.id, ctx.headers),
        ),

      create: this.trpc.publicProcedure
        .input(createContactSchema)
        .mutation(({ input, ctx }) =>
          this.contactsService.createContact(input, ctx.headers),
        ),

      update: this.trpc.publicProcedure
        .input(z.object({ id: z.string(), data: updateContactSchema }))
        .mutation(({ input, ctx }) =>
          this.contactsService.updateContact(input.id, input.data, ctx.headers),
        ),

      link: this.trpc.publicProcedure
        .input(z.object({ id: z.string(), companyId: z.string() }))
        .mutation(({ input, ctx }) =>
          this.contactsService.linkContactToCompany(input.id, input.companyId, ctx.headers),
        ),

      remove: this.trpc.publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ input, ctx }) =>
          this.contactsService.deleteContact(input.id, ctx.headers),
        ),

      sync: this.trpc.publicProcedure
        .input(z.object({ instanceName: z.string().optional() }))
        .mutation(({ input, ctx }) =>
          this.contactsService.syncFromIntegration(input.instanceName, ctx.headers),
        ),
    })
  }
}
