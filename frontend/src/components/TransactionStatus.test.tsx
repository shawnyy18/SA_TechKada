import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TransactionStatus } from "./TransactionStatus";

describe("TransactionStatus", () => {
  it("shows a pending transaction with an explorer link", () => {
    render(<TransactionStatus />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent("sa-prime:transaction-status", {
          detail: {
            phase: "pending",
            message: "Transaction submitted to Stellar",
            hash: "abc123",
          },
        })
      );
    });

    expect(screen.getByText("Transaction submitted to Stellar")).toBeVisible();
    expect(screen.getByRole("link", { name: /View on Stellar Explorer/i }))
      .toHaveAttribute("href", expect.stringContaining("abc123"));
  });
});
