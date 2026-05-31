/**
 * SA Prime Properties — Broker Escrow Detail Page
 *
 * Route: /broker/escrow/:lotId
 *
 * Full escrow record from the broker's perspective. Read-only — only the
 * buyer can release or refund. Mirrors the buyer's /vault but adds
 * broker-specific context (credential status, doc hash, doc window).
 */
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import { CredentialUploader } from "@/app/components/CredentialUploader";
import { ExplorerLink } from "@/app/components/ExplorerLink";
import { CountdownTimer } from "@/components/CountdownTimer";
import {
  getEscrowState,
  formatStroopsAsXlm,
  xlmToPhp,
  type EscrowState,
} from "@/lib/stellar";
import { truncateAddress } from "@/lib/freighter";
import {
  SAMPLE_LOTS,
  PHP_CONVERSION_RATE,
  ESCROW_EXPIRY_MS,
  BROKER_DOC_WINDOW_MS,
  EXPLORER_BASE,
  CONTRACT_ADDRESS,
  BROKER_ADDRESS,
} from "@/lib/constants";
import {
  ArrowLeft,
  Loader2,
  Clock,
  Hash,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  ArrowLeftRight,
  Shield,
} from "lucide-react";

interface BrokerEscrowDetailProps {
  publicKey: string | null;
}

interface CredentialRecord {
  hash: string;
  txHash: string | null;
  submittedAt: number;
}

function FundsBadge({ status }: { status: number | null }) {
  const map: Record<
    string,
    { label: string; cls: string; icon: ReactNode }
  > = {
    "0": {
      label: "Locked",
      cls: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
      icon: <Lock className="w-3.5 h-3.5" />,
    },
    "1": {
      label: "Released",
      cls: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30",
      icon: <Unlock className="w-3.5 h-3.5" />,
    },
    "2": {
      label: "Refunded",
      cls: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30",
      icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
    },
  };

  const cfg = map[String(status)] ?? {
    label: "No Escrow",
    cls: "bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/20",
    icon: null,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${cfg.cls}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export function BrokerEscrowDetail({ publicKey }: BrokerEscrowDetailProps) {
  const { lotId } = useParams<{ lotId: string }>();
  const lot = SAMPLE_LOTS.find((l) => l.id === lotId);

  const [escrow, setEscrow] = useState<EscrowState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [credential, setCredential] = useState<CredentialRecord | null>(() => {
    if (typeof window !== "undefined") {
      const isVerified = sessionStorage.getItem("sa_prime_simulated_docs_verified") === "true";
      const hash = sessionStorage.getItem("sa_prime_simulated_doc_hash");
      if (isVerified && hash) {
        return { hash, txHash: null, submittedAt: Date.now() };
      }
    }
    return null;
  });
  const [uploaderOpen, setUploaderOpen] = useState(false);

  // Simulate lock time 4 hours ago for demo countdown display
  const [lockTimestamp] = useState(Date.now() - 4 * 60 * 60 * 1000);

  useEffect(() => {
    const fetch = async () => {
      try {
        if (!lot) return;
        const contractLotId = `LOT-${lot.id.padStart(2, '0')}`;
        const state = await getEscrowState(contractLotId);
        setEscrow(state);
      } catch (e) {
        console.error("[BrokerEscrowDetail]", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
    const id = setInterval(fetch, 10_000);
    return () => clearInterval(id);
  }, []);

  if (!lot) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex flex-col items-center justify-center px-6">
        <p className="text-[#6B7280] mb-4">Property not found.</p>
        <Link
          to="/broker"
          className="text-[#B8952A] text-sm hover:underline"
        >
          ← Back to Broker Portal
        </Link>
      </div>
    );
  }

  const isLocked = escrow?.status !== null && escrow?.status !== undefined && lotId === "7";
  const onChainStatus = isLocked ? (escrow?.status ?? 0) : null;
  const amountXlm = escrow?.amount
    ? formatStroopsAsXlm(escrow.amount)
    : lot.priceXLM.toLocaleString();
  const amountPhp = escrow?.amount
    ? xlmToPhp(Number(escrow.amount) / 1e7)
    : (lot.priceXLM * PHP_CONVERSION_RATE).toLocaleString("en-PH");

  const escrowExpiry = lockTimestamp + ESCROW_EXPIRY_MS;
  const docExpiry = lockTimestamp + BROKER_DOC_WINDOW_MS;
  const lockDate = new Date(lockTimestamp).toLocaleString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isDocsAnchored = !!credential;

  return (
    <div className="min-h-screen bg-[#0A0E1A]">
      {/* Header */}
      <div className="border-b border-[#B8952A]/15 bg-[#111827]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] bg-[#F59E0B]/12 border border-[#F59E0B]/30 text-[#F59E0B] px-3 py-1 rounded-full font-mono font-bold uppercase tracking-widest">
              ● DEMO MODE
            </span>
            <span className="text-[10px] bg-[#F59E0B]/12 border border-[#F59E0B]/30 text-[#F59E0B] px-3 py-1 rounded-full font-mono font-bold uppercase tracking-widest">
              ● TESTNET
            </span>
          </div>

          {/* Back link */}
          <Link
            to="/broker"
            className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#B8952A] transition-colors mb-3 font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Broker Portal
          </Link>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                className="text-4xl font-bold text-[#F5F0E8] mb-1"
              >
                SA Prime Properties — Escrow Detail
              </h1>
              <p className="text-sm text-[#6B7280] font-mono">
                LOT-{lot.id.padStart(2, "0")} · {lot.name} · {lot.location}
              </p>
            </div>
            <FundsBadge status={onChainStatus} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-[#B8952A] animate-spin" />
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── Left: Escrow Record + Credential Status ── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Buyer can now authorize banner */}
              {isDocsAnchored && (
                <div className="flex items-start gap-3 p-5 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#22C55E]">
                      Waiting for buyer to authorize release
                    </p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      Credentials are anchored. The buyer can now approve fund
                      release from their Trust Vault.
                    </p>
                  </div>
                </div>
              )}

              {/* Escrow Record Card */}
              <div className="bg-[#111827] border border-[#B8952A]/20 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-[#B8952A]/10 bg-gradient-to-br from-[#1A2233] to-[#111827]">
                  <h2
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                    }}
                    className="text-xl font-bold text-[#E8D5A0] mb-1"
                  >
                    Escrow Record
                  </h2>
                  <p className="text-[10px] text-[#6B7280] font-mono uppercase tracking-wider">
                    SA Prime Properties · Broker View · Read-Only
                  </p>
                </div>

                <div className="p-6 space-y-0 divide-y divide-[#B8952A]/5">
                  {[
                    {
                      label: "Buyer Address",
                      value: truncateAddress(escrow?.buyer) || "Pending lock",
                      mono: true,
                    },
                    {
                      label: "Broker Address",
                      value: truncateAddress(escrow?.broker) || truncateAddress(publicKey),
                      mono: true,
                    },
                    {
                      label: "Reservation Amount",
                      value: `${amountXlm} XLM`,
                      sub: `≈ ₱${amountPhp}`,
                      highlight: "text-[#B8952A]",
                      mono: true,
                    },
                    {
                      label: "Lock Date",
                      value: lockDate,
                      mono: false,
                    },
                    {
                      label: "Escrow Expiry",
                      value: new Date(escrowExpiry).toLocaleDateString("en-PH", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }),
                      mono: false,
                    },
                    {
                      label: "Contract",
                      value: `${CONTRACT_ADDRESS.slice(0, 8)}...${CONTRACT_ADDRESS.slice(-8)}`,
                      mono: true,
                      small: true,
                    },
                    {
                      label: "Funds Status",
                      value:
                        onChainStatus === 0
                          ? "Locked"
                          : onChainStatus === 1
                          ? "Released"
                          : onChainStatus === 2
                          ? "Refunded"
                          : "No Active Escrow",
                      highlight:
                        onChainStatus === 0
                          ? "text-[#F59E0B]"
                          : onChainStatus === 1
                          ? "text-[#22C55E]"
                          : onChainStatus === 2
                          ? "text-[#EF4444]"
                          : "text-[#6B7280]",
                      mono: false,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-start justify-between py-3.5 gap-6"
                    >
                      <span className="text-sm text-[#6B7280] shrink-0">
                        {item.label}
                      </span>
                      <div className="text-right">
                        <span
                          className={`text-sm ${item.mono ? "font-mono" : ""} ${
                            item.highlight || "text-[#F5F0E8]"
                          } ${item.small ? "text-xs" : ""}`}
                        >
                          {item.value}
                        </span>
                        {item.sub && (
                          <p className="text-xs text-[#6B7280] font-mono mt-0.5">
                            {item.sub}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Read-only notice */}
                <div className="px-6 pb-5">
                  <div className="flex items-center gap-2 p-3 bg-[#0A0E1A] rounded-lg border border-[#6B7280]/10">
                    <Shield className="w-3.5 h-3.5 text-[#6B7280]" />
                    <p className="text-[10px] text-[#6B7280]">
                      Read-only view — only the buyer can authorize release or
                      refund via their Trust Vault
                    </p>
                  </div>
                </div>
              </div>

              {/* Credential Status Card */}
              <div className="bg-[#111827] border border-[#B8952A]/20 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-[#B8952A]/10">
                  <h2
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                    }}
                    className="text-xl font-bold text-[#F5F0E8] flex items-center gap-2"
                  >
                    <Hash className="w-5 h-5 text-[#B8952A]" />
                    Credential Status
                  </h2>
                </div>

                <div className="p-6">
                  {isDocsAnchored ? (
                    <div className="space-y-5">
                      {/* Anchored badge */}
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                        <span className="font-semibold text-[#22C55E]">
                          Anchored on Stellar Testnet
                        </span>
                      </div>

                      {/* Hash block */}
                      <div className="p-4 bg-[#0A0E1A] rounded-xl border border-[#B8952A]/15">
                        <p className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-2">
                          SHA-256 Credential Hash
                        </p>
                        <code className="font-mono text-xs text-[#E8D5A0] break-all leading-relaxed">
                          0x{credential!.hash}
                        </code>
                      </div>

                      {/* TX explorer link */}
                      {credential!.txHash ? (
                        <ExplorerLink
                          hash={credential!.txHash}
                          label="View Anchor Transaction"
                        />
                      ) : (
                        <p className="text-xs text-[#6B7280]/70 font-mono italic">
                          Demo mode: on-chain call was simulated
                        </p>
                      )}

                      {/* Submitted time */}
                      <p className="text-xs text-[#6B7280] font-mono">
                        Submitted at{" "}
                        {new Date(credential!.submittedAt).toLocaleTimeString(
                          "en-PH"
                        )}
                      </p>
                    </div>
                  ) : isLocked ? (
                    <div className="space-y-5">
                      <div className="flex items-start gap-3 p-4 bg-[#F59E0B]/8 border border-[#F59E0B]/20 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-[#F59E0B]">
                            Credentials Pending
                          </p>
                          <p className="text-xs text-[#6B7280] mt-1">
                            Submit PRC ID, TCT/CCT title, and zoning permits
                            below to allow buyer authorization.
                          </p>
                        </div>
                      </div>

                      {/* Pending doc list */}
                      <div className="space-y-2">
                        {[
                          "PRC Broker ID (Professional Regulation Commission)",
                          "TCT/CCT Title (Transfer Certificate of Title)",
                          "Municipal Zoning Permits",
                        ].map((doc) => (
                          <div
                            key={doc}
                            className="flex items-center gap-3 p-3 bg-[#0A0E1A] border border-[#B8952A]/5 rounded-lg"
                          >
                            <div className="w-4 h-4 rounded border-2 border-[#6B7280]/30 shrink-0" />
                            <span className="text-xs text-[#6B7280]">{doc}</span>
                          </div>
                        ))}
                      </div>

                      {/* Upload toggle */}
                      {publicKey === BROKER_ADDRESS && (
                        <button
                          onClick={() => setUploaderOpen((p) => !p)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#B8952A] to-[#8A6D1F] text-[#0A0E1A] font-bold text-xs uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02]"
                        >
                          <Shield className="w-4 h-4" />
                          {uploaderOpen
                            ? "Collapse Uploader"
                            : "Open Credential Uploader"}
                        </button>
                      )}

                      {/* Inline uploader */}
                      {uploaderOpen && publicKey === BROKER_ADDRESS && (
                        <div className="mt-4">
                          <CredentialUploader
                            propertyId={lot.id}
                            propertyName={lot.name}
                            publicKey={publicKey}
                            onSuccess={(hash, txHash) => {
                              setCredential({ hash, txHash, submittedAt: Date.now() });
                              setUploaderOpen(false);
                            }}
                            onClose={() => setUploaderOpen(false)}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[#6B7280]">
                      No active escrow on this property.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right: Timers + Timeline ── */}
            <div className="lg:col-span-1 space-y-6">
              {/* Countdown windows */}
              <div className="bg-[#111827] border border-[#B8952A]/20 rounded-2xl p-6">
                <h3
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                  }}
                  className="text-lg font-bold text-[#F5F0E8] mb-6 flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-[#B8952A]" />
                  Time Windows
                </h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold mb-2">
                      48-Hr Doc Window
                    </p>
                    <CountdownTimer
                      expiryTimestamp={docExpiry}
                      showLabel={false}
                    />
                  </div>
                  <div className="border-t border-[#B8952A]/10 pt-5">
                    <p className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold mb-2">
                      7-Day Escrow Expiry
                    </p>
                    <CountdownTimer
                      expiryTimestamp={escrowExpiry}
                      showLabel={false}
                    />
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="bg-[#111827] border border-[#B8952A]/20 rounded-2xl p-6">
                <h3
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                  }}
                  className="text-lg font-bold text-[#F5F0E8] mb-6 flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-[#B8952A]" />
                  Escrow Timeline
                </h3>

                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:border-l before:border-[#B8952A]/15">
                  {[
                    {
                      label: "Funds Locked",
                      desc: `${amountXlm} XLM secured on-chain`,
                      done: true,
                      dot: "bg-[#B8952A]",
                      border: "border-[#B8952A]",
                      glow: "shadow-[0_0_10px_rgba(184,149,42,0.35)]",
                    },
                    {
                      label: "Credentials Submitted",
                      desc: isDocsAnchored
                        ? "Anchored on Stellar Testnet"
                        : "Pending broker action",
                      done: isDocsAnchored,
                      dot: isDocsAnchored
                        ? "bg-[#22C55E]"
                        : "bg-[#F59E0B] animate-pulse",
                      border: isDocsAnchored
                        ? "border-[#22C55E]"
                        : "border-[#F59E0B]",
                      glow: isDocsAnchored
                        ? "shadow-[0_0_10px_rgba(34,197,94,0.25)]"
                        : "shadow-[0_0_10px_rgba(245,158,11,0.25)]",
                    },
                    {
                      label: "Awaiting Buyer Action",
                      desc:
                        onChainStatus === 1
                          ? "Released to broker"
                          : onChainStatus === 2
                          ? "Refunded to buyer"
                          : "Buyer must authorize",
                      done:
                        onChainStatus !== null && onChainStatus !== 0,
                      dot:
                        onChainStatus !== null && onChainStatus !== 0
                          ? "bg-[#22C55E]"
                          : "bg-transparent",
                      border:
                        onChainStatus !== null && onChainStatus !== 0
                          ? "border-[#22C55E]"
                          : "border-[#B8952A]/20",
                      glow:
                        onChainStatus !== null && onChainStatus !== 0
                          ? "shadow-[0_0_10px_rgba(34,197,94,0.25)]"
                          : "",
                    },
                  ].map((step) => (
                    <div
                      key={step.label}
                      className="relative z-10 flex items-start gap-4"
                    >
                      <div
                        className={`w-8 h-8 rounded-full bg-[#111827] border-2 flex items-center justify-center shrink-0 ${step.border} ${step.glow}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${step.dot}`}
                        />
                      </div>
                      <div className="pt-1">
                        <h4 className="font-semibold text-sm text-[#F5F0E8]">
                          {step.label}
                        </h4>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
