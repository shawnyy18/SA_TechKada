/**
 * SA Prime Properties — Reserve Flow Page
 *
 * 4-step property reservation flow:
 *  Step 1: Connect Wallet (Freighter, Testnet guard)
 *  Step 2: Lock Funds (XLM + PHP dual display, Soroban call)
 *  Step 3: Awaiting Broker Docs (48hr countdown, required docs list)
 *  Step 4: Release or Refund (only when docsVerified, status must be 0)
 */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  SAMPLE_LOTS,
  PHP_CONVERSION_RATE,
  BROKER_ADDRESS,
  BROKER_DOC_WINDOW_MS,
  EXPLORER_BASE,
  CONTRACT_ADDRESS,
} from "@/lib/constants";
import { DownloadReceiptButton } from "@/app/components/EscrowReceipt";
import { ExplorerLink } from "@/app/components/ExplorerLink";
import { EscrowCountdownTimer } from "@/app/components/CountdownTimer";
import {
  lockFunds,
  releaseFunds,
  refundFunds,
  xlmToPhp,
  formatStroopsAsXlm,
  getEscrowState,
} from "@/lib/stellar";
import { WalletConnect } from "@/components/WalletConnect";
import { CountdownTimer } from "@/components/CountdownTimer";
import { Button } from "@/components/ui/Button";
import {
  showTransactionSuccess,
  showTransactionError,
} from "@/components/TransactionToast";
import {
  Check,
  ShieldAlert,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Lock,
  FileCheck,
  Unlock,
  ArrowLeftRight,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface ReserveProps {
  publicKey: string | null;
  onConnect: (key: string) => void;
}

type Step = 1 | 2 | 3 | 4;

export function Reserve({ publicKey, onConnect }: ReserveProps) {
  const { lotId } = useParams();
  const navigate = useNavigate();
  const lot = SAMPLE_LOTS.find((l) => l.id === lotId);
  const contractLotId = lot ? `LOT-${lot.id.padStart(2, "0")}` : "";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockTxHash, setLockTxHash] = useState<string | null>(null);
  const [lockTimestamp, setLockTimestamp] = useState<number | null>(null);
  const [docsVerified, setDocsVerified] = useState(false);
  const [escrowStatus, setEscrowStatus] = useState<number | null>(null);
  const [releaseTxHash, setReleaseTxHash] = useState<string | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [brokerDeadlineMissed, setBrokerDeadlineMissed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!lot) navigate("/");
  }, [lot, navigate]);

  // Poll contract for docs verified + status after funds are locked
  useEffect(() => {
    if (!lockTxHash) return;
    const poll = async () => {
      try {
        const state = await getEscrowState(contractLotId);
        if (state) {
          if (state.docsVerified) setDocsVerified(true);
          if (state.status !== null) setEscrowStatus(state.status);
        }
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, 10_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [lockTxHash]);

  if (!lot) return null;

  const phpEquiv = (lot.priceXLM * PHP_CONVERSION_RATE).toLocaleString("en-PH");
  const brokerDocExpiry = lockTimestamp ? lockTimestamp + BROKER_DOC_WINDOW_MS : 0;
  const escrowExpiry = lockTimestamp ? lockTimestamp + 7 * 24 * 60 * 60 * 1000 : 0;

  // Step logic
  const currentStep: Step = releaseTxHash
    ? 4
    : lockTxHash
    ? 3
    : publicKey
    ? 2
    : 1;

  const handleLockFunds = async () => {
    if (!publicKey) return;
    try {
      setIsSubmitting(true);
      const result = await lockFunds(publicKey, contractLotId, lot.priceXLM);
      setLockTxHash(result.hash);
      setLockTimestamp(Date.now());
      showTransactionSuccess(result.hash, "Funds Locked in Escrow");
    } catch (error: any) {
      console.error(error);
      showTransactionError(
        error?.message || "Failed to submit transaction to testnet"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRelease = async () => {
    if (!publicKey) return;
    try {
      setIsReleasing(true);
      const result = await releaseFunds(publicKey, contractLotId);
      setReleaseTxHash(result.hash);
      setEscrowStatus(1);
      showTransactionSuccess(result.hash, "Funds Released to Broker");
    } catch (error: any) {
      showTransactionError(error?.message || "Release failed");
    } finally {
      setIsReleasing(false);
    }
  };

  const handleRefund = async () => {
    if (!publicKey) return;
    try {
      setIsRefunding(true);
      const result = await refundFunds(publicKey, contractLotId);
      setReleaseTxHash(result.hash);
      setEscrowStatus(2);
      showTransactionSuccess(result.hash, "Refund Processed");
    } catch (error: any) {
      showTransactionError(error?.message || "Refund failed");
    } finally {
      setIsRefunding(false);
    }
  };

  const steps = [
    { step: 1, label: "Connect Wallet" },
    { step: 2, label: "Lock Funds" },
    { step: 3, label: "Await Docs" },
    { step: 4, label: "Release / Refund" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-xs font-mono text-muted mb-4">
          <button onClick={() => navigate("/")} className="hover:text-gold transition-colors">
            Properties
          </button>
          <span>/</span>
          <span className="text-gold">Reserve Lot {lot.id}</span>
        </div>
        <h1 className="text-4xl font-serif mb-3">{lot.name}</h1>
        <p className="text-muted font-mono text-sm">
          {lot.location} · Lot {lot.id} · Stellar Testnet Reservation
        </p>
      </div>

      {/* Step Indicator */}
      <div className="relative mb-12 hidden md:block">
        <div className="absolute top-4 left-0 right-0 h-[1px] bg-gold/10" />
        <div className="flex justify-between relative z-10">
          {steps.map((s) => (
            <div key={s.step} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm border-2 bg-navy transition-all ${
                  currentStep > s.step
                    ? "bg-gold border-gold text-navy"
                    : currentStep === s.step
                    ? "border-gold text-gold shadow-[0_0_12px_rgba(184,149,42,0.4)]"
                    : "border-gold/20 text-muted"
                }`}
              >
                {currentStep > s.step ? (
                  <Check className="w-4 h-4" />
                ) : (
                  s.step
                )}
              </div>
              <span
                className={`mt-3 text-[10px] uppercase tracking-wider font-bold ${
                  currentStep >= s.step ? "text-gold-light" : "text-muted"
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Steps Panel */}
        <div className="md:col-span-2 space-y-5">
          {/* ── Step 1: Connect Wallet ── */}
          <div
            className={`border bg-surface rounded-2xl p-8 transition-all ${
              currentStep === 1
                ? "border-gold/50 ring-1 ring-gold/20"
                : "border-gold/10 opacity-75"
            }`}
          >
            <h3 className="text-xl font-serif mb-5 flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono border ${
                  currentStep > 1
                    ? "bg-gold border-gold text-navy"
                    : "border-gold/40 text-gold"
                }`}
              >
                {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
              </span>
              Connect Wallet
            </h3>

            <div className="flex items-center justify-between p-4 bg-navy rounded-xl border border-gold/10">
              <div>
                <p className="text-sm text-muted mb-0.5">Web3 Identity</p>
                <p className="text-[10px] font-mono text-muted/60">
                  Freighter · Stellar Testnet required
                </p>
              </div>
              <WalletConnect onConnect={onConnect} publicKey={publicKey} />
            </div>

            {publicKey && (
              <div className="mt-3 flex items-center gap-2 text-xs text-success font-mono">
                <CheckCircle2 className="w-4 h-4" />
                Wallet connected · TESTNET
              </div>
            )}
          </div>

          {/* ── Step 2: Lock Funds ── */}
          <div
            className={`border bg-surface rounded-2xl p-8 transition-all ${
              currentStep === 2
                ? "border-gold/50 ring-1 ring-gold/20"
                : currentStep > 2
                ? "border-gold/10 opacity-75"
                : "border-gold/10 opacity-40 pointer-events-none"
            }`}
          >
            <h3 className="text-xl font-serif mb-5 flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono border ${
                  currentStep > 2
                    ? "bg-gold border-gold text-navy"
                    : "border-gold/40 text-gold"
                }`}
              >
                {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
              </span>
              Lock Funds
            </h3>

            {/* Escrow Terms */}
            <div className="space-y-3 mb-6 p-4 bg-navy rounded-xl border border-gold/10">
              <div className="flex justify-between items-center py-2 border-b border-gold/5">
                <span className="text-sm text-muted">Reservation Fee</span>
                <span className="font-mono text-gold-light text-lg font-bold">
                  {lot.priceXLM.toLocaleString()} XLM
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gold/5">
                <span className="text-sm text-muted">PHP Equivalent</span>
                <span className="font-mono text-off-white">≈ ₱{phpEquiv}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gold/5">
                <span className="text-sm text-muted">Network</span>
                <span className="font-mono text-amber text-xs font-bold">
                  ● STELLAR TESTNET
                </span>
              </div>
              <div className="flex flex-col py-2">
                <span className="text-sm text-muted mb-1.5">Broker Wallet</span>
                <span className="font-mono text-xs text-off-white/60 break-all">
                  {BROKER_ADDRESS}
                </span>
              </div>
            </div>

            {/* Security notice */}
            <div className="bg-amber/8 border border-amber/20 rounded-xl p-4 mb-6 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber shrink-0 mt-0.5" />
              <p className="text-xs text-amber/90 leading-relaxed">
                Your XLM remains under your cryptographic control. The broker
                cannot access funds until you explicitly authorize release after
                document verification.
              </p>
            </div>

            {/* Success state */}
            {lockTxHash ? (
              <div className="bg-success/10 border border-success/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <span className="font-semibold text-success">
                    Escrow Locked Successfully
                  </span>
                </div>
                <p className="text-xs text-muted font-mono mb-2">
                  TX:{" "}
                  <ExplorerLink hash={lockTxHash} />
                </p>

                {/* ── Download Receipt ── */}
                <div className="mt-4 pt-4 border-t border-success/15">
                  <DownloadReceiptButton
                    id="reserve-download-receipt-btn"
                    data={{
                      propertyName: lot.name,
                      lotId: lot.id,
                      buyerAddress: publicKey ?? "",
                      amountXlm: lot.priceXLM,
                      txHash: lockTxHash,
                      lockDate: lockTimestamp ?? undefined,
                    }}
                  />
                </div>
              </div>
            ) : (
              <Button
                id="lock-funds-btn"
                className="w-full h-12 text-base"
                onClick={handleLockFunds}
                disabled={isSubmitting || !publicKey}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Submitting to Stellar Testnet...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Lock Reservation — Approve in Freighter
                  </>
                )}
              </Button>
            )}
          </div>

          {/* ── Step 3: Awaiting Broker Docs ── */}
          <div
            className={`border bg-surface rounded-2xl p-8 transition-all ${
              currentStep === 3
                ? "border-gold/50 ring-1 ring-gold/20"
                : currentStep > 3
                ? "border-gold/10 opacity-75"
                : "border-gold/10 opacity-40 pointer-events-none"
            }`}
          >
            <h3 className="text-xl font-serif mb-5 flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono border ${
                  docsVerified
                    ? "bg-gold border-gold text-navy"
                    : "border-gold/40 text-gold"
                }`}
              >
                {docsVerified ? <Check className="w-3.5 h-3.5" /> : "3"}
              </span>
              Awaiting Broker Credentials
            </h3>

            <div className="flex items-center justify-between mb-6 p-4 bg-navy rounded-xl border border-gold/10">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber" />
                <span className="text-sm text-muted">Submission Window</span>
              </div>
              {lockTimestamp ? (
                <CountdownTimer
                  expiryTimestamp={brokerDocExpiry}
                  label="48-Hr Window"
                  showLabel={false}
                />
              ) : (
                <span className="font-mono text-muted text-sm">
                  Awaiting lock...
                </span>
              )}
            </div>

            {/* Required docs list */}
            <div className="space-y-2 mb-6">
              <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-3">
                Broker Must Submit
              </p>
              {[
                "PRC Broker ID (Professional Regulation Commission)",
                "TCT/CCT Title (Transfer Certificate of Title)",
                "Municipal Zoning Permits",
              ].map((doc) => (
                <div
                  key={doc}
                  className="flex items-center gap-3 p-3 bg-navy/60 border border-gold/5 rounded-lg"
                >
                  <FileCheck
                    className={`w-4 h-4 shrink-0 ${
                      docsVerified ? "text-success" : "text-muted"
                    }`}
                  />
                  <span className="text-xs text-off-white/70">{doc}</span>
                  {docsVerified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success ml-auto shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {docsVerified ? (
              <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-success">
                    Credentials Verified On-Chain
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    Proceed to Step 4 to authorize release or request refund
                  </p>
                </div>
              </div>
            ) : brokerDeadlineMissed ? (
              <div className="space-y-4">
                <div className="bg-amber/10 border border-amber/40 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber">
                      Broker deadline missed — you may request an immediate refund
                      from your Trust Vault
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/vault")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-[#8A6D1F] text-navy font-bold text-xs uppercase tracking-widest rounded-xl shadow-[0_4px_15px_rgba(184,149,42,0.3)] hover:scale-[1.02] transition-all"
                >
                  Go to My Vault →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber/8 border border-amber/20 rounded-xl p-4 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-amber animate-spin shrink-0" />
                  <p className="text-xs text-amber/80">
                    Waiting for broker to submit credentials to the Stellar
                    ledger...
                  </p>
                </div>
                {lockTimestamp && (
                  <EscrowCountdownTimer
                    lockTimestamp={lockTimestamp}
                    expiryLedger={0}
                    mode="broker"
                    onExpired={() => setBrokerDeadlineMissed(true)}
                  />
                )}
              </div>
            )}
          </div>

          {/* ── Step 4: Release or Refund ── */}
          <div
            className={`border bg-surface rounded-2xl p-8 transition-all ${
              docsVerified && escrowStatus === 0
                ? "border-gold/50 ring-1 ring-gold/20"
                : "border-gold/10 opacity-40 pointer-events-none"
            }`}
          >
            <h3 className="text-xl font-serif mb-5 flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono border ${
                  escrowStatus !== null && escrowStatus !== 0
                    ? "bg-gold border-gold text-navy"
                    : "border-gold/40 text-gold"
                }`}
              >
                {escrowStatus !== null && escrowStatus !== 0 ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  "4"
                )}
              </span>
              Authorize Release or Refund
            </h3>

            {releaseTxHash ? (
              <div
                className={`border rounded-xl p-5 ${
                  escrowStatus === 1
                    ? "bg-success/10 border-success/30"
                    : "bg-error/10 border-error/30"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2
                    className={`w-5 h-5 ${
                      escrowStatus === 1 ? "text-success" : "text-error"
                    }`}
                  />
                  <span
                    className={`font-semibold ${
                      escrowStatus === 1 ? "text-success" : "text-error"
                    }`}
                  >
                    {escrowStatus === 1
                      ? "Funds Released to Broker"
                      : "Refund Processed"}
                  </span>
                </div>
                <p className="text-xs text-muted font-mono mb-2">
                  TX:{" "}
                  <ExplorerLink hash={releaseTxHash} />
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  id="authorize-release-btn"
                  className="flex-1 py-4 bg-gradient-to-r from-gold to-[#8A6D1F] text-navy font-bold uppercase tracking-widest rounded-xl shadow-[0_5px_20px_rgba(184,149,42,0.35)] transition-all hover:scale-[1.02] hover:shadow-[0_8px_25px_rgba(184,149,42,0.5)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm"
                  disabled={!docsVerified || escrowStatus !== 0 || isReleasing}
                  onClick={handleRelease}
                >
                  {isReleasing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Unlock className="w-5 h-5" />
                  )}
                  Authorize Release
                </button>
                <button
                  id="request-refund-btn"
                  className="flex-1 py-4 bg-transparent border border-error/50 text-error text-sm font-bold uppercase tracking-widest rounded-xl hover:bg-error/10 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                  disabled={escrowStatus !== 0 || isRefunding}
                  onClick={handleRefund}
                >
                  {isRefunding ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowLeftRight className="w-5 h-5" />
                  )}
                  Request Refund
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="md:col-span-1">
          <div className="sticky top-28 border border-gold/20 bg-surface rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(184,149,42,0.06)]">
            {/* Property image */}
            <div className="h-40 bg-navy relative overflow-hidden">
              {lot.image && (
                <img
                  src={lot.image}
                  alt={lot.name}
                  className="w-full h-full object-cover opacity-60"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-serif text-lg leading-tight mb-1">
                  {lot.name}
                </h4>
                <p className="text-xs text-muted font-mono">{lot.location}</p>
              </div>

              <div className="pt-3 border-t border-gold/10 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Reservation</span>
                  <span className="font-mono text-gold-light font-bold">
                    {lot.priceXLM.toLocaleString()} XLM
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">PHP</span>
                  <span className="font-mono">≈ ₱{phpEquiv}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Lot ID</span>
                  <span className="font-mono text-xs">
                    LOT-{lot.id.padStart(2, "0")}
                  </span>
                </div>
              </div>

              {lockTimestamp && (
                <div className="pt-3 border-t border-gold/10">
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-2">
                    Escrow Expiry (7 days)
                  </p>
                  <CountdownTimer
                    expiryTimestamp={escrowExpiry}
                    label=""
                    showLabel={false}
                  />
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-success/8 border border-success/20 rounded-lg">
                <ShieldAlert className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span className="text-[10px] text-success/80 leading-relaxed">
                  100% refundable via Soroban smart contract
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
