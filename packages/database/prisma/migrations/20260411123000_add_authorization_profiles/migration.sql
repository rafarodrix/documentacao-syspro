CREATE TYPE "AccessScopeType" AS ENUM ('GLOBAL', 'COMPANY');

CREATE TABLE "permission" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "moduleKey" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "access_profile" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "access_profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "access_profile_permission" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "access_profile_permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_access_profile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "scopeType" "AccessScopeType" NOT NULL DEFAULT 'GLOBAL',
  "companyId" TEXT,
  "assignedByUserId" TEXT,
  "reason" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_access_profile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "permission_key_key" ON "permission"("key");
CREATE UNIQUE INDEX "access_profile_key_key" ON "access_profile"("key");
CREATE UNIQUE INDEX "access_profile_permission_profileId_permissionId_key" ON "access_profile_permission"("profileId", "permissionId");

CREATE INDEX "permission_moduleKey_isActive_idx" ON "permission"("moduleKey", "isActive");
CREATE INDEX "access_profile_isSystem_isActive_idx" ON "access_profile"("isSystem", "isActive");
CREATE INDEX "access_profile_permission_permissionId_idx" ON "access_profile_permission"("permissionId");
CREATE INDEX "user_access_profile_userId_scopeType_idx" ON "user_access_profile"("userId", "scopeType");
CREATE INDEX "user_access_profile_profileId_scopeType_idx" ON "user_access_profile"("profileId", "scopeType");
CREATE INDEX "user_access_profile_companyId_idx" ON "user_access_profile"("companyId");
CREATE INDEX "user_access_profile_assignedByUserId_idx" ON "user_access_profile"("assignedByUserId");

ALTER TABLE "access_profile_permission"
ADD CONSTRAINT "access_profile_permission_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "access_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "access_profile_permission"
ADD CONSTRAINT "access_profile_permission_permissionId_fkey"
FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_access_profile"
ADD CONSTRAINT "user_access_profile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_access_profile"
ADD CONSTRAINT "user_access_profile_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "access_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_access_profile"
ADD CONSTRAINT "user_access_profile_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_access_profile"
ADD CONSTRAINT "user_access_profile_assignedByUserId_fkey"
FOREIGN KEY ("assignedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
