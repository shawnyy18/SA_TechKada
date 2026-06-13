import { describe, expect, it, vi } from "vitest";
import {
  clearWalletSession,
  getAccountProfile,
  hasValidWalletSession,
  saveAccountProfile,
  saveWalletSession,
} from "./account";

const ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

describe("account persistence", () => {
  it("creates and retrieves a client profile", () => {
    saveAccountProfile(ADDRESS, {
      role: "client",
      displayName: "Test Buyer",
      email: "buyer@example.com",
    });

    expect(getAccountProfile(ADDRESS)).toMatchObject({
      address: ADDRESS,
      role: "client",
      brokerStatus: "not_applicable",
    });
  });

  it("expires and clears wallet sessions", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    saveWalletSession({
      address: ADDRESS,
      message: "login",
      signature: "signed",
      issuedAt: 1_000,
      expiresAt: 2_000,
      authMethod: "signed_message",
    });

    expect(hasValidWalletSession(ADDRESS)).toBe(true);
    clearWalletSession(ADDRESS);
    expect(hasValidWalletSession(ADDRESS)).toBe(false);
  });
});
