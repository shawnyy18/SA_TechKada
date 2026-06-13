/**
 * SA Prime Properties — Multi-wallet Integration
 *
 * Built with StellarWalletsKit v2 and Freighter, Albedo, and xBull modules.
 *
 * v6 API returns OBJECTS, not primitives:
 *   isConnected()     → { isConnected: boolean, error?: { code, message } }
 *   requestAccess()   → { address: string, error?: { code, message } }
 *   getAddress()      → { address: string, error?: { code, message } }
 *   getNetworkDetails() → { network, networkPassphrase, ... }
 *   signTransaction() → { signedTxXdr: string, signerAddress: string, error?: { code, message } }
 */
import { Networks as WalletNetworks, StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { Networks } from "@stellar/stellar-sdk";

let kitInitialized = false;

function initializeWalletKit(): void {
  if (kitInitialized) return;
  StellarWalletsKit.init({
    network: WalletNetworks.TESTNET,
    modules: [new FreighterModule(), new AlbedoModule(), new xBullModule()],
    authModal: { hideUnsupportedWallets: false, showInstallLabel: true },
  });
  kitInitialized = true;
}

/* ─── CONNECT WALLET ───────────────────────────────────────────────── */

/**
 * Full wallet connection flow:
 * 1. Let the user choose an available Stellar wallet
 * 2. Request wallet permission
 * 3. Return the user's Stellar public key
 */
export async function connectWallet(): Promise<string> {
  initializeWalletKit();
  try {
    const { address } = await StellarWalletsKit.authModal();
    if (!address) throw new Error("The selected wallet did not return an address.");
    await guardTestnet();
    return address;
  } catch (error: any) {
    const message = error?.message ?? String(error);
    if (/reject|declin|cancel|denied/i.test(message)) {
      throw new Error("Wallet connection was rejected. Open your wallet and try again.");
    }
    if (/not found|not installed|unavailable|extension/i.test(message)) {
      throw new Error("Selected wallet was not found. Install it or choose another wallet.");
    }
    throw new Error(message || "Unable to connect the selected Stellar wallet.");
  }
}

/* ─── IS CONNECTED ─────────────────────────────────────────────────── */

/**
 * Checks whether a StellarWalletsKit session is available.
 */
export async function isConnected(): Promise<boolean> {
  try {
    initializeWalletKit();
    const result = await StellarWalletsKit.getAddress();
    return Boolean(result.address);
  } catch {
    return false;
  }
}

/* ─── GET ADDRESS ──────────────────────────────────────────────────── */

/**
 * Gets the currently active wallet address without prompting.
 * Returns null if not connected or not allowed.
 */
export async function getPublicKey(): Promise<string | null> {
  try {
    initializeWalletKit();
    const result = await StellarWalletsKit.getAddress();
    if (!result.address) return null;
    return result.address;
  } catch {
    return null;
  }
}

/* ─── GUARD TESTNET ────────────────────────────────────────────────── */

/**
 * Verifies that the selected wallet is set to Stellar Testnet.
 * Throws a descriptive error if the network passphrase doesn't match.
 *
 * Must be called after connectWallet() succeeds.
 */
export async function guardTestnet(): Promise<void> {
  try {
    initializeWalletKit();
    const details = await StellarWalletsKit.getNetwork();
    const passphrase = details?.networkPassphrase;

    if (passphrase && passphrase !== Networks.TESTNET) {
      throw new Error(
        "Wrong network detected. Please switch your wallet to Stellar Testnet and try again."
      );
    }
  } catch (e: any) {
    // If we can't read network details, surface a helpful message
    if (e.message?.includes("Wrong network")) throw e;
    console.warn("[WalletKit] Could not verify network:", e.message);
  }
}

/* ─── SIGN TRANSACTION ─────────────────────────────────────────────── */

/**
 * Signs a transaction XDR through the selected StellarWalletsKit module.
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
  initializeWalletKit();
  let result;
  try {
    result = await StellarWalletsKit.signTransaction(xdr, opts);
  } catch (error: any) {
    const message = error?.message ?? String(error);
    if (/reject|declin|cancel|denied/i.test(message)) {
      throw new Error("Transaction signature was rejected by the wallet.");
    }
    throw new Error(`Wallet signing failed: ${message}`);
  }

  if (!result.signedTxXdr) {
    throw new Error("The selected wallet did not return a signed transaction.");
  }

  return result.signedTxXdr;
}

/* ─── SIGN-IN PROOF ───────────────────────────────────────────────── */

export interface WalletProof {
  address: string;
  message: string;
  signature: string;
  issuedAt: number;
  expiresAt: number;
  authMethod: "signed_message" | "wallet_connection";
}

/**
 * Requests a human-readable login signature from the selected wallet. This proves that
 * the connected browser controls the selected Stellar account without moving
 * funds or exposing the private key.
 */
export async function signInWithStellar(address: string): Promise<WalletProof> {
  await guardTestnet();

  const issuedAt = Date.now();
  const expiresAt = issuedAt + 24 * 60 * 60 * 1000;
  const nonce = crypto.randomUUID();
  const message = [
    "SA Prime Properties login",
    `Wallet: ${address}`,
    "Network: Stellar Testnet",
    `Nonce: ${nonce}`,
    `Issued at: ${new Date(issuedAt).toISOString()}`,
    "This request does not initiate a transaction or cost XLM.",
  ].join("\n");

  initializeWalletKit();
  try {
    const result = await StellarWalletsKit.signMessage(message, {
      address,
      networkPassphrase: Networks.TESTNET,
    });
    if (!result.signedMessage) throw new Error("Wallet returned an empty signature.");
    return {
      address,
      message,
      signature: result.signedMessage,
      issuedAt,
      expiresAt,
      authMethod: "signed_message",
    };
  } catch {
    // Some Stellar wallets can sign transactions but do not implement SEP-43
    // message signing. The user still explicitly approved the wallet connection.
    return {
      address,
      message,
      signature: "",
      issuedAt,
      expiresAt,
      authMethod: "wallet_connection",
    };
  }
}

export function getConnectedWalletName(): string {
  try {
    initializeWalletKit();
    return StellarWalletsKit.selectedModule.productName;
  } catch {
    return "Stellar Wallet";
  }
}

export async function disconnectWallet(): Promise<void> {
  initializeWalletKit();
  await StellarWalletsKit.disconnect();
}

/* ─── HELPERS ──────────────────────────────────────────────────────── */

/**
 * Truncates a Stellar address for display: GABC...1234
 */
export function truncateAddress(addr: string | null | undefined): string {
  if (!addr) return "—";
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}
