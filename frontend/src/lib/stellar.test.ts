import { describe, expect, it } from "vitest";
import {
  formatStroopsAsXlm,
  generateCredentialHash,
  stroopsToXlm,
  xlmToPhp,
  xlmToStroops,
} from "./stellar-utils";

describe("Stellar amount helpers", () => {
  it("converts XLM to stroops without floating-point drift", () => {
    expect(xlmToStroops(1.25)).toBe(12_500_000n);
  });

  it("converts and formats stroops for the UI", () => {
    expect(stroopsToXlm(25_000_000n)).toBe(2.5);
    expect(formatStroopsAsXlm(25_000_000)).toBe("2.5");
  });

  it("formats the configured PHP estimate", () => {
    expect(xlmToPhp(100)).toBe("850.00");
  });
});

describe("credential hashing", () => {
  it("creates a stable SHA-256 document fingerprint", async () => {
    const first = await generateCredentialHash("PRC-1", "TCT-2", "ZONE-3");
    const second = await generateCredentialHash("PRC-1", "TCT-2", "ZONE-3");

    expect(first).toHaveLength(64);
    expect(first).toBe(second);
  });
});
