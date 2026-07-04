import { Injectable } from '@nestjs/common';
import type { TicketModuleSettings } from '@dosc-syspro/contracts/ticket';
import type { Prisma, Role } from '@prisma/client';
import { resolveCategoryType } from '@dosc-syspro/tickets-domain';
import type { TicketOperatorCapabilities } from './ticket-access.service';

export type TicketTeam = 'SUPORTE' | 'DESENVOLVIMENTO';

type TicketOwnerInput = {
  userId: string;
  name: string;
  role: Role;
  currentTeam: TicketTeam;
  capabilities: Pick<TicketOperatorCapabilities, 'canOwnSupportQueue' | 'canOwnDevelopmentQueue'>;
};

@Injectable()
export class TicketMetadataService {
  toRecord(metadata: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  }

  buildInitialMetadata(input: {
    metadata: unknown;
    category: string | null;
    categoryType: string | null;
    module: string | null;
    currentTeam: TicketTeam;
    assignedUserId: string | null;
    openedBy: { userId: string; name: string; email: string; role: Role };
    slaPolicyName: string | null;
    slaFirstResponseMinutes: number | null;
    slaResolutionMinutes: number | null;
    databaseUrl: string | null;
    developmentVideoUrl: string | null;
  }): Prisma.InputJsonValue {
    const baseMetadata =
      input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
        ? (input.metadata as Record<string, unknown>)
        : {};

    return {
      ...baseMetadata,
      category: input.category,
      categoryType: input.categoryType,
      module: input.module,
      currentTeam: input.currentTeam,
      currentOwnerUserId: input.assignedUserId,
      currentOwnerName: input.assignedUserId ? input.openedBy.name : null,
      currentOwnerRole: input.assignedUserId ? input.openedBy.role : null,
      openedByUserId: input.openedBy.userId,
      openedByName: input.openedBy.name,
      openedByEmail: input.openedBy.email,
      openedByRole: input.openedBy.role,
      slaPolicyName: input.slaPolicyName,
      slaFirstResponseMinutes: input.slaFirstResponseMinutes,
      slaResolutionMinutes: input.slaResolutionMinutes,
      databaseUrl: input.databaseUrl,
      developmentVideoUrl: input.developmentVideoUrl,
      supportOwnerUserId:
        input.currentTeam === 'SUPORTE' && input.assignedUserId ? input.openedBy.userId : null,
      supportOwnerName: input.currentTeam === 'SUPORTE' && input.assignedUserId ? input.openedBy.name : null,
      developmentOwnerUserId: null,
      developmentOwnerName: null,
    } as Prisma.InputJsonValue;
  }

  resolveCurrentTeam(
    metadata: Record<string, unknown>,
    capabilities: Pick<TicketOperatorCapabilities, 'canOwnSupportQueue' | 'canOwnDevelopmentQueue'>,
  ): TicketTeam {
    if (typeof metadata.currentTeam === 'string' && metadata.currentTeam.trim()) {
      const value = metadata.currentTeam.trim().toUpperCase();
      if (value === 'DESENVOLVIMENTO') return 'DESENVOLVIMENTO';
    }

    return capabilities.canOwnDevelopmentQueue && !capabilities.canOwnSupportQueue
      ? 'DESENVOLVIMENTO'
      : 'SUPORTE';
  }

  syncCategoryMetadata(
    metadata: Record<string, unknown>,
    settings: TicketModuleSettings,
    category: string | null,
    currentTeam: string | null,
  ) {
    metadata.category = category;
    metadata.categoryType = resolveCategoryType(settings, category, currentTeam);
    return metadata;
  }

  assignCurrentOwner(metadata: Record<string, unknown>, input: TicketOwnerInput) {
    metadata.currentOwnerUserId = input.userId;
    metadata.currentOwnerName = input.name;
    metadata.currentOwnerRole = input.role;
    metadata.currentTeam = input.currentTeam;

    if (input.capabilities.canOwnDevelopmentQueue && input.currentTeam === 'DESENVOLVIMENTO') {
      metadata.developmentOwnerUserId = input.userId;
      metadata.developmentOwnerName = input.name;
    }

    if (input.capabilities.canOwnSupportQueue && input.currentTeam === 'SUPORTE') {
      metadata.supportOwnerUserId = input.userId;
      metadata.supportOwnerName = input.name;
    }

    return metadata;
  }
}
