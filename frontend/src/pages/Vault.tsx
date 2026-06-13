/**
 * SA Prime Properties — Trust Vault Dashboard
 *
 * Live escrow status from the Soroban contract with:
 * - Auto-refund warning banner when < 24hrs remain on 7-day window
 * - CountdownTimer for escrow expiry
 * - Full status timeline
 * - Transaction history table with explorer links
 * - Release/Refund/Broker Refund actions
 * - Reset Escrow (demo utility)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAllEscrows,
  resetEscrow as apiResetEscrow,
  releaseFunds,
  refundFunds,
  brokerRefund,
  
  formatStroopsAsXlm,
  xlmToPhp,
  type EscrowState,
} from "@/lib/stellar";
import { connectWallet, truncateAddress } from "@/lib/freighter";
import {
  BROKER_ADDRESS,
  ESCROW_EXPIRY_MS,
  PHP_CONVERSION_RATE,
  EXPLORER_BASE,
  CONTRACT_ADDRESS,
  SAMPLE_LOTS,
} from "@/lib/constants";
import { DownloadReceiptButton } from "@/app/components/EscrowReceipt";
import { ExplorerLink } from "@/app/components/ExplorerLink";
import { EscrowCountdownTimer } from "@/app/components/CountdownTimer";
import { EscrowStatusBadge } from "@/components/EscrowStatusBadge";
import { CountdownTimer } from "@/components/CountdownTimer";
import { Button } from "@/components/ui/Button";
import {
  showTransactionSuccess,
  showTransactionError,
} from "@/components/TransactionToast";
import { useSearchParams } from "react-router-dom";
import {
  Lock,
  Unlock,
  ArrowLeftRight,
  Clock,
  ExternalLink,
  Loader2,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  CheckCircle2,
  Share2,
  X,
} from "lucide-react";

interface VaultProps {
  publicKey: string | null;
  onConnect: (key: string) => void;
}

interface TxRecord {
  hash: string;
  action: string;
  amountStroops: number | null;
  status: string;
}

/** Zero-pad to 2 digits for countdown display */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function Vault({ publicKey, onConnect }: VaultProps) {
  const [searchParams] = useSearchParams();
  const viewAddress = searchParams.get("address");
  const isReadOnly = !!viewAddress && viewAddress !== publicKey;

  const [escrows, setEscrows] = useState<Record<string, EscrowState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [txRecords, setTxRecords] = useState<TxRecord[]>([]);
  // Simulate lock time 4 hours ago for the countdown demo
  const [lockTimestamp] = useState<number>(Date.now() - 4 * 60 * 60 * 1000);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const isBroker = publicKey === BROKER_ADDRESS;

  const addTxRecord = (hash: string, action: string, amountStroops: number | null) => {
    setTxRecords((prev) => [
      { hash, action, amountStroops, status: "SUCCESS" },
      ...prev,
    ]);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const lotIds = SAMPLE_LOTS.map(l => `LOT-${l.id.padStart(2, '0')}`);
      const data = await getAllEscrows(lotIds);
      setEscrows(data);
      
      // We only track the first one for the global tx records in demo
      const firstActive = Object.values(data)[0];
      if (firstActive && firstActive.status !== null && firstActive.amount !== null) {
        setTxRecords((prev) => {
          const hasLock = prev.some((r) => r.action === "lock_funds");
          if (hasLock) return prev;
          return [
            {
              hash: firstActive.isDemo ? "demo_lock_tx_hash_for_display" : "",
              action: "lock_funds",
              amountStroops: firstActive.amount,
              status: "SUCCESS",
            },
          ];
        });
      }
    } catch (e) {
      console.error("[Vault] Failed to fetch status:", e);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleWalletConnect = async () => {
    try {
      const pk = await connectWallet();
      if (pk) onConnect(pk);
    } catch (e: any) {
      showTransactionError(e?.message || "Failed to connect wallet");
    }
  };

  const handleAction = async (
    actionType: "release" | "refund" | "broker_refund", lotId: string
  ) => {
    if (!publicKey) return;
    try {
      setIsSubmitting(true);

      if (escrows[lotId]?.isDemo) {
        // Simulate the transaction locally
        const fakeHash = "demo_tx_" + Math.random().toString(36).substring(2, 15);
        const nextStatus = actionType === "release" ? 1 : 2;
        sessionStorage.setItem("sa_prime_simulated_status", String(nextStatus));
        const label =
          actionType === "release"
            ? "release"
            : actionType === "broker_refund"
            ? "broker_refund"
            : "refund";
        addTxRecord(fakeHash, label, escrows[lotId]?.amount ?? null);
        const displayLabel =
          actionType === "release"
            ? "Released to Broker"
            : actionType === "broker_refund"
            ? "Broker Refunded to Buyer"
            : "Refunded to Buyer";
        showTransactionSuccess(fakeHash, `Demo Mode: Escrow ${displayLabel}`);
        setEscrows((prev) =>
          ({ ...prev, [lotId]: { ...prev[lotId], status: nextStatus } })
        );
        // Add artificial delay for realism
        await new Promise((r) => setTimeout(r, 800));
        return;
      }

      let result;
      const action = actionType;

      if (actionType === "release") {
        result = await releaseFunds(publicKey, lotId);
      } else if (actionType === "refund") {
        result = await refundFunds(publicKey, lotId);
      } else {
        result = await brokerRefund(publicKey, lotId);
      }

      if (result) {
        const label =
          actionType === "release"
            ? "release"
            : actionType === "broker_refund"
            ? "broker_refund"
            : "refund";
        addTxRecord(result.hash, label, escrows[lotId]?.amount ?? null);
        const displayLabel =
          actionType === "release"
            ? "Released to Broker"
            : actionType === "broker_refund"
            ? "Broker Refunded to Buyer"
            : "Refunded to Buyer";
        showTransactionSuccess(result.hash, `Escrow ${displayLabel}`);
        setEscrows((prev) =>
          ({ ...prev, [lotId]: { ...prev[lotId], status: actionType === "release" ? 1 : 2 } })
        );
      }
    } catch (error: any) {
      console.error(error);
      showTransactionError(error?.message || "Failed to submit transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!publicKey) return;
    try {
      setIsResetting(true);

      // Attempt real on-chain reset for all active
      let hash = "";
      for (const lotId of Object.keys(escrows)) {
         const result = await apiResetEscrow(publicKey, lotId);
         if (result) hash = result.hash;
      }
      if (hash) {
        showTransactionSuccess(hash, "Escrow Reset — Properties Available");
      }

      // Always clear ALL local demo/simulation state
      sessionStorage.setItem("sa_prime_escrow_reset", "true");
      sessionStorage.removeItem("sa_prime_simulated_status");
      sessionStorage.removeItem("sa_prime_simulated_docs_verified");
      sessionStorage.removeItem("sa_prime_simulated_doc_hash");

      // Force clear UI state immediately
      setEscrows({});
      setTxRecords([]);
      showTransactionSuccess("", "Vault Reset — State cleared. You can seed a new demo simulation below.");
    } finally {
      setIsResetting(false);
    }
  };

  const escrowExpiry = lockTimestamp + ESCROW_EXPIRY_MS;
  const msRemaining = escrowExpiry - Date.now();
  const showAutoRefundWarning =
    (Object.values(escrows) as EscrowState[]).some((e) => e.status === 0) && msRemaining > 0 && msRemaining < 24 * 60 * 60 * 1000;

  // Read dismissal from sessionStorage
  const warningStorageKey = publicKey ? `sa_prime_vault_warning_dismissed_${publicKey}` : "";
  const isWarningDismissed = warningDismissed || (warningStorageKey && sessionStorage.getItem(warningStorageKey) === "true");

  const handleDismissWarning = () => {
    setWarningDismissed(true);
    if (warningStorageKey) sessionStorage.setItem(warningStorageKey, "true");
  };

  const handleShareVault = async () => {
    const shareUrl = `${window.location.origin}/vault?address=${publicKey}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareToast(true);
      showTransactionSuccess("", "SA Prime Properties · Vault link copied.\nShare with your broker, lawyer, or family to monitor this escrow.");
      setTimeout(() => setShareToast(false), 3000);
    } catch {
      showTransactionError("Failed to copy link to clipboard");
    }
  };

  // ── Gate: Not Connected ──
  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
        <div className="w-20 h-20 rounded-2xl border-2 border-gold/20 bg-gold/5 flex items-center justify-center mb-8">
          <Lock className="w-10 h-10 text-gold/40" />
        </div>
        <h2 className="text-3xl font-serif mb-4">Trust Vault Access</h2>
        <p className="text-muted text-center max-w-md mb-8 leading-relaxed">
          Connect your Stellar wallet to view your active real estate
          reservations and manage cryptographic escrows.
        </p>
        <Button onClick={handleWalletConnect} size="lg" id="vault-connect-btn">
          <Wallet className="w-4 h-4 mr-2" />
          Connect Stellar Wallet
        </Button>
      </div>
    );
  }

  
  // hasEscrow is true when status is 0, 1, or 2 — but NOT null
  const hasEscrow = Object.keys(escrows).length > 0;

   return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Read-Only Mode Banner */}
      {isReadOnly && (
        <div className="mb-8 flex items-start gap-3 p-5 bg-amber/10 border border-amber/40 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-amber shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber mb-1">
              SA Prime Properties · Viewing Trust Vault for:
            </p>
            <p className="text-xs text-off-white font-mono mb-1">
              {viewAddress!.slice(0, 6)}...{viewAddress!.slice(-6)}
            </p>
            <p className="text-xs text-amber/70">
              Read-only mode — connect this wallet to take action.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-serif mb-3">Trust Vault Dashboard</h1>
          <div className="flex items-center gap-2 text-xs font-mono text-muted bg-surface px-3 py-2 rounded-lg border border-gold/10 w-fit">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>TESTNET</span>
            <span className="px-2 text-gold/30">|</span>
            <span>{truncateAddress(publicKey)}</span>
            {isBroker && (
              <>
                <span className="px-2 text-gold/30">|</span>
                <span className="text-amber font-bold">BROKER</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleReset}
          disabled={isResetting || !hasEscrow}
          id="reset-escrow-btn"
          className="flex items-center gap-2 px-4 py-2.5 bg-transparent border border-amber/40 text-amber text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-amber/10 transition-all disabled:opacity-30 disabled:pointer-events-none w-fit"
        >
          {isResetting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
          Reset Escrow (Demo)
        </button>
      </div>

      {/* Auto-Refund Warning Banner (dismissible) */}
      {showAutoRefundWarning && !isReadOnly && !isWarningDismissed && (
        <div className="mb-8 flex items-start gap-3 p-5 bg-amber/10 border border-amber/40 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-amber shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber mb-1">
              ⚠ SA Prime Properties · Your escrow expires in {pad2(Math.floor(msRemaining / 3600000))}:{pad2(Math.floor((msRemaining % 3600000) / 60000))}:{pad2(Math.floor((msRemaining % 60000) / 1000))}.
            </p>
            <p className="text-xs text-amber/80">
              Take action before auto-refund triggers.
            </p>
          </div>
          <button
            onClick={handleDismissWarning}
            className="p-1.5 rounded-lg text-amber/60 hover:text-amber hover:bg-amber/10 transition-all shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          <CountdownTimer
            expiryTimestamp={escrowExpiry}
            showLabel={false}
            className="shrink-0"
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
          <p className="text-muted font-mono text-sm">
            Reading contract state from Stellar Testnet...
          </p>
        </div>
      )}

      {/* No Escrow */}
      {!isLoading && !hasEscrow && (
        <div className="flex flex-col items-center justify-center py-24 border border-gold/10 bg-surface rounded-2xl">
          <div className="w-16 h-16 bg-gold/5 rounded-2xl border border-gold/10 flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-gold/30" />
          </div>
          <h3 className="text-xl font-serif mb-2">No Active Escrow</h3>
          <p className="text-muted text-sm max-w-md text-center mb-6">
            No escrow vault is active on this contract. Reserve a property from
            the listings page to initialize a new vault.
          </p>
          <button
            onClick={() => {
              sessionStorage.removeItem("sa_prime_escrow_reset");
              sessionStorage.removeItem("sa_prime_simulated_status");
              sessionStorage.removeItem("sa_prime_simulated_docs_verified");
              sessionStorage.removeItem("sa_prime_simulated_doc_hash");
              setIsLoading(true);
              fetchStatus();
            }}
            className="px-5 py-2.5 text-xs font-mono border border-gold/30 text-gold rounded-lg hover:bg-gold/5 transition-all shadow-[0_4px_12px_rgba(184,149,42,0.15)]"
          >
            Seed Demo Escrow (Simulation)
          </button>
        </div>
      )}

      {/* Active Escrow Dashboard */}
      {!isLoading && hasEscrow && (
        <div className="space-y-16">
          {(Object.entries(escrows) as [string, EscrowState][]).map(([lotId, statusObj]) => {
            const currentStatus = statusObj.status;
            const amountXlm = statusObj.amount ? formatStroopsAsXlm(statusObj.amount) : "0";
            const amountPhp = statusObj.amount ? xlmToPhp(Number(statusObj.amount) / 1e7) : "0.00";

            return (
        <div key={lotId} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Status + Actions */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── Download Receipt Banner ── */}
            {currentStatus === 0 && (
              <div className="flex items-center justify-between p-5 bg-gold/5 border border-gold/20 rounded-2xl">
                <div>
                  <p className="text-sm font-semibold text-gold-light mb-0.5">
                    Escrow Receipt Available
                  </p>
                  <p className="text-xs text-muted font-mono">
                    Cryptographic proof of your reservation — download for your records
                  </p>
                </div>
                <DownloadReceiptButton
                  id={`vault-download-receipt-btn-${lotId}`}
                  label="Download Receipt"
                  data={{
                    propertyName: "Trust Vault Escrow",
                    lotId: lotId,
                    buyerAddress: statusObj?.buyer ?? publicKey ?? "",
                    amountXlm: statusObj?.amount
                      ? Number(statusObj.amount) / 1e7
                      : 0,
                    txHash: txRecords.find((r) => r.action === "lock_funds")?.hash ||
                      "[hash-not-recorded-in-this-session]",
                    lockDate: lockTimestamp,
                  }}
                />
              </div>
            )}

            {/* Status Card */}
            <div className="bg-surface border-2 border-gold/40 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(184,149,42,0.06)]">
              <div className="p-6 border-b border-gold/10 bg-gradient-to-br from-[#1A2233] to-surface flex justify-between items-start">
                <div>
                  <h3 className="font-serif text-2xl text-gold-light mb-1">
                    {lotId} Vault
                  </h3>
                  <p className="text-[10px] font-mono text-muted uppercase tracking-wider">
                    Buyer: {truncateAddress(statusObj?.buyer)}
                  </p>
                </div>
                <EscrowStatusBadge status={currentStatus as 0 | 1 | 2 | null} />
              </div>

              <div className="p-6">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <span className="text-[10px] text-muted uppercase tracking-widest mb-1.5 block">
                      Vault Status
                    </span>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          currentStatus === 0
                            ? "bg-amber animate-pulse"
                            : currentStatus === 1
                            ? "bg-success"
                            : "bg-error"
                        }`}
                      />
                      <span className="text-xl font-bold text-off-white">
                        {currentStatus === 0
                          ? "LOCKED"
                          : currentStatus === 1
                          ? "RELEASED"
                          : "REFUNDED"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted uppercase tracking-widest mb-1.5 block">
                      Amount
                    </span>
                    <p className="text-xl font-mono text-gold-light font-bold">
                      {amountXlm}{" "}
                      <span className="text-xs font-normal text-gold">XLM</span>
                    </p>
                    <p className="text-xs text-muted font-mono">≈ ₱{amountPhp}</p>
                  </div>
                </div>

                {/* Contract Details */}
                <div className="space-y-3 mb-8 p-4 bg-navy/60 rounded-xl border border-gold/10">
                  {[
                    { label: "Buyer", value: truncateAddress(statusObj?.buyer) },
                    { label: "Broker", value: truncateAddress(statusObj?.broker) },
                    { label: "Token", value: truncateAddress(statusObj?.token) },
                    {
                      label: "Your Role",
                      value: isBroker ? "BROKER" : "BUYER / CLIENT",
                      highlight: isBroker ? "text-amber" : "text-gold-light",
                    },
                    {
                      label: "Verification Status",
                      value: statusObj?.docsVerified ? "✓ VERIFIED ON-CHAIN" : "AWAITING BROKER UPLOAD",
                      highlight: statusObj?.docsVerified ? "text-success font-bold" : "text-amber font-bold",
                    },
                    ...(statusObj?.docsVerified && statusObj?.docHash
                      ? [
                          {
                            label: "Anchored Hash",
                            value: `0x${statusObj.docHash.slice(0, 10)}...${statusObj.docHash.slice(-8)}`,
                            highlight: "text-gold-light",
                            title: `0x${statusObj.docHash}`,
                          },
                        ]
                      : []),
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-xs" title={"title" in item ? item.title : undefined}>
                      <span className="text-muted">{item.label}</span>
                      <span className={`font-mono ${item.highlight || "text-off-white/80"}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Escrow Expiry Countdown */}
                <div className="mb-8 p-4 bg-navy/60 rounded-xl border border-gold/10">
                  <p className="text-[10px] text-muted uppercase tracking-widest mb-2">
                    7-Day Escrow Window
                  </p>
                  <CountdownTimer
                    expiryTimestamp={escrowExpiry}
                    label=""
                    showLabel={false}
                  />
                </div>

                {/* Action Buttons — hidden in read-only mode */}
                {!isReadOnly && (
                <div className="flex flex-col md:flex-row gap-4">
                  {!isBroker && (
                    <>
                      <button
                        id={`vault-release-btn-${lotId}`}
                        className="flex-1 py-4 bg-gradient-to-r from-gold to-[#8A6D1F] text-navy font-bold uppercase tracking-widest rounded-xl shadow-[0_5px_15px_rgba(184,149,42,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_8px_25px_rgba(184,149,42,0.5)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm"
                        disabled={currentStatus !== 0 || !statusObj?.docsVerified || isSubmitting}
                        title={currentStatus === 0 && !statusObj?.docsVerified ? "Awaiting broker document verification on-chain" : undefined}
                        onClick={() => handleAction("release", lotId)}
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Unlock className="w-5 h-5" />
                        )}
                        Authorize Release
                      </button>
                      <button
                        id={`vault-refund-btn-${lotId}`}
                        className="flex-1 py-4 bg-transparent border border-error/50 text-error text-sm font-bold uppercase tracking-widest rounded-xl hover:bg-error/10 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                        disabled={currentStatus !== 0 || isSubmitting}
                        onClick={() => handleAction("refund", lotId)}
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <ArrowLeftRight className="w-5 h-5" />
                        )}
                        Request Refund
                      </button>
                    </>
                  )}

                  {isBroker && (
                    <button
                      id={`vault-broker-refund-btn-${lotId}`}
                      className="flex-1 py-4 bg-amber text-navy font-bold uppercase tracking-widest rounded-xl shadow-[0_5px_15px_rgba(245,158,11,0.3)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm"
                      disabled={currentStatus !== 0 || isSubmitting}
                      onClick={() => handleAction("broker_refund", lotId)}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-5 h-5" />
                      )}
                      Approve Refund to Buyer
                    </button>
                  )}
                </div>
                )}

                {/* Share Vault Button — hidden in read-only mode */}
                {!isReadOnly && publicKey && (
                  <div className="mt-6 pt-4 border-t border-gold/10">
                    <button
                      id={`share-vault-btn-${lotId}`}
                      onClick={handleShareVault}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl border border-gold/20 text-gold hover:bg-gold/5 hover:border-gold/40 transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Vault
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction History Table */}
            <div className="border border-gold/10 bg-surface rounded-2xl p-8">
              <h3 className="text-lg font-serif mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gold" />
                Transaction History
              </h3>
              <div className="overflow-x-auto rounded-xl border border-gold/10">
                <table className="w-full text-sm text-left">
                  <thead className="bg-navy text-xs text-muted uppercase">
                    <tr>
                      <th className="py-3 px-4 font-mono tracking-wider">
                        Action
                      </th>
                      <th className="py-3 px-4 font-mono tracking-wider">
                        Amount
                      </th>
                      <th className="py-3 px-4 font-mono tracking-wider">
                        Status
                      </th>
                      <th className="py-3 px-4 font-mono tracking-wider text-right">
                        Explorer
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs divide-y divide-gold/5">
                    {txRecords.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-8 px-4 text-center text-muted"
                        >
                          No transactions recorded yet
                        </td>
                      </tr>
                    )}
                    {txRecords.map((tx, i) => (
                      <tr
                        key={i}
                        className="hover:bg-navy/40 transition-colors"
                      >
                        <td className="py-3 px-4 flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              tx.action === "lock_funds"
                                ? "bg-amber"
                                : tx.action === "release"
                                ? "bg-success"
                                : "bg-error"
                            }`}
                          />
                          {tx.action}
                        </td>
                        <td className="py-3 px-4 text-gold-light">
                          {tx.amountStroops
                            ? `${formatStroopsAsXlm(tx.amountStroops)} XLM`
                            : "—"}
                          {tx.amountStroops && (
                            <span className="text-muted block text-[10px]">
                              ≈ ₱
                              {xlmToPhp(Number(tx.amountStroops) / 1e7)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-success flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {tx.hash ? (
                            <ExplorerLink hash={tx.hash} />
                          ) : (
                            <span className="text-muted/40">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Timeline Panel */}
          <div className="lg:col-span-1">
            <div className="border border-gold/20 bg-surface rounded-2xl p-8 sticky top-28">
              <h3 className="text-xl font-serif mb-8 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gold" />
                Status Timeline
              </h3>

              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-4 before:border-l before:border-gold/20">
                {/* Step 1: Funds Locked */}
                <div className="relative z-10 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-surface border-2 border-gold flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(184,149,42,0.3)]">
                    <div className="w-2 h-2 rounded-full bg-gold" />
                  </div>
                  <div className="pt-1">
                    <h4 className="font-semibold text-off-white text-sm">
                      Funds Locked
                    </h4>
                    <p className="text-xs text-muted mt-1 font-mono">
                      {amountXlm} XLM · Smart contract initialized
                    </p>
                  </div>
                </div>

                {/* Step 2: Broker Credentials */}
                <div className="relative z-10 flex items-start gap-4">
                  <div
                    className={`w-8 h-8 rounded-full bg-surface border-2 flex items-center justify-center shrink-0 transition-colors ${
                      currentStatus === 0
                        ? "border-amber shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                        : "border-gold"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full transition-colors ${
                        currentStatus === 0 ? "bg-amber animate-pulse" : "bg-gold"
                      }`}
                    />
                  </div>
                  <div className="pt-1">
                    <h4
                      className={`font-semibold text-sm ${
                        statusObj?.docsVerified
                          ? "text-success font-bold"
                          : currentStatus === 0
                          ? "text-amber"
                          : "text-off-white"
                      }`}
                    >
                      Broker Credentials
                    </h4>
                    {statusObj?.docsVerified ? (
                      <div className="space-y-1.5 mt-2">
                        <div className="text-xs font-mono bg-success/10 border border-success/20 text-success px-2 py-1 rounded inline-block font-semibold">
                          ✓ Credentials Verified On-Chain
                        </div>
                        {statusObj?.docHash && (
                          <div className="text-[10px] text-muted font-mono leading-none break-all bg-navy/40 p-1.5 rounded border border-gold/5">
                            Hash: <span className="text-gold-light">0x{statusObj.docHash.slice(0, 10)}...{statusObj.docHash.slice(-8)}</span>
                          </div>
                        )}
                      </div>
                    ) : currentStatus === 0 ? (
                      <div className="mt-2 text-xs font-mono bg-amber/10 border border-amber/20 text-amber px-2 py-1 rounded inline-block">
                        Awaiting verification
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Step 3: Settlement */}
                <div className="relative z-10 flex items-start gap-4">
                  <div
                    className={`w-8 h-8 rounded-full bg-surface border-2 flex items-center justify-center shrink-0 transition-colors ${
                      currentStatus !== null && currentStatus !== 0
                        ? "border-success shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                        : "border-gold/20"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full transition-colors ${
                        currentStatus !== null && currentStatus !== 0
                          ? "bg-success"
                          : "bg-transparent"
                      }`}
                    />
                  </div>
                  <div className="pt-1">
                    <h4
                      className={`font-semibold text-sm ${
                        currentStatus !== null && currentStatus !== 0
                          ? "text-success"
                          : "text-muted"
                      }`}
                    >
                      {currentStatus === 1
                        ? "Released to Broker"
                        : currentStatus === 2
                        ? "Refunded to Buyer"
                        : "Awaiting Buyer Action"}
                    </h4>
                    <p className="text-xs text-muted mt-1">
                      {currentStatus !== null && currentStatus !== 0
                        ? "Smart contract settled"
                        : "Pending document verification"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
