import { describe, expect, it } from 'vitest';
import { requireBetterAuthSecret } from '../src/modules/auth/auth-secret';

describe('requireBetterAuthSecret', () => {
  it('returns a configured secret', () => {
    expect(requireBetterAuthSecret('secret-seguro')).toBe('secret-seguro');
  });

  it.each([undefined, '', '   '])('rejects a missing or blank secret', (secret) => {
    expect(() => requireBetterAuthSecret(secret)).toThrow('BETTER_AUTH_SECRET obrigatoria');
  });
});
