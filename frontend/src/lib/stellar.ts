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
import { SOROBAN_URL, CONTRACT_ADDRESS, BROKER_ADDRESS } from "./constants";
import { signTransaction } from "./freighter";

/* ─── RPC SERVER INSTANCE ──────────────────────────────────────────── */

const server = new rpc.Server(SOROBAN_URL);
const contract = new Contract(CONTRACT_ADDRESS);
const NETWORK_PASSPHRASE = Networks.TESTNET;

/**
 * The native XLM Stellar Asset Contract (SAC) address on Testnet.
 * This is derived from the Asset.native() + network passphrase.
 * This is the Soroban-compatible contract wrapper for native XLM.
 */
const XLM_SAC_ADDRESS = Asset.native().contractId(NETWORK_PASSPHRASE);

/* ─── TYPES ────────────────────────────────────────────────────────── */

export interface EscrowState {
  status: number | null;   // 0=Locked, 1=Released, 2=Refunded
  amount: number | null;   // in stroops (raw i128, 1 XLM = 10^7 stroops)
  buyer: string | null;
  broker: string | null;
  token: string | null;
}

export interface TransactionResult {
  hash: string;
  status: string;
  [key: string]: any;
}

/* ─── RAW RPC HELPER ───────────────────────────────────────────────── */

/**
 * Polls the Soroban RPC directly for transaction status using JSON-RPC.
 * This bypasses SDK abstractions for maximum reliability during demo.
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

/**
 * Extracts the return value from a Soroban simulation result.
 * Handles multiple SDK response shapes for cross-version compatibility.
 */
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
 * 
 *  1. Load the caller's Stellar account sequence number
 *  2. Build a transaction envelope with the contract operation
 *  3. Simulate on the RPC node (computes resource fees + footprint)
 *  4. Prepare the transaction (attaches simulation results)
 *  5. Send to Freighter for cryptographic signing
 *  6. Submit the signed transaction to the network
 *  7. Poll until the ledger confirms SUCCESS or FAILED
 * 
 * @param sourcePublicKey - The G... address of the caller (from Freighter)
 * @param operation       - The Soroban contract.call() operation
 * @returns               - The confirmed transaction result with hash
 */
export async function invokeSorobanContract(
  sourcePublicKey: string,
  operation: xdr.Operation
): Promise<TransactionResult> {
  let step = "load account";
  try {
    // ── Step 1: Fetch the account's current sequence number ──
    const account = await server.getAccount(sourcePublicKey);

    // ── Step 2: Build the transaction envelope ──
    step = "build transaction";
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    // ── Step 3: Prepare (simulate + attach resource footprint) ──
    step = "prepare transaction";
    const preparedTx = await server.prepareTransaction(tx);

    // ── Step 4: Sign via Freighter extension ──
    step = "Freighter signature";
    const signed = await signTransaction(preparedTx.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: sourcePublicKey,
    });
    if ((signed as any)?.error) throw new Error((signed as any).error);

    // Handle multiple Freighter response shapes
    const signedXdr =
      typeof signed === "string"
        ? signed
        : (signed as any)?.signedTxXdr ?? (signed as any)?.signedTxXDR;
    if (!signedXdr || typeof signedXdr !== "string") {
      throw new Error("Freighter returned an invalid signed transaction.");
    }

    // ── Step 5: Parse and submit ──
    step = "parse signed XDR";
    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    step = "send transaction";
    const response = await server.sendTransaction(signedTx);
    if (response.status === "ERROR") {
      throw new Error((response as any).errorResult?.toString() ?? "Send failed");
    }

    // ── Step 6: Poll until ledger confirmation ──
    step = "poll confirmation";
    let getResponse = await getTransactionStatusRaw(response.hash);
    let pollCount = 0;
    const MAX_POLLS = 30; // ~30 seconds max wait

    while (getResponse?.status === "NOT_FOUND" && pollCount < MAX_POLLS) {
      await new Promise((r) => setTimeout(r, 1000));
      getResponse = await getTransactionStatusRaw(response.hash);
      pollCount++;
    }

    if (getResponse?.status === "FAILED") {
      throw new Error("Transaction failed on-chain. Check Stellar Expert for details.");
    }
    if (getResponse?.status !== "SUCCESS") {
      throw new Error(`Unexpected status: ${getResponse?.status ?? "unknown"}`);
    }

    return { ...getResponse, hash: response.hash };
  } catch (e: any) {
    throw new Error(`[${step}] ${e?.message ?? e}`);
  }
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
 * Fetches the full escrow state from the deployed contract.
 * Calls all 5 getter functions in parallel for speed.
 */
export async function getContractStatus(): Promise<EscrowState> {
  try {
    const [buyer, broker, token, amount, status] = await Promise.all([
      readOnly("get_buyer").catch(() => null),
      readOnly("get_broker").catch(() => null),
      readOnly("get_token").catch(() => null),
      readOnly("get_amount").catch(() => null),
      readOnly("get_status").catch(() => null),
    ]);
    return { buyer, broker, token, amount, status };
  } catch (error) {
    console.error("[SA Prime] Failed to read contract state:", error);
    return { status: null, amount: null, buyer: null, broker: null, token: null };
  }
}

/* ─── PUBLIC API: LOCK FUNDS (XLM) ─────────────────────────────────── */

/**
 * Invokes the `lock_funds` method on the escrow contract.
 * Transfers native XLM from the buyer's Freighter wallet into the contract vault
 * via the XLM Stellar Asset Contract (SAC).
 * 
 * @param publicKey - The buyer's G... address
 * @param amount    - Amount in XLM (human-readable, e.g. 100)
 */
export async function lockFunds(
  publicKey: string,
  amount: number
): Promise<TransactionResult> {
  // Convert human-readable XLM to stroops (1 XLM = 10,000,000 stroops)
  const amountStroops = BigInt(Math.round(amount * 1e7));

  const op = contract.call(
    "lock_funds",
    Address.fromString(publicKey).toScVal(),       // buyer
    Address.fromString(BROKER_ADDRESS).toScVal(),   // broker
    Address.fromString(XLM_SAC_ADDRESS).toScVal(),  // token = native XLM SAC
    nativeToScVal(amountStroops.toString(), { type: "i128" })  // amount in stroops
  );

  return invokeSorobanContract(publicKey, op);
}

/* ─── PUBLIC API: RELEASE FUNDS ────────────────────────────────────── */

/**
 * Invokes the `release` method. Transfers locked XLM to the broker.
 * Only callable by the registered buyer — enforced on-chain via require_auth().
 */
export async function releaseFunds(
  publicKey: string
): Promise<TransactionResult> {
  const op = contract.call(
    "release",
    Address.fromString(publicKey).toScVal()
  );
  return invokeSorobanContract(publicKey, op);
}

/* ─── PUBLIC API: REFUND FUNDS ─────────────────────────────────────── */

/**
 * Invokes the `refund` method. Returns locked XLM to the buyer.
 * Only callable by the registered buyer — enforced on-chain via require_auth().
 */
export async function refundFunds(
  publicKey: string
): Promise<TransactionResult> {
  const op = contract.call(
    "refund",
    Address.fromString(publicKey).toScVal()
  );
  return invokeSorobanContract(publicKey, op);
}

/* ─── PUBLIC API: BROKER REFUND ────────────────────────────────────── */

/**
 * Invokes the `broker_refund` method. Returns locked XLM to the buyer.
 * Only callable by the registered broker — enforced on-chain via require_auth().
 */
export async function brokerRefund(
  publicKey: string
): Promise<TransactionResult> {
  const op = contract.call(
    "broker_refund",
    Address.fromString(publicKey).toScVal()
  );
  return invokeSorobanContract(publicKey, op);
}

/* ─── PUBLIC API: RESET ESCROW (DEMO/TESTING) ──────────────────────── */

/**
 * Invokes the `reset_escrow` method. Clears all on-chain escrow state
 * so properties become available again for testing.
 * Callable by any connected wallet (demo-mode only).
 * NOTE: This does NOT move funds — it only wipes the state.
 */
export async function resetEscrow(
  publicKey: string
): Promise<TransactionResult> {
  const op = contract.call(
    "reset_escrow",
    Address.fromString(publicKey).toScVal()
  );
  return invokeSorobanContract(publicKey, op);
}

/**
 * Exports the derived XLM SAC address for display purposes.
 */
export { XLM_SAC_ADDRESS };
