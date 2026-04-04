import { ForbiddenException, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";

export function assertInternalApiKey(internalApiKeyHeader: string | undefined) {
  const expected = process.env.INTERNAL_API_KEY?.trim();

  if (!expected) {
    throw new InternalServerErrorException("INTERNAL_API_KEY_NOT_CONFIGURED");
  }

  if (!internalApiKeyHeader) {
    throw new UnauthorizedException("MISSING_INTERNAL_API_KEY");
  }

  if (internalApiKeyHeader !== expected) {
    throw new ForbiddenException("INVALID_INTERNAL_API_KEY");
  }
}
