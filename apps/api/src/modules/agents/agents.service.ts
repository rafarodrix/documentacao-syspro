import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  agentHeartbeatPayloadSchema,
  agentRegisterPayloadSchema,
  type AgentDesiredState,
} from '@dosc-syspro/contracts/agent';
import { readChatwootRuntimeConfig } from '@dosc-syspro/config';
import { assertInternalApiKey } from '../../common/auth/internal-api-auth';
import { getRemoteModuleSettingsSnapshot } from '../remote-admin/support/module-settings-server';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  async register(internalApiKey: string | undefined, body: unknown) {
    assertInternalApiKey(internalApiKey);

    const parsed = agentRegisterPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_AGENT_REGISTER_PAYLOAD',
        details: parsed.error.flatten(),
      });
    }

    const payload = parsed.data;
    this.logger.log({
      event: 'agent.registered',
      deviceId: payload.deviceId,
      hostname: payload.hostname,
      os: payload.os,
      identitySource: payload.identitySource,
      agentVersion: payload.agentVersion,
    });

    return {
      success: true,
      data: {
        registered: true,
        receivedAt: new Date().toISOString(),
        deviceId: payload.deviceId,
      },
    };
  }

  async heartbeat(internalApiKey: string | undefined, body: unknown) {
    assertInternalApiKey(internalApiKey);

    const parsed = agentHeartbeatPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_AGENT_HEARTBEAT_PAYLOAD',
        details: parsed.error.flatten(),
      });
    }

    const payload = parsed.data;
    this.logger.debug({
      event: 'agent.heartbeat',
      deviceId: payload.deviceId,
      agentVersion: payload.agentVersion,
      at: payload.at instanceof Date ? payload.at.toISOString() : payload.at,
    });

    return {
      success: true,
      data: {
        received: true,
        receivedAt: new Date().toISOString(),
        deviceId: payload.deviceId,
      },
    };
  }

  async getDesiredState(internalApiKey: string | undefined, deviceId: string) {
    assertInternalApiKey(internalApiKey);

    const normalizedDeviceId = deviceId?.trim();
    if (!normalizedDeviceId) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_DEVICE_ID',
      });
    }

    const state = await this.buildDesiredState();
    this.logger.debug({
      event: 'agent.desired_state_requested',
      deviceId: normalizedDeviceId,
      desiredVersion: state.version,
      remoteEnabled: state.remote.enabled,
    });

    return {
      success: true,
      data: state,
    };
  }

  private async buildDesiredState(): Promise<AgentDesiredState> {
    const remoteSettings = await getRemoteModuleSettingsSnapshot();
    const chatwoot = readChatwootRuntimeConfig();

    const remoteEnabled = Boolean(
      remoteSettings.rustDeskServerHost &&
      remoteSettings.rustDeskServerConfig &&
      remoteSettings.defaultPassword,
    );

    return {
      version: 1,
      updated_at: new Date().toISOString(),
      remote: {
        enabled: remoteEnabled,
        version: 'go-agent-v1',
        mode: 'managed',
        install_if_missing: true,
        bootstrap_enabled: true,
        sync_enabled: true,
      },
      tunnel: {
        enabled: false,
        version: '',
        server_host: '',
        server_port: 0,
        remote_port: 0,
        local_target: '',
        token: '',
      },
      backup: {
        enabled: false,
        version: '',
        schedule: '',
        retention_days: 0,
        target: '',
      },
      support: {
        enabled: Boolean(chatwoot.url),
        version: 'go-agent-v1',
        provider: chatwoot.url ? 'chatwoot' : '',
        widget_base_url: chatwoot.url ?? '',
        auto_attach_context: true,
      },
      device: {
        enabled: true,
        version: 'go-agent-v1',
        collect_inventory: false,
        collect_metrics: false,
      },
    };
  }
}
