import { Injectable } from '@nestjs/common';
import { TrpcService } from '../trpc/trpc.service';
import { CompaniesService } from './companies.service';
import { z } from 'zod';
import {
  companyListQuerySchema,
  companyStatusUpdateSchema,
  createCompanySchema,
} from '@dosc-syspro/contracts/company';
import { CompanySegment } from '@prisma/client';

@Injectable()
export class CompaniesRouter {
  public router!: ReturnType<typeof this.createRouter>;

  constructor(
    private readonly trpc: TrpcService,
    private readonly companiesService: CompaniesService,
  ) {
    this.router = this.createRouter();
  }

  private createRouter() {
    return this.trpc.router({
      list: this.trpc.publicProcedure
        .input(companyListQuerySchema)
        .query(({ input, ctx }) => {
          // ctx.headers já foi injetado pelo adapter
          return this.companiesService.listCompanies(input, ctx.headers);
        }),

      getAdminView: this.trpc.publicProcedure
        .query(({ ctx }) => {
          return this.companiesService.getAdminView(ctx.headers);
        }),

      lookupCompanyProfileByCnpj: this.trpc.publicProcedure
        .input(z.object({ cnpj: z.string() }))
        .query(({ input, ctx }) => {
          return this.companiesService.lookupCompanyProfileByCnpj(input.cnpj, ctx.headers);
        }),

      getOptions: this.trpc.publicProcedure
        .query(({ ctx }) => {
          return this.companiesService.getCompanyOptions(ctx.headers);
        }),

      checkSegmentAccess: this.trpc.publicProcedure
        .input(z.object({ requiredSegments: z.array(z.nativeEnum(CompanySegment)).default([]) }))
        .mutation(({ input, ctx }) => {
          return this.companiesService.canAccessByCompanySegment(input.requiredSegments, ctx.headers);
        }),

      getEditView: this.trpc.publicProcedure
        .input(z.object({ id: z.string() }))
        .query(({ input, ctx }) => {
          return this.companiesService.getCompanyEditView(input.id, ctx.headers);
        }),

      getCockpitView: this.trpc.publicProcedure
        .input(z.object({ id: z.string() }))
        .query(({ input, ctx }) => {
          return this.companiesService.getCompanyCockpitView(input.id, ctx.headers);
        }),

      create: this.trpc.publicProcedure
        .input(z.object({ data: createCompanySchema }))
        .mutation(({ input, ctx }) => {
          return this.companiesService.createCompany(input, ctx.headers);
        }),

      update: this.trpc.publicProcedure
        .input(
          z.object({
            id: z.string(),
            data: createCompanySchema,
          }),
        )
        .mutation(({ input, ctx }) => {
          return this.companiesService.updateCompany(input.id, { data: input.data }, ctx.headers);
        }),

      updateStatus: this.trpc.publicProcedure
        .input(
          z.object({
            id: z.string(),
            data: companyStatusUpdateSchema,
          }),
        )
        .mutation(({ input, ctx }) => {
          return this.companiesService.updateCompanyStatus(input.id, input.data, ctx.headers);
        }),

      remove: this.trpc.publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(({ input, ctx }) => {
          return this.companiesService.deleteCompany(input.id, ctx.headers);
        }),

      searchCompanies: this.trpc.publicProcedure
        .input(z.object({ q: z.string().optional() }))
        .query(({ input, ctx }) => {
          return this.companiesService.searchCompanies(input.q, ctx.headers);
        }),
    });
  }
}
