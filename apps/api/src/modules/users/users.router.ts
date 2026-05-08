import { Injectable } from '@nestjs/common';
import { TrpcService } from '../trpc/trpc.service';
import { UsersService } from './users.service';
import { z } from 'zod';
import {
  createUserSchema,
  updateUserSchema,
  updateCurrentUserProfileSchema,
} from '@dosc-syspro/contracts/user';

@Injectable()
export class UsersRouter {
  public router!: ReturnType<typeof this.createRouter>;

  constructor(
    private readonly trpc: TrpcService,
    private readonly usersService: UsersService,
  ) {
    this.router = this.createRouter();
  }

  private createRouter() {
    return this.trpc.router({
      list: this.trpc.publicProcedure
        .input(
          z.object({
            search: z.string().optional(),
            role: z.string().optional(),
          }),
        )
        .query(({ input, ctx }) => {
          return this.usersService.findAll(input, ctx.headers);
        }),

      checkEmail: this.trpc.publicProcedure
        .input(z.object({ email: z.string() }))
        .query(({ input, ctx }) => {
          return this.usersService.checkEmailAvailability(input.email, ctx.headers);
        }),

      getOne: this.trpc.publicProcedure
        .input(z.object({ id: z.string() }))
        .query(({ input, ctx }) => {
          return this.usersService.findOne(input.id, ctx.headers);
        }),

      getCurrentProfile: this.trpc.publicProcedure
        .query(({ ctx }) => {
          return this.usersService.getCurrentProfile(ctx.headers);
        }),

      getChatwootSsoLink: this.trpc.publicProcedure
        .query(({ ctx }) => {
          return this.usersService.getChatwootSsoLinkForCurrentUser(ctx.headers);
        }),

      create: this.trpc.publicProcedure
        .input(createUserSchema)
        .mutation(({ input, ctx }) => {
          return this.usersService.create(input, ctx.headers);
        }),

      update: this.trpc.publicProcedure
        .input(
          z.object({
            id: z.string(),
            data: updateUserSchema,
          }),
        )
        .mutation(({ input, ctx }) => {
          return this.usersService.update(input.id, input.data, ctx.headers);
        }),

      updateCurrentProfile: this.trpc.publicProcedure
        .input(updateCurrentUserProfileSchema)
        .mutation(({ input, ctx }) => {
          return this.usersService.updateCurrentProfile(input, ctx.headers);
        }),

      remove: this.trpc.publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ input, ctx }) => {
          return this.usersService.remove(input.id, ctx.headers);
        }),
    });
  }
}
