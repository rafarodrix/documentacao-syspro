import { Injectable } from '@nestjs/common';
import {
  DEFAULT_AUTOMATION_MODULE_SETTINGS,
  automationModuleSettingsSchema,
  type AutomationModuleSettings,
} from '@dosc-syspro/contracts/automation';
import {
  DEFAULT_TICKET_MODULE_SETTINGS,
  ticketModuleSettingsSchema,
  type TicketModuleSettings,
} from '@dosc-syspro/contracts/ticket';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AutomationSettingsService {
  static readonly AUTOMATIONS_SETTINGS_KEY = 'automation.module.settings';
  static readonly TICKETS_SETTINGS_KEY = 'tickets.module.settings';

  constructor(private readonly prisma: PrismaService) {}

  async readAutomationModuleSettings(): Promise<AutomationModuleSettings> {
    try {
      const automationSetting = await this.prisma.systemSetting.findUnique({
        where: { key: AutomationSettingsService.AUTOMATIONS_SETTINGS_KEY },
        select: { value: true },
      });

      if (automationSetting?.value) {
        const parsed = automationModuleSettingsSchema.safeParse(JSON.parse(automationSetting.value));
        if (parsed.success) return parsed.data;
      }
    } catch {
      // ignore and fall back
    }

    return DEFAULT_AUTOMATION_MODULE_SETTINGS;
  }

  mergeAutomationSettingsIntoTicketSettings(
    settings: TicketModuleSettings,
    automationSettings: AutomationModuleSettings,
  ): TicketModuleSettings {
    const supportNotificationGroups = automationSettings.whatsapp.bindings
      .filter((binding) => binding.active && binding.automations.ticketCreatedSupport)
      .map((binding) => ({ id: binding.id, label: binding.label, jid: binding.jid, active: binding.active }));
    const developmentNotificationGroups = automationSettings.whatsapp.bindings
      .filter((binding) => binding.active && binding.automations.ticketCreatedDevelopment)
      .map((binding) => ({ id: binding.id, label: binding.label, jid: binding.jid, active: binding.active }));
    const testingNotificationGroups = automationSettings.whatsapp.bindings
      .filter((binding) => binding.active && binding.automations.ticketStatusTesting)
      .map((binding) => ({ id: binding.id, label: binding.label, jid: binding.jid, active: binding.active }));
    const testingFailedNotificationGroups = automationSettings.whatsapp.bindings
      .filter((binding) => binding.active && binding.automations.ticketStatusTestingFailed)
      .map((binding) => ({ id: binding.id, label: binding.label, jid: binding.jid, active: binding.active }));

    return {
      ...settings,
      autoAssignToCreator: automationSettings.autoAssignToCreator,
      autoResponseEnabled: automationSettings.autoResponseEnabled,
      autoResponseMessage: automationSettings.autoResponseMessage,
      requireTestingReturnReason: automationSettings.requireTestingReturnReason,
      supportNotificationGroups,
      developmentNotificationGroups,
      testingNotificationGroups,
      testingFailedNotificationGroups,
    };
  }

  async readMergedTicketModuleSettings(): Promise<TicketModuleSettings> {
    try {
      const [setting, automationSettings] = await Promise.all([
        this.prisma.systemSetting.findUnique({
          where: { key: AutomationSettingsService.TICKETS_SETTINGS_KEY },
          select: { value: true },
        }),
        this.readAutomationModuleSettings(),
      ]);

      if (!setting?.value) {
        return this.mergeAutomationSettingsIntoTicketSettings(DEFAULT_TICKET_MODULE_SETTINGS, automationSettings);
      }

      const validation = ticketModuleSettingsSchema.safeParse(JSON.parse(setting.value));
      const data = validation.success ? validation.data : DEFAULT_TICKET_MODULE_SETTINGS;
      return this.mergeAutomationSettingsIntoTicketSettings(data, automationSettings);
    } catch {
      const automationSettings = await this.readAutomationModuleSettings();
      return this.mergeAutomationSettingsIntoTicketSettings(DEFAULT_TICKET_MODULE_SETTINGS, automationSettings);
    }
  }
}
