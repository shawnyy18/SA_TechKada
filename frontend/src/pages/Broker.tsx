/**
 * SA Prime Properties — Broker Portal
 *
 * DEMO MODE: SA Prime Properties broker portal for credential submission.
 *
 * The broker connects their Freighter wallet, views active locked escrows,
 * and submits credentials to the Stellar ledger via SHA-256 hash (Web Crypto).
 *
 * Note: No real file reading occurs. All "uploads" are simulated via
 * text fields + SHA-256 hashing. The on-chain Soroban call is real (testnet).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  SAMPLE_LOTS,
  PHP_CONVERSION_RATE,
  BROKER_ADDRESS,
  DEMO_CREDENTIALS,
  EXPLORER_BASE,
} from "@/lib/constants";
import {
  generateCredentialHash,
  uploadDocs,
  getContractStatus,
  formatStroopsAsXlm,
  xlmToPhp,
} from "@/lib/stellar";
import { connectWallet, truncateAddress } from "@/lib/freighter";
import { WalletConnect } from "@/components/WalletConnect";
import {
  showTransactionSuccess,
  showTransactionError,
} from "@/components/TransactionToast";
import {
  Shield,
  Wallet,
  FileCheck,
  Loader2,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Lock,
  AlertTriangle,
  Hash,
} from "lucide-react";

interface BrokerProps {
  publicKey: string | null;
  onConnect: (key: string) => void;
}

interface CredentialForm {
  prcBrokerId: string;
  tctReference: string;
  zoningPermit: string;
}

interface UploadState {
  loading: boolean;
  hash: string | null;
  txHash: string | null;
  error: string | null;
  success: boolean;
}

export function Broker({ publicKey, onConnect }: BrokerProps) {
  const [credentials, setCredentials] = useState<CredentialForm>({
    prcBrokerId: DEMO_CREDENTIALS.prcBrokerId,
    tctReference: DEMO_CREDENTIALS.tctReference,
    zoningPermit: DEMO_CREDENTIALS.zoningPermit,
  });
  const [uploadState, setUploadState] = useState<Record<string, UploadState>>(
    {}
  );

  // Active lots (hardcoded for demo — the Lot 7 demo is always "locked")
  const activeLots = SAMPLE_LOTS.filter((l) => l.status === 1);
  // Also include all lots so broker can submit for any
  const allLots = SAMPLE_LOTS;

  const handleConnect = async () => {
    try {
      const pk = await connectWallet();
      if (pk) onConnect(pk);
    } catch (e: any) {
      showTransactionError(e?.message || "Failed to connect wallet");
    }
  };

  const handleSubmitCredentials = async (lotId: string) => {
    if (!publicKey) return;

    setUploadState((prev) => ({
      ...prev,
      [lotId]: { loading: true, hash: null, txHash: null, error: null, success: false },
    }));

    try {
      // Step 1: Generate SHA-256 credential hash via Web Crypto API
      const hash = await generateCredentialHash(
        credentials.prcBrokerId,
        credentials.tctReference,
        credentials.zoningPermit
      );

      setUploadState((prev) => ({
        ...prev,
        [lotId]: { ...prev[lotId], hash },
      }));

      // Step 2: Attempt on-chain upload via Soroban
      let txHash: string | null = null;
      let onChainError: string | null = null;

      try {
        const result = await uploadDocs(publicKey, `lot_${lotId}`, hash);
        txHash = result.hash;
        showTransactionSuccess(result.hash, "Credentials Anchored to Stellar Testnet");
      } catch (err: any) {
        // upload_docs may not exist on deployed contract — gracefully handle
        onChainError =
          "upload_docs not available on deployed contract (demo mode)";
        console.warn("[Broker] upload_docs call:", err?.message);
      }

      setUploadState((prev) => ({
        ...prev,
        [lotId]: {
          loading: false,
          hash,
          txHash,
          error: onChainError,
          success: true, // success = hash was generated + shown
        },
      }));
    } catch (err: any) {
      setUploadState((prev) => ({
        ...prev,
        [lotId]: {
          loading: false,
          hash: null,
          txHash: null,
          error: err?.message || "Failed to generate credential hash",
          success: false,
        },
      }));
      showTransactionError(err?.message || "Credential submission failed");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber/10 border border-amber/30 rounded-full">
              <span className="text-[10px] font-mono text-amber font-bold uppercase tracking-widest">
                ● DEMO MODE
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber/10 border border-amber/30 rounded-full">
              <span className="text-[10px] font-mono text-amber font-bold uppercase tracking-widest">
                ● TESTNET
              </span>
            </div>
          </div>
          <h1 className="text-4xl font-serif mb-2">
            SA Prime Properties · Broker Portal
          </h1>
          <p className="text-muted text-sm max-w-lg">
            Submit credentials to the Stellar ledger to unlock buyer
            authorization. All document hashes are anchored on-chain via
            Soroban.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <WalletConnect
            onConnect={onConnect}
            publicKey={publicKey}
          />
          {publicKey === BROKER_ADDRESS && (
            <span className="text-[10px] text-success font-mono font-bold">
              ✓ Verified Broker Wallet
            </span>
          )}
        </div>
      </div>

      {/* Connect prompt if not connected */}
      {!publicKey && (
        <div className="flex flex-col items-center justify-center py-20 border border-gold/10 bg-surface rounded-2xl mb-8">
          <div className="w-16 h-16 rounded-2xl border border-gold/20 bg-gold/5 flex items-center justify-center mb-6">
            <Wallet className="w-8 h-8 text-gold/40" />
          </div>
          <h3 className="text-xl font-serif mb-2">Broker Authentication Required</h3>
          <p className="text-muted text-sm text-center max-w-sm mb-6">
            Connect the registered broker Freighter wallet to access the credential upload portal.
          </p>
          <button
            onClick={handleConnect}
            id="broker-connect-btn"
            className="px-6 py-3 bg-gradient-to-r from-gold to-[#8A6D1F] text-navy font-bold rounded-xl text-sm uppercase tracking-widest"
          >
            Connect Broker Wallet
          </button>
        </div>
      )}

      {publicKey && (
        <>
          {/* Credential Input Form (shared across all lots) */}
          <div className="bg-surface border border-gold/20 rounded-2xl p-8 mb-8">
            <h2 className="text-xl font-serif mb-6 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-gold" />
              Broker Credentials
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-[10px] text-muted uppercase tracking-widest font-semibold mb-2">
                  PRC Broker ID
                </label>
                <input
                  type="text"
                  id="prc-broker-id"
                  value={credentials.prcBrokerId}
                  onChange={(e) =>
                    setCredentials((p) => ({ ...p, prcBrokerId: e.target.value }))
                  }
                  className="w-full bg-navy border border-gold/20 rounded-lg px-4 py-3 text-sm font-mono text-off-white focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/20 placeholder:text-muted/50 transition-colors"
                  placeholder="PRC-YYYY-XXXXXXX"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted uppercase tracking-widest font-semibold mb-2">
                  TCT/CCT Reference
                </label>
                <input
                  type="text"
                  id="tct-reference"
                  value={credentials.tctReference}
                  onChange={(e) =>
                    setCredentials((p) => ({ ...p, tctReference: e.target.value }))
                  }
                  className="w-full bg-navy border border-gold/20 rounded-lg px-4 py-3 text-sm font-mono text-off-white focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/20 placeholder:text-muted/50 transition-colors"
                  placeholder="TCT-N-XXXXXX"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted uppercase tracking-widest font-semibold mb-2">
                  Municipal Zoning Permit
                </label>
                <input
                  type="text"
                  id="zoning-permit"
                  value={credentials.zoningPermit}
                  onChange={(e) =>
                    setCredentials((p) => ({ ...p, zoningPermit: e.target.value }))
                  }
                  className="w-full bg-navy border border-gold/20 rounded-lg px-4 py-3 text-sm font-mono text-off-white focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/20 placeholder:text-muted/50 transition-colors"
                  placeholder="SFO-ZP-YYYY-XXXX"
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-navy/60 border border-gold/5 rounded-lg">
              <p className="text-[10px] text-muted font-mono">
                <span className="text-gold">Hash formula:</span>{" "}
                SHA-256( PRC_ID | TCT_REF | ZONING_PERMIT ) → anchored on-chain
              </p>
            </div>
          </div>

          {/* Active Escrow Lots */}
          <div>
            <h2 className="text-xl font-serif mb-6">
              {activeLots.length > 0 ? "Active Escrow Lots" : "All Properties"}
            </h2>

            <div className="space-y-5">
              {allLots.map((lot) => {
                const state = uploadState[lot.id];
                const isLotLocked = lot.status === 1;
                const phpEquiv = (lot.priceXLM * PHP_CONVERSION_RATE).toLocaleString("en-PH");

                return (
                  <div
                    key={lot.id}
                    className="bg-surface border border-gold/20 rounded-2xl overflow-hidden"
                  >
                    {/* Lot Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gold/10">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isLotLocked
                              ? "bg-gold/20 border border-gold/40"
                              : "bg-muted/10 border border-muted/20"
                          }`}
                        >
                          <Lock
                            className={`w-4 h-4 ${
                              isLotLocked ? "text-gold" : "text-muted"
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-semibold text-sm text-off-white">
                              {lot.name}
                            </h3>
                            {isLotLocked && (
                              <span className="text-[10px] bg-amber/10 border border-amber/30 text-amber px-2 py-0.5 rounded-full font-mono font-bold">
                                LOCKED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted font-mono">
                            LOT-{lot.id.padStart(2, "0")} · {lot.location} ·{" "}
                            {lot.priceXLM.toLocaleString()} XLM · ₱{phpEquiv}
                          </p>
                        </div>
                      </div>
                      <Link
                        to={`/broker/escrow/${lot.id}`}
                        className="flex items-center gap-1 text-xs text-gold hover:text-gold-light transition-colors font-mono"
                      >
                        View Detail
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Upload Panel */}
                    <div className="p-6">
                      {state?.success ? (
                        <div className="space-y-4">
                          {/* Hash Display */}
                          <div className="p-4 bg-navy rounded-xl border border-gold/10">
                            <div className="flex items-center gap-2 mb-2">
                              <Hash className="w-4 h-4 text-gold shrink-0" />
                              <span className="text-xs text-muted uppercase tracking-wider font-semibold">
                                Credential Hash
                              </span>
                            </div>
                            <p className="font-mono text-xs text-gold-light break-all">
                              0x{state.hash}
                            </p>
                          </div>

                          {/* On-chain status */}
                          {state.txHash ? (
                            <div className="flex items-start gap-3 p-4 bg-success/10 border border-success/30 rounded-xl">
                              <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-success mb-1">
                                  Credentials Anchored to Stellar Testnet
                                </p>
                                <a
                                  href={`${EXPLORER_BASE}/${state.txHash}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-gold-light hover:text-gold transition-colors"
                                >
                                  View Transaction
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3 p-4 bg-amber/10 border border-amber/30 rounded-xl">
                              <AlertTriangle className="w-5 h-5 text-amber shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-amber mb-1">
                                  Hash Generated · On-Chain Call Simulated
                                </p>
                                <p className="text-xs text-amber/80">
                                  upload_docs() is not on the deployed contract.
                                  In production, this hash would be anchored
                                  on-chain via Soroban.
                                </p>
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() =>
                              setUploadState((prev) => {
                                const next = { ...prev };
                                delete next[lot.id];
                                return next;
                              })
                            }
                            className="text-xs text-muted hover:text-gold transition-colors font-mono"
                          >
                            ↩ Resubmit credentials
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-xs text-muted">
                            {isLotLocked
                              ? "Escrow is active. Submit credentials to allow buyer authorization."
                              : "Property is available — no active escrow to verify."}
                          </p>
                          <button
                            id={`submit-credentials-${lot.id}`}
                            onClick={() => handleSubmitCredentials(lot.id)}
                            disabled={state?.loading || !isLotLocked}
                            className="shrink-0 px-5 py-2.5 bg-gradient-to-r from-gold to-[#8A6D1F] text-navy font-bold text-xs uppercase tracking-widest rounded-xl shadow-[0_4px_15px_rgba(184,149,42,0.25)] hover:shadow-[0_6px_20px_rgba(184,149,42,0.4)] transition-all hover:scale-[1.02] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
                          >
                            {state?.loading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <Shield className="w-4 h-4" />
                                Submit Credentials to Ledger
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Production Disclaimer */}
          <div className="mt-12 p-5 border border-muted/10 rounded-2xl bg-surface/50">
            <p className="text-xs text-muted leading-relaxed text-center">
              <span className="font-semibold text-muted/80">DEMO MODE:</span> In
              production, real PDF/image files would be uploaded, hashed via
              SHA-256, pinned to IPFS for permanent storage, and the IPFS CID
              anchored on-chain via{" "}
              <code className="font-mono text-gold/60">upload_docs()</code>. No
              actual files are read or transmitted in this demonstration.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
