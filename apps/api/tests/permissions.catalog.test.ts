import { describe, expect, it } from "vitest";

import { buildDefaultPermissionProfiles } from "../src/modules/settings/permissions/permissions.catalog";

describe("default permission profiles", () => {
  it("adds Empresa 360 to support and client-admin profiles only", () => {
    const profiles = buildDefaultPermissionProfiles();
    const supportProfile = profiles.find((profile) => profile.key === "SUPORTE");
    const clientAdminProfile = profiles.find((profile) => profile.key === "CLIENTE_ADMIN");
    const clientUserProfile = profiles.find((profile) => profile.key === "CLIENTE_USER");

    expect(supportProfile?.permissions).toContain("companies:view_cockpit");
    expect(clientAdminProfile?.permissions).toContain("companies:view_cockpit");
    expect(clientUserProfile?.permissions).not.toContain("companies:view_cockpit");
  });
});
