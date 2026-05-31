/**
 * SA Prime Properties — Broker Portal Page
 *
 * Route: /broker
 *
 * SA Prime Properties broker interface for managing active escrow reservations
 * and anchoring credential documents on the Stellar testnet.
 *
 * DEMO MODE — no real files read. SHA-256 hashes only.
 */
import { useState, useEffect, useCallback } from "react";
import { CredentialUploader } from "@/app/components/CredentialUploader";
import { BrokerEscrowCard } from "@/app/components/BrokerEscrowCard";
import { showTransactionError } from "@/components/TransactionToast";
import { connectWallet } from "@/lib/freighter";
import {
  getAllEscrows,
  formatStroopsAsXlm,
  xlmToPhp,
  type EscrowState,
} from "@/lib/stellar";
import {
  SAMPLE_LOTS,
  BROKER_ADDRESS,
  PHP_CONVERSION_RATE,
  CONTRACT_ADDRESS,
} from "@/lib/constants";
import {
  Shield,
  Wallet,
  AlertTriangle,
  Loader2,
  Building2,
  RefreshCw,
} from "lucide-react";

interface BrokerPageProps {
  publicKey: string | null;
  onConnect: (key: string) => void;
}

interface CredentialRecord {
  hash: string;
  txHash: string | null;
  submittedAt: number;
}

export function BrokerPage({ publicKey, onConnect }: BrokerPageProps) {
  const [escrows, setEscrows] = useState<Record<string, EscrowState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Map lotId → credential record, initialized from sessionStorage
  const [credentials, setCredentials] = useState<
    Record<string, CredentialRecord>
  >(() => {
    // Restore credential state from sessionStorage on mount
    const restored: Record<string, CredentialRecord> = {};
    if (typeof window !== "undefined") {
      const isVerified = sessionStorage.getItem("sa_prime_simulated_docs_verified") === "true";
      const hash = sessionStorage.getItem("sa_prime_simulated_doc_hash");
      if (isVerified && hash) {
        // Restore for all locked lots
        SAMPLE_LOTS.filter(l => l.status === 1).forEach(lot => {
          restored[lot.id] = { hash, txHash: null, submittedAt: Date.now() };
        });
      }
    }
    return restored;
  });

  const isRegisteredBroker = publicKey === BROKER_ADDRESS;

  /* ── Fetch live contract state ── */
  const fetchEscrow = useCallback(async (showLoader = false) => {
    if (showLoader) setIsRefreshing(true);
    try {
      const lotIds = SAMPLE_LOTS.map(l => `LOT-${l.id.padStart(2, '0')}`);
      const data = await getAllEscrows(lotIds);
      setEscrows(data);
    } catch (e) {
      console.error("[BrokerPage] fetchEscrow:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEscrow();
    const id = setInterval(() => fetchEscrow(), 15_000);
    return () => clearInterval(id);
  }, [fetchEscrow]);

  const handleConnect = async () => {
    try {
      const pk = await connectWallet();
      if (pk) onConnect(pk);
    } catch (e: any) {
      showTransactionError(e?.message || "Failed to connect Freighter");
    }
  };

  const handleCredentialSuccess = (
    lotId: string,
    hash: string,
    txHash: string | null
  ) => {
    setCredentials((prev) => ({
      ...prev,
      [lotId]: { hash, txHash, submittedAt: Date.now() },
    }));
  };

  /* ── Build escrow records per lot ── */
  const buildEscrowRecord = (lotId: string) => {
    const lot = SAMPLE_LOTS.find((l) => l.id === lotId);
    const contractLotId = `LOT-${lotId.padStart(2, '0')}`;
    const e = escrows[contractLotId];
    const isLotLocked = e && e.status !== null && e.status !== undefined;
    return {
      buyer: isLotLocked ? (e.buyer ?? "GDEMO_BUYER_ADDRESS_FOR_DISPLAY_ONLY") : null,
      amountStroops: isLotLocked ? (e.amount ?? (lot!.priceXLM * 1e7)) : null,
      onChainStatus: isLotLocked ? (e.status ?? 0) : null,
    };
  };

  const activeLots = SAMPLE_LOTS.filter((l) => {
    const e = escrows[`LOT-${l.id.padStart(2, '0')}`];
    return e && e.status !== null && e.status !== undefined;
  });
  const otherLots = SAMPLE_LOTS.filter((l) => !activeLots.includes(l));

  const totalLockedXlm = activeLots.reduce(
    (sum, l) => sum + l.priceXLM,
    0
  );

  return (
    <div className="min-h-screen bg-[#0A0E1A]">
      {/* ── Page Header ── */}
      <div className="border-b border-[#B8952A]/15 bg-[#111827]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            {/* Title Block */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] bg-[#F59E0B]/12 border border-[#F59E0B]/30 text-[#F59E0B] px-3 py-1 rounded-full font-mono font-bold uppercase tracking-widest">
                  ● DEMO MODE
                </span>
                <span className="text-[10px] bg-[#F59E0B]/12 border border-[#F59E0B]/30 text-[#F59E0B] px-3 py-1 rounded-full font-mono font-bold uppercase tracking-widest">
                  ● TESTNET
                </span>
              </div>
              <h1
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                className="text-4xl font-bold text-[#F5F0E8] leading-tight mb-1"
              >
                SA Prime Properties · Broker Portal
              </h1>
              <p className="text-sm text-[#6B7280]">
                SA Prime Properties · Document Verification & Credential Anchoring
              </p>
            </div>

            {/* Verified Badge */}
            <div className="flex flex-col items-end gap-2">
              {isRegisteredBroker && (
                <span className="text-[10px] text-[#22C55E] font-mono font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Verified Broker Wallet
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">

        {/* ── Connect Prompt ── */}
        {!publicKey && (
          <div className="flex flex-col items-center justify-center py-20 border border-[#B8952A]/15 bg-[#111827] rounded-2xl">
            <div className="w-16 h-16 rounded-2xl border border-[#B8952A]/20 bg-[#B8952A]/5 flex items-center justify-center mb-6">
              <Wallet className="w-8 h-8 text-[#B8952A]/50" />
            </div>
            <h3
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="text-2xl font-bold text-[#F5F0E8] mb-2"
            >
              Broker Authentication Required
            </h3>
            <p className="text-[#6B7280] text-sm text-center max-w-sm mb-6">
              Connect the registered SA Prime Properties broker wallet to access
              credential management.
            </p>
            <button
              onClick={handleConnect}
              id="broker-page-connect-btn"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#B8952A] to-[#8A6D1F] text-[#0A0E1A] font-bold text-sm uppercase tracking-widest rounded-xl shadow-[0_4px_20px_rgba(184,149,42,0.3)] hover:scale-[1.02] transition-all"
            >
              <Wallet className="w-4 h-4" />
              Connect Broker Wallet
            </button>
          </div>
        )}

        {publicKey && (
          <>
            {/* ── Stats Row ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Properties",
                  value: SAMPLE_LOTS.length,
                  sub: "in portfolio",
                  color: "text-[#F5F0E8]",
                },
                {
                  label: "Active Escrows",
                  value: activeLots.length,
                  sub: "locked reservations",
                  color: "text-[#F59E0B]",
                },
                {
                  label: "XLM Locked",
                  value: `${totalLockedXlm.toLocaleString()}`,
                  sub: "XLM in escrow",
                  color: "text-[#B8952A]",
                },
                {
                  label: "Contract",
                  value: `${CONTRACT_ADDRESS.slice(0, 6)}...`,
                  sub: "Soroban Testnet",
                  color: "text-[#6B7280]",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[#111827] border border-[#B8952A]/10 rounded-xl p-5"
                >
                  <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold mb-1">
                    {stat.label}
                  </p>
                  <p
                    className={`text-2xl font-mono font-bold ${stat.color}`}
                    style={
                      stat.label === "Active Escrows" ||
                      stat.label === "Total Properties"
                        ? { fontFamily: "'Cormorant Garamond', Georgia, serif" }
                        : {}
                    }
                  >
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">
                    {stat.sub}
                  </p>
                </div>
              ))}
            </div>

            {/* ── Active Escrow Table ── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  className="text-2xl font-bold text-[#F5F0E8]"
                >
                  Active Escrow Lots
                </h2>
                <button
                  onClick={() => fetchEscrow(true)}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#6B7280] hover:text-[#B8952A] border border-[#B8952A]/15 rounded-lg hover:border-[#B8952A]/30 transition-all disabled:opacity-50 font-mono"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 mb-3 bg-[#111827]/60 rounded-xl border border-[#B8952A]/10">
                {[
                  "Property",
                  "Buyer",
                  "Amount XLM",
                  "PHP",
                  "Status",
                  "Action",
                ].map((col) => (
                  <span
                    key={col}
                    className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold"
                  >
                    {col}
                  </span>
                ))}
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-16 border border-[#B8952A]/10 rounded-2xl bg-[#111827]">
                  <Loader2 className="w-6 h-6 text-[#B8952A] animate-spin mr-3" />
                  <span className="text-[#6B7280] text-sm font-mono">
                    Reading from Stellar Testnet...
                  </span>
                </div>
              ) : activeLots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 border border-[#B8952A]/10 rounded-2xl bg-[#111827]">
                  <Building2 className="w-10 h-10 text-[#B8952A]/30 mb-3" />
                  <p className="text-[#6B7280] text-sm">
                    No active escrow reservations
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeLots.map((lot) => (
                    <BrokerEscrowCard
                      key={lot.id}
                      lot={lot}
                      escrow={buildEscrowRecord(lot.id)}
                      publicKey={publicKey}
                      credentialHash={credentials[lot.id]?.hash ?? null}
                      onCredentialSuccess={handleCredentialSuccess}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Other Properties (read-only) ── */}
            {otherLots.length > 0 && (
              <div>
                <h2
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  className="text-2xl font-bold text-[#F5F0E8] mb-4"
                >
                  Available Properties
                </h2>
                <div className="space-y-3 opacity-60">
                  {otherLots.map((lot) => (
                    <BrokerEscrowCard
                      key={lot.id}
                      lot={lot}
                      escrow={buildEscrowRecord(lot.id)}
                      publicKey={publicKey}
                      credentialHash={null}
                      onCredentialSuccess={handleCredentialSuccess}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Footer Disclaimer ── */}
            <div className="border-t border-[#B8952A]/10 pt-8">
              <p className="text-xs text-[#6B7280]/60 text-center leading-relaxed max-w-2xl mx-auto">
                DEMO: In production, real PDF files would be hashed client-side
                and their IPFS CID stored on-chain. No document content ever
                leaves your device. All Soroban calls use the Stellar Testnet
                only. This platform is for demonstration purposes.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
