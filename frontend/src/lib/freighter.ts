/**
 * SA Prime Properties — Freighter Wallet Integration
 * 
 * Built for @stellar/freighter-api v6.0.1
 * 
 * v6 API returns OBJECTS, not primitives:
 *   isConnected()    → { isConnected: boolean, error?: { code, message } }
 *   requestAccess()  → { address: string, error?: { code, message } }
 *   getAddress()     → { address: string, error?: { code, message } }
 *   signTransaction() → { signedTxXdr: string, signerAddress: string, error?: { code, message } }
 */
import {
  isConnected as _isConnected,
  requestAccess as _requestAccess,
  getAddress as _getAddress,
  signTransaction as _signTransaction,
} from "@stellar/freighter-api";

/* ─── TYPES ────────────────────────────────────────────────────────── */

interface FreighterError {
  code: number;
  message: string;
  ext?: string[];
}

/* ─── CONNECT WALLET ───────────────────────────────────────────────── */

/**
 * Full wallet connection flow:
 * 1. Check if Freighter extension is installed
 * 2. Request user permission (triggers the Freighter popup)
 * 3. Return the user's Stellar public key
 */
export async function connectWallet(): Promise<string> {
  // ── Step 1: Is the extension installed? ──
  const connResult = await _isConnected();

  if (connResult.error) {
    throw new Error(`Freighter error: ${connResult.error.message}`);
  }

  if (!connResult.isConnected) {
    window.open("https://www.freighter.app/", "_blank");
    throw new Error(
      "Freighter wallet not detected. Please install the browser extension from freighter.app"
    );
  }

  // ── Step 2: Request access (triggers Freighter popup) ──
  const accessResult = await _requestAccess();

  if (accessResult.error) {
    throw new Error(`Freighter denied access: ${accessResult.error.message}`);
  }

  if (!accessResult.address) {
    throw new Error("Freighter did not return an address. Please try again.");
  }

  return accessResult.address;
}

/* ─── IS CONNECTED ─────────────────────────────────────────────────── */

/**
 * Checks if Freighter is installed and available.
 */
export async function isConnected(): Promise<boolean> {
  try {
    const result = await _isConnected();
    return result.isConnected === true && !result.error;
  } catch {
    return false;
  }
}

/* ─── GET ADDRESS ──────────────────────────────────────────────────── */

/**
 * Gets the currently active Freighter address without prompting.
 * Returns null if not connected or not allowed.
 */
export async function getPublicKey(): Promise<string | null> {
  try {
    const result = await _getAddress();
    if (result.error || !result.address) return null;
    return result.address;
  } catch {
    return null;
  }
}

/* ─── SIGN TRANSACTION ─────────────────────────────────────────────── */

/**
 * Signs a transaction XDR via Freighter.
 * Returns the signed XDR string.
 * 
 * @param xdr  - The transaction XDR to sign
 * @param opts - { networkPassphrase, address }
 * @returns    - The signed transaction XDR string
 */
export async function signTransaction(
  xdr: string,
  opts: { networkPassphrase?: string; address?: string }
): Promise<string> {
  const result = await _signTransaction(xdr, opts);

  if (result.error) {
    throw new Error(`Freighter signing failed: ${result.error.message}`);
  }

  if (!result.signedTxXdr) {
    throw new Error("Freighter did not return a signed transaction.");
  }

  return result.signedTxXdr;
}

/* ─── HELPERS ──────────────────────────────────────────────────────── */

/**
 * Truncates a Stellar address for display: GABC...1234
 */
export function truncateAddress(addr: string | null | undefined): string {
  if (!addr) return "—";
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}
