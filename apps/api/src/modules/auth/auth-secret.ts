export function requireBetterAuthSecret(value = process.env.BETTER_AUTH_SECRET): string {
  const secret = value?.trim();

  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET obrigatoria para inicializar a autenticacao.');
  }

  return secret;
}
