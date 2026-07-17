import { describe, expect, it } from "vitest";
import { describeProxyError } from "@/lib/errors/proxy-error";

describe("describeProxyError", () => {
  it("preserves primitive thrown strings", () => {
    expect(describeProxyError("socket hang up")).toMatchObject({
      message: "socket hang up",
      name: null,
      code: null,
    });
  });

  it("serializes plain objects without a message field", () => {
    expect(describeProxyError({ status: 502, reason: "bad gateway" }).message).toBe(
      JSON.stringify({ status: 502, reason: "bad gateway" }),
    );
  });

  it("keeps cause transport details from native errors", () => {
    const error = new TypeError("fetch failed", {
      cause: {
        code: "ECONNRESET",
        syscall: "read",
        address: "5.78.205.234",
        port: 443,
        message: "socket hang up",
      },
    });

    expect(describeProxyError(error)).toMatchObject({
      message: "fetch failed",
      causeMessage: "socket hang up",
      causeCode: "ECONNRESET",
      syscall: "read",
      address: "5.78.205.234",
      port: 443,
    });
  });
});
