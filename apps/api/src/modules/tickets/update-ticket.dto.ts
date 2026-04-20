import type {
  TicketModulePriority,
  TicketModuleStatus,
  TicketModuleUpdateRequest,
} from '@dosc-syspro/contracts/ticket';

export class UpdateTicketDto implements TicketModuleUpdateRequest {
  status?: TicketModuleStatus;

  priority?: TicketModulePriority;

  assignedUserId?: string;

  resolutionSummary?: string;

  resolutionVideoUrl?: string;

  releaseType?: string;

  releaseTitle?: string;

  releaseModule?: string;

  publishToReleases?: boolean;

  category?: string;

  module?: string;

  environment?: string;

  team?: string;

  note?: string;
}
