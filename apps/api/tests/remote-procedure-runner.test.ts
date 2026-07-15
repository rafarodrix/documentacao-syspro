import { describe, expect, it } from 'vitest';
import {
  normalizeRemoteIngressPayload,
  summarizeRemoteIngressClient,
} from '../src/modules/remote-admin/remote-procedure-runner';

describe('normalizeRemoteIngressPayload', () => {
  it('infers discover schema version and promotes hostname for legacy discover payloads', () => {
    const result = normalizeRemoteIngressPayload('discover', {
      discoveryToken: 'disc-token',
      rustdeskId: '123456789',
      hostname: 'PC-CLIENTE-01',
    });

    expect(result.payload).toMatchObject({
      schemaVersion: 'discover.payload.v1',
      machineName: 'PC-CLIENTE-01',
      hostname: 'PC-CLIENTE-01',
      rustdeskId: '123456789',
      discoveryToken: 'disc-token',
    });
    expect(result.compatibility).toEqual({
      inferredDiscoverSchemaVersion: true,
      promotedHostnameToMachineName: true,
    });
  });

  it('preserves modern discover payloads without compatibility shims', () => {
    const result = normalizeRemoteIngressPayload('discover', {
      schemaVersion: 'discover.payload.v1',
      discoveryToken: 'disc-token',
      machineName: 'PC-CLIENTE-01',
      rustdeskId: '123456789',
    });

    expect(result.payload).toMatchObject({
      schemaVersion: 'discover.payload.v1',
      machineName: 'PC-CLIENTE-01',
      rustdeskId: '123456789',
      discoveryToken: 'disc-token',
    });
    expect(result.compatibility).toEqual({
      inferredDiscoverSchemaVersion: false,
      promotedHostnameToMachineName: false,
    });
  });
});

describe('summarizeRemoteIngressClient', () => {
  it('classifies the current Go agent runtime as modern', () => {
    expect(
      summarizeRemoteIngressClient({
        userAgent: 'trilink-agent/1.2.3',
        agentRuntime: 'go-agent',
        agentVersion: '1.2.3',
      }),
    ).toEqual({
      kind: 'modern_go_agent',
      userAgent: 'trilink-agent/1.2.3',
      agentRuntime: 'go-agent',
      agentVersion: '1.2.3',
    });
  });

  it('flags legacy PowerShell bootstrap callers separately', () => {
    expect(
      summarizeRemoteIngressClient({
        userAgent: 'Mozilla/5.0 (Windows NT; Windows NT 10.0; pt-BR) WindowsPowerShell/5.1.19041.6456',
      }),
    ).toEqual({
      kind: 'legacy_powershell',
      userAgent: 'Mozilla/5.0 (Windows NT; Windows NT 10.0; pt-BR) WindowsPowerShell/5.1.19041.6456',
      agentRuntime: null,
      agentVersion: null,
    });
  });
});
