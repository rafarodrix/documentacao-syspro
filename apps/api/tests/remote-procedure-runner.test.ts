import { describe, expect, it } from 'vitest';
import { normalizeRemoteIngressPayload } from '../src/modules/remote-admin/remote-procedure-runner';

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
