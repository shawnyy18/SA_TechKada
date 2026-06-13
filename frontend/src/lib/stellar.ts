/**
 * SA Prime Properties — Soroban Smart Contract Interaction Layer
 *
 * Uses NATIVE XLM via the Stellar Asset Contract (SAC) on Testnet.
 * The XLM contract address is derived programmatically from the SDK.
 *
 * Architecture:
 *   Frontend (React) → This Layer → Soroban RPC → Stellar Ledger → Smart Contract
 */
import {
  Asset,
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  rpc,
  Account,
  Keypair,
  nativeToScVal,
  scValToNative,
  Address,
  xdr,
} from "@stellar/stellar-sdk";
import {
  SOROBAN_URL,
  CONTRACT_ADDRESS,
  BROKER_ADDRESS,
  HORIZON_URL,
} from "./constants";
import { signTransaction } from "./freighter";
export {
  formatStroopsAsXlm,
  generateCredentialHash,
  stroopsToXlm,
  xlmToPhp,
  xlmToStroops,
} from "./stellar-utils";

/* ─── RPC SERVER INSTANCE ──────────────────────────────────────────── */

const server = new rpc.Server(SOROBAN_URL);
const contract = new Contract(CONTRACT_ADDRESS);
const NETWORK_PASSPHRASE = Networks.TESTNET;

/**
 * The native XLM Stellar Asset Contract (SAC) address on Testnet.
 * This is derived from the Asset.native() + network passphrase.
 */
const XLM_SAC_ADDRESS = Asset.native().contractId(NETWORK_PASSPHRASE);

/* ─── TYPES ────────────────────────────────────────────────────────── */

export interface EscrowState {
  status: number | null; // 0=Locked, 1=Released, 2=Refunded
  amount: number | null; // in stroops (raw i128, 1 XLM = 10^7 stroops)
  buyer: string | null;
  broker: string | null;
  token: string | null;
  docsVerified?: boolean;
  expiryLedger?: number | null; // Ledger sequence for 7-day escrow window
  docHash?: string | null;      // SHA-256 credential hash anchored by broker
  isDemo?: boolean;
}

export interface TransactionResult {
  hash: string;
  status: string;
  [key: string]: any;
}

export type TransactionPhase = "preparing" | "awaiting_signature" | "pending" | "success" | "failed";

export interface TransactionStatusUpdate {
  phase: TransactionPhase;
  message: string;
  hash?: string;
}

function publishTransactionStatus(update: TransactionStatusUpdate): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sa-prime:transaction-status", { detail: update }));
  }
}

/* ─── XLM BALANCE FROM HORIZON ─────────────────────────────────────── */

/**
 * Fetches the native XLM balance for a Stellar address from Horizon REST API.
 *
 * @param address - The G... Stellar public key
 * @returns       - XLM balance as a number, or null if account not found
 */
export async function getXlmBalance(address: string): Promise<number | null> {
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
    if (!res.ok) return null;
    const data = await res.json();
    const nativeBalance = data.balances?.find(
      (b: any) => b.asset_type === "native"
    );
    return nativeBalance ? parseFloat(nativeBalance.balance) : null;
  } catch {
    return null;
  }
}

/* ─── POLL ESCROW STATUS ─────────────────────────────────────────────── */

/**
 * Sets up a polling interval to continuously read escrow state.
 * Returns a cleanup function to stop polling.
 *
 * @param callback    - Called with the latest EscrowState on each poll
 * @param intervalMs  - Polling interval in milliseconds (default 10 seconds)
 * @returns           - Cleanup function: call to stop polling
 */
export function pollEscrowStatus(
  callback: (state: EscrowState) => void,
  intervalMs = 10_000
): () => void {
  const tick = () =>
    getContractStatus()
      .then(callback)
      .catch((e) => console.error("[Poll] escrow status:", e));

  tick(); // Immediate first fetch
  const id = setInterval(tick, intervalMs);
  return () => clearInterval(id);
}

/** Legacy single-vault reader retained for the older broker screens. */
export async function getContractStatus(): Promise<EscrowState> {
  return (
    (await getEscrowState("LOT-07")) ?? {
      status: null,
      amount: null,
      buyer: null,
      broker: null,
      token: null,
      docsVerified: false,
      expiryLedger: null,
      docHash: null,
    }
  );
}

/* ─── RAW RPC HELPER ───────────────────────────────────────────────── */

/**
 * Polls the Soroban RPC directly for transaction status using JSON-RPC.
 */
async function getTransactionStatusRaw(hash: string): Promise<any> {
  const res = await fetch(SOROBAN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: { hash },
    }),
  });
  const payload = await res.json();
  if (payload.error) {
    throw new Error(payload.error.message ?? "RPC getTransaction failed");
  }
  return payload.result;
}

/* ─── SIMULATION RETURN VALUE EXTRACTION ───────────────────────────── */

function extractSimRetval(sim: any): xdr.ScVal {
  if (sim?.result?.retval) return sim.result.retval;
  const xdrB64 =
    sim?.result?.results?.[0]?.xdr ?? sim?.results?.[0]?.xdr;
  if (xdrB64) return xdr.ScVal.fromXDR(xdrB64, "base64");
  throw new Error("Simulation missing return value.");
}

/* ─── CORE: SIMULATE, SIGN, AND SEND ──────────────────────────────── */

/**
 * The universal Soroban transaction pipeline:
 *  1. Load caller's account sequence number
 *  2. Build a transaction with the contract operation
 *  3. Simulate on RPC (computes resource fees + footprint)
 *  4. Send to the selected wallet for signing
 *  5. Submit to network and poll for confirmation
 */
export async function invokeSorobanContract(
  sourcePublicKey: string,
  operation: xdr.Operation
): Promise<TransactionResult> {
  let step = "load account";
  try {
    publishTransactionStatus({ phase: "preparing", message: "Preparing Soroban transaction" });
    const account = await server.getAccount(sourcePublicKey);

    step = "build transaction";
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    step = "prepare transaction";
    const preparedTx = await server.prepareTransaction(tx);

    step = "wallet signature";
    publishTransactionStatus({ phase: "awaiting_signature", message: "Approve the transaction in your wallet" });
    const signed = await signTransaction(preparedTx.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: sourcePublicKey,
    });
    if ((signed as any)?.error) throw new Error((signed as any).error);

    const signedXdr =
      typeof signed === "string"
        ? signed
        : (signed as any)?.signedTxXdr ?? (signed as any)?.signedTxXDR;
    if (!signedXdr || typeof signedXdr !== "string") {
      throw new Error("The wallet returned an invalid signed transaction.");
    }

    step = "parse signed XDR";
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    step = "send transaction";
    const response = await server.sendTransaction(signedTx);
    if (response.status === "ERROR") {
      throw new Error(
        (response as any).errorResult?.toString() ?? "Send failed"
      );
    }

    publishTransactionStatus({ phase: "pending", message: "Transaction submitted to Stellar", hash: response.hash });

    step = "poll confirmation";
    let getResponse = await getTransactionStatusRaw(response.hash);
    let pollCount = 0;
    const MAX_POLLS = 30;

    while (getResponse?.status === "NOT_FOUND" && pollCount < MAX_POLLS) {
      await new Promise((r) => setTimeout(r, 1000));
      getResponse = await getTransactionStatusRaw(response.hash);
      pollCount++;
    }

    if (getResponse?.status === "FAILED") {
      throw new Error(
        "Transaction failed on-chain. Check Stellar Expert for details."
      );
    }
    if (getResponse?.status !== "SUCCESS") {
      throw new Error(
        `Unexpected status: ${getResponse?.status ?? "unknown"}`
      );
    }

    publishTransactionStatus({ phase: "success", message: "Transaction confirmed on Stellar Testnet", hash: response.hash });
    return { ...getResponse, hash: response.hash };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    if (msg.includes("UnreachableCodeReached")) {
      throw new Error(
        `Transaction rejected by Smart Contract (UnreachableCodeReached). Ensure you are using the correct wallet and the escrow is in the valid state.`
      );
    }
    publishTransactionStatus({ phase: "failed", message: msg });
    throw new Error(`[${step}] ${msg}`);
  }
}

export interface ContractEventRecord {
  id: string;
  action: string;
  ledger: number;
  txHash: string;
  closedAt: string;
}

async function rpcRequest<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(SOROBAN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message ?? `${method} failed`);
  return payload.result as T;
}

function decodeEventAction(topic: string[]): string {
  try {
    const decoded = topic.map((entry) => scValToNative(xdr.ScVal.fromXDR(entry, "base64")));
    return decoded.map(String).join(" · ");
  } catch {
    return "Contract state changed";
  }
}

export async function getRecentContractEvents(): Promise<ContractEventRecord[]> {
  const latest = await rpcRequest<{ sequence: number }>("getLatestLedger");
  const result = await rpcRequest<{
    events: Array<{ id: string; ledger: number; ledgerClosedAt: string; topic: string[]; txHash: string }>;
  }>("getEvents", {
    startLedger: Math.max(1, latest.sequence - 10_000),
    filters: [{ type: "contract", contractIds: [CONTRACT_ADDRESS] }],
    pagination: { limit: 20 },
  });

  return result.events.map((event) => ({
    id: event.id,
    action: decodeEventAction(event.topic),
    ledger: event.ledger,
    txHash: event.txHash,
    closedAt: event.ledgerClosedAt,
  }));
}

export function watchContractEvents(
  callback: (events: ContractEventRecord[]) => void,
  intervalMs = 5_000
): () => void {
  let seen = new Set<string>();
  let stopped = false;
  const poll = async () => {
    try {
      const events = await getRecentContractEvents();
      if (stopped) return;
      const fresh = events.filter((event) => !seen.has(event.id));
      seen = new Set(events.map((event) => event.id));
      if (fresh.length > 0) callback(fresh);
    } catch (error) {
      console.warn("[ContractEvents] Poll failed:", error);
    }
  };
  void poll();
  const timer = window.setInterval(poll, intervalMs);
  return () => {
    stopped = true;
    window.clearInterval(timer);
  };
}

/* ─── READ-ONLY CONTRACT QUERIES ───────────────────────────────────── */

/**
 * Executes a read-only (simulated) call against the contract.
 * No wallet signature required — uses a throwaway keypair.
 */
async function readOnly(method: string, args: xdr.ScVal[] = []): Promise<any> {
  const account = new Account(Keypair.random().publicKey(), "0");
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error((sim as any).error ?? "Simulation error");
  }
  return scValToNative(extractSimRetval(sim));
}

/* ─── PUBLIC API: CONTRACT STATE ───────────────────────────────────── */

/**
 * Fetches the full escrow state for a specific lot.
 */
export async function getEscrowState(lotId: string): Promise<EscrowState | null> {
  try {
    const rawEscrow = await readOnly("get_escrow", [nativeToScVal(lotId, { type: "string" })]);
    if (!rawEscrow) return null;

    // Soroban returns structs as objects or arrays. Assuming object with named fields:
    return {
      buyer: rawEscrow.buyer ? rawEscrow.buyer.toString() : rawEscrow[0]?.toString(),
      broker: rawEscrow.broker ? rawEscrow.broker.toString() : rawEscrow[1]?.toString(),
      token: rawEscrow.token ? rawEscrow.token.toString() : rawEscrow[2]?.toString(),
      amount: rawEscrow.amount !== undefined ? Number(rawEscrow.amount) : Number(rawEscrow[3]),
      status: rawEscrow.status !== undefined ? Number(rawEscrow.status) : Number(rawEscrow[4]),
      expiryLedger: rawEscrow.expiry_ledger !== undefined ? Number(rawEscrow.expiry_ledger) : Number(rawEscrow[5]),
      docsVerified: rawEscrow.docs_verified !== undefined ? rawEscrow.docs_verified : rawEscrow[6],
      docHash: rawEscrow.doc_hash !== undefined ? rawEscrow.doc_hash?.toString() : rawEscrow[7]?.toString(),
      isDemo: false,
    };
  } catch (error: any) {
    // If it fails (e.g. Escrow does not exist), return null
    return null;
  }
}

/**
 * Fetches all active escrows for all lots.
 * Used by Vault, Broker Portal, and Landing pages.
 */
export async function getAllEscrows(lotIds: string[]): Promise<Record<string, EscrowState>> {
  const escrows: Record<string, EscrowState> = {};
  
  // Fetch in parallel for speed
  const promises = lotIds.map(async (lotId) => {
    const state = await getEscrowState(lotId);
    if (state) {
      escrows[lotId] = state;
    }
  });

  await Promise.all(promises);
  return escrows;
}

/* ─── PUBLIC API: LOCK FUNDS (XLM) ─────────────────────────────────── */

export async function lockFunds(
  publicKey: string,
  lotId: string,
  amount: number
): Promise<TransactionResult> {
  const balance = await getXlmBalance(publicKey);
  if (balance === null) {
    throw new Error("Wallet account was not found on Stellar Testnet. Fund it with Friendbot first.");
  }
  if (balance < amount + 1) {
    throw new Error(`Insufficient XLM balance. This escrow needs ${amount} XLM plus network reserve and fees.`);
  }
  const amountStroops = BigInt(Math.round(amount * 1e7));

  const op = contract.call(
    "lock_funds",
    nativeToScVal(lotId, { type: "string" }),
    Address.fromString(publicKey).toScVal(),
    Address.fromString(BROKER_ADDRESS).toScVal(),
    Address.fromString(XLM_SAC_ADDRESS).toScVal(),
    nativeToScVal(amountStroops.toString(), { type: "i128" })
  );

  return invokeSorobanContract(publicKey, op);
}

/* ─── PUBLIC API: UPLOAD DOCS (BROKER) ─────────────────────────────── */

export async function uploadDocs(
  publicKey: string,
  lotId: string,
  docsHash: string
): Promise<TransactionResult> {
  const op = contract.call(
    "upload_docs",
    Address.fromString(publicKey).toScVal(),
    nativeToScVal(lotId, { type: "string" }),
    nativeToScVal(docsHash, { type: "string" })
  );
  return invokeSorobanContract(publicKey, op);
}

/* ─── PUBLIC API: RELEASE FUNDS ────────────────────────────────────── */

export async function releaseFunds(
  publicKey: string,
  lotId: string
): Promise<TransactionResult> {
  const op = contract.call(
    "release",
    Address.fromString(publicKey).toScVal(),
    nativeToScVal(lotId, { type: "string" })
  );
  return invokeSorobanContract(publicKey, op);
}

/* ─── PUBLIC API: REFUND FUNDS ─────────────────────────────────────── */

export async function refundFunds(
  publicKey: string,
  lotId: string
): Promise<TransactionResult> {
  const op = contract.call(
    "refund",
    Address.fromString(publicKey).toScVal(),
    nativeToScVal(lotId, { type: "string" })
  );
  return invokeSorobanContract(publicKey, op);
}

/* ─── PUBLIC API: BROKER REFUND ────────────────────────────────────── */

export async function brokerRefund(
  publicKey: string,
  lotId: string
): Promise<TransactionResult> {
  const op = contract.call(
    "broker_refund",
    Address.fromString(publicKey).toScVal(),
    nativeToScVal(lotId, { type: "string" })
  );
  return invokeSorobanContract(publicKey, op);
}

/* ─── PUBLIC API: RESET ESCROW (DEMO/TESTING) ──────────────────────── */

export async function resetEscrow(
  publicKey: string,
  lotId: string
): Promise<TransactionResult> {
  const op = contract.call(
    "reset_escrow",
    Address.fromString(publicKey).toScVal(),
    nativeToScVal(lotId, { type: "string" })
  );
  return invokeSorobanContract(publicKey, op);
}

/** Export the derived XLM SAC address for display and lock_funds calls */
export { XLM_SAC_ADDRESS };
