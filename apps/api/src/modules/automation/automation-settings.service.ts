import { Injectable } from '@nestjs/common';
import {
  DEFAULT_AUTOMATION_MODULE_SETTINGS,
  automationModuleSettingsSchema,
  type AutomationModuleSettings,
  type WhatsAppAutomationBinding,
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
      const [automationSetting, ticketSetting] = await Promise.all([
        this.prisma.systemSetting.findUnique({
          where: { key: AutomationSettingsService.AUTOMATIONS_SETTINGS_KEY },
          select: { value: true },
        }),
        this.prisma.systemSetting.findUnique({
          where: { key: AutomationSettingsService.TICKETS_SETTINGS_KEY },
          select: { value: true },
        }),
      ]);

      if (automationSetting?.value) {
        const parsed = automationModuleSettingsSchema.safeParse(JSON.parse(automationSetting.value));
        if (parsed.success) return parsed.data;
      }

      if (ticketSetting?.value) {
        return this.deriveAutomationSettingsFromLegacyTickets(JSON.parse(ticketSetting.value));
      }
    } catch {
      // ignore and fall back
    }

    return DEFAULT_AUTOMATION_MODULE_SETTINGS;
  }

  normalizeLegacyTicketSettings(raw: unknown): unknown {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return raw;
    }

    const parsed = { ...(raw as Record<string, unknown>) };
    const supportLegacyJid = typeof parsed.supportNotificationGroupJid === 'string' ? parsed.supportNotificationGroupJid.trim() : '';
    const developmentLegacyJid =
      typeof parsed.developmentNotificationGroupJid === 'string' ? parsed.developmentNotificationGroupJid.trim() : '';

    if (!Array.isArray(parsed.supportNotificationGroups) && supportLegacyJid) {
      parsed.supportNotificationGroups = [
        {
          id: 'support-legacy',
          label: 'Grupo legado de suporte',
          jid: supportLegacyJid,
          active: true,
        },
      ];
    }

    if (!Array.isArray(parsed.developmentNotificationGroups) && developmentLegacyJid) {
      parsed.developmentNotificationGroups = [
        {
          id: 'development-legacy',
          label: 'Grupo legado de desenvolvimento',
          jid: developmentLegacyJid,
          active: true,
        },
      ];
    }

    return parsed;
  }

  deriveAutomationSettingsFromLegacyTickets(raw: unknown): AutomationModuleSettings {
    const normalized = this.normalizeLegacyTicketSettings(raw);
    const parsed = ticketModuleSettingsSchema.safeParse(normalized);
    if (!parsed.success) return DEFAULT_AUTOMATION_MODULE_SETTINGS;

    const settings = parsed.data;
    const bindingsByJid = new Map<string, WhatsAppAutomationBinding>();

    const upsertBinding = (
      group: { id: string; label: string; jid: string; active: boolean },
      patch: Partial<WhatsAppAutomationBinding['automations']>,
    ) => {
      const normalizedJid = String(group.jid ?? '').trim();
      if (!normalizedJid) return;

      const current = bindingsByJid.get(normalizedJid) ?? {
        id: group.id,
        label: group.label,
        jid: normalizedJid,
        active: group.active,
        automations: {
          ticketCreatedSupport: false,
          ticketCreatedDevelopment: false,
          ticketTeamTransferFromSupport: false,
          ticketTeamTransferToSupport: false,
          ticketTeamTransferFromDevelopment: false,
          ticketTeamTransferToDevelopment: false,
          ticketStatusTesting: false,
          ticketStatusTestingFailed: false,
        },
      };

      current.label = current.label || group.label;
      current.active = current.active || group.active;
      current.automations = {
        ...current.automations,
        ...patch,
      };
      bindingsByJid.set(normalizedJid, current);
    };

    for (const group of settings.supportNotificationGroups) {
      upsertBinding(group, {
        ticketCreatedSupport: true,
        ticketTeamTransferFromSupport: true,
        ticketTeamTransferToSupport: true,
      });
    }

    for (const group of settings.developmentNotificationGroups) {
      upsertBinding(group, {
        ticketCreatedDevelopment: true,
        ticketTeamTransferFromDevelopment: true,
        ticketTeamTransferToDevelopment: true,
      });
    }

    for (const group of settings.testingNotificationGroups) {
      upsertBinding(group, {
        ticketStatusTesting: true,
      });
    }

    for (const group of settings.testingFailedNotificationGroups) {
      upsertBinding(group, {
        ticketStatusTestingFailed: true,
      });
    }

    return {
      autoAssignToCreator: settings.autoAssignToCreator,
      autoResponseEnabled: settings.autoResponseEnabled,
      autoResponseMessage: settings.autoResponseMessage,
      requireTestingReturnReason: settings.requireTestingReturnReason,
      whatsapp: {
        bindings: Array.from(bindingsByJid.values()),
      },
    };
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

      const parsed = this.normalizeLegacyTicketSettings(JSON.parse(setting.value));
      const validation = ticketModuleSettingsSchema.safeParse(parsed);
      const data = validation.success ? validation.data : DEFAULT_TICKET_MODULE_SETTINGS;
      return this.mergeAutomationSettingsIntoTicketSettings(data, automationSettings);
    } catch {
      const automationSettings = await this.readAutomationModuleSettings();
      return this.mergeAutomationSettingsIntoTicketSettings(DEFAULT_TICKET_MODULE_SETTINGS, automationSettings);
    }
  }
}
