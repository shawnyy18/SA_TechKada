/**
 * SA Prime Properties — Broker Escrow Detail Page
 *
 * Full escrow record for a specific lot, from the broker's perspective.
 * Mirrors the buyer's /vault page with broker-specific context.
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  SAMPLE_LOTS,
  PHP_CONVERSION_RATE,
  ESCROW_EXPIRY_MS,
  EXPLORER_BASE,
} from "@/lib/constants";
import {
  getContractStatus,
  formatStroopsAsXlm,
  xlmToPhp,
  type EscrowState,
} from "@/lib/stellar";
import { truncateAddress } from "@/lib/freighter";
import { EscrowStatusBadge } from "@/components/EscrowStatusBadge";
import { CountdownTimer } from "@/components/CountdownTimer";
import {
  ArrowLeft,
  Loader2,
  Lock,
  CheckCircle2,
  Clock,
  Hash,
  ExternalLink,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

interface BrokerEscrowProps {
  publicKey: string | null;
}

export function BrokerEscrow({ publicKey }: BrokerEscrowProps) {
  const { lotId } = useParams();
  const lot = SAMPLE_LOTS.find((l) => l.id === lotId);

  const [escrow, setEscrow] = useState<EscrowState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Simulate lock time 4 hours ago for demo countdown
  const [lockTimestamp] = useState<number>(Date.now() - 4 * 60 * 60 * 1000);
  const [credentialHash] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const state = await getContractStatus();
        setEscrow(state);
      } catch (e) {
        console.error("[BrokerEscrow] Failed to fetch:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, []);

  if (!lot) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 text-center">
        <p className="text-muted">Property not found.</p>
        <Link to="/broker" className="text-gold text-sm mt-4 inline-block">
          ← Back to Broker Portal
        </Link>
      </div>
    );
  }

  const phpEquiv = (lot.priceXLM * PHP_CONVERSION_RATE).toLocaleString("en-PH");
  const escrowExpiry = lockTimestamp + ESCROW_EXPIRY_MS;
  const docExpiry = lockTimestamp + 48 * 60 * 60 * 1000;

  const currentStatus = escrow?.status ?? null;
  const amountXlm = escrow?.amount
    ? formatStroopsAsXlm(escrow.amount)
    : lot.priceXLM.toLocaleString();
  const amountPhp = escrow?.amount
    ? xlmToPhp(Number(escrow.amount) / 1e7)
    : phpEquiv;

  const isCredentialSubmitted = !!credentialHash || escrow?.docsVerified;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        {/* Demo + Testnet badges */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] bg-amber/10 border border-amber/30 text-amber px-3 py-1 rounded-full font-mono font-bold uppercase tracking-widest">
            ● DEMO MODE
          </span>
          <span className="text-[10px] bg-amber/10 border border-amber/30 text-amber px-3 py-1 rounded-full font-mono font-bold uppercase tracking-widest">
            ● TESTNET
          </span>
        </div>

        <Link
          to="/broker"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-gold transition-colors mb-4 font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Broker Portal
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-serif mb-2">{lot.name}</h1>
            <p className="text-muted font-mono text-sm">
              LOT-{lot.id.padStart(2, "0")} · {lot.location}
            </p>
          </div>
          <EscrowStatusBadge status={currentStatus as 0 | 1 | 2 | null} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Escrow Record */}
            <div className="bg-surface border border-gold/20 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-gold/10 bg-gradient-to-br from-[#1A2233] to-surface">
                <h2 className="font-serif text-xl text-gold-light mb-1">
                  Escrow Record
                </h2>
                <p className="text-xs text-muted font-mono">
                  SA Prime Properties · Broker View
                </p>
              </div>
              <div className="p-6 space-y-4">
                {[
                  {
                    label: "Buyer Address",
                    value: truncateAddress(escrow?.buyer) || "Pending",
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
                    sub: `≈ ₱${amountPhp} PHP`,
                    mono: true,
                    highlight: "text-gold-light",
                  },
                  {
                    label: "Lock Date",
                    value: new Date(lockTimestamp).toLocaleDateString("en-PH", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    mono: false,
                  },
                  {
                    label: "Expiry",
                    value: new Date(escrowExpiry).toLocaleDateString("en-PH", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }),
                    mono: false,
                  },
                  {
                    label: "Funds Status",
                    value:
                      currentStatus === 0
                        ? "Locked"
                        : currentStatus === 1
                        ? "Released"
                        : currentStatus === 2
                        ? "Refunded"
                        : "No Escrow",
                    mono: false,
                    highlight:
                      currentStatus === 0
                        ? "text-amber"
                        : currentStatus === 1
                        ? "text-success"
                        : currentStatus === 2
                        ? "text-error"
                        : "text-muted",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start justify-between py-3 border-b border-gold/5 last:border-b-0 gap-4"
                  >
                    <span className="text-sm text-muted shrink-0">
                      {item.label}
                    </span>
                    <div className="text-right">
                      <span
                        className={`text-sm ${item.mono ? "font-mono" : ""} ${
                          item.highlight || "text-off-white"
                        }`}
                      >
                        {item.value}
                      </span>
                      {item.sub && (
                        <p className="text-xs text-muted font-mono mt-0.5">
                          {item.sub}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Credential Status */}
            <div className="bg-surface border border-gold/20 rounded-2xl p-6">
              <h2 className="font-serif text-xl mb-6 flex items-center gap-2">
                <Hash className="w-5 h-5 text-gold" />
                Credential Status
              </h2>

              {isCredentialSubmitted ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-success/10 border border-success/30 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-success">
                        Credentials Anchored on Stellar Testnet
                      </p>
                      <p className="text-xs text-muted mt-1">
                        Buyer can now authorize the fund release
                      </p>
                    </div>
                  </div>

                  {credentialHash && (
                    <div className="p-4 bg-navy rounded-xl border border-gold/10">
                      <p className="text-[10px] text-muted uppercase tracking-wider mb-2 font-semibold">
                        SHA-256 Credential Hash
                      </p>
                      <p className="font-mono text-xs text-gold-light break-all">
                        0x{credentialHash}
                      </p>
                    </div>
                  )}

                  {/* Green banner */}
                  <div className="p-4 bg-success/8 border border-success/20 rounded-xl">
                    <p className="text-xs text-success/90 font-semibold">
                      ✓ Buyer can now authorize release
                    </p>
                    <p className="text-xs text-muted mt-1">
                      The buyer's wallet will see the "Authorize Release" button
                      enabled in their Trust Vault.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-amber/10 border border-amber/20 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-amber shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber">
                        Credentials Pending
                      </p>
                      <p className="text-xs text-muted mt-1">
                        Submit PRC ID, TCT/CCT title, and zoning permits from
                        the Broker Portal to unlock buyer authorization.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      "PRC Broker ID (Professional Regulation Commission)",
                      "TCT/CCT Title (Transfer Certificate of Title)",
                      "Municipal Zoning Permits",
                    ].map((doc) => (
                      <div
                        key={doc}
                        className="flex items-center gap-3 p-3 bg-navy/60 border border-gold/5 rounded-lg"
                      >
                        <div className="w-4 h-4 rounded border-2 border-muted/40 shrink-0" />
                        <span className="text-xs text-muted">{doc}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    to="/broker"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-gold to-[#8A6D1F] text-navy font-bold text-xs uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02]"
                  >
                    Go to Credential Submission
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel — Timeline + Countdown */}
          <div className="lg:col-span-1 space-y-6">
            {/* Countdown Cards */}
            <div className="bg-surface border border-gold/20 rounded-2xl p-6">
              <h3 className="font-serif text-lg mb-5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold" />
                Time Windows
              </h3>
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-2">
                    48-Hr Doc Window
                  </p>
                  <CountdownTimer
                    expiryTimestamp={docExpiry}
                    showLabel={false}
                  />
                </div>
                <div className="border-t border-gold/10 pt-5">
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-2">
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
            <div className="bg-surface border border-gold/20 rounded-2xl p-6">
              <h3 className="font-serif text-lg mb-6 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold" />
                Timeline
              </h3>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:border-l before:border-gold/20">
                {[
                  {
                    label: "Funds Locked",
                    done: true,
                    desc: `${amountXlm} XLM secured`,
                    dotColor: "bg-gold",
                    borderColor: "border-gold",
                  },
                  {
                    label: "Credentials Submitted",
                    done: !!isCredentialSubmitted,
                    desc: isCredentialSubmitted ? "Anchored on-chain" : "Pending broker action",
                    dotColor: isCredentialSubmitted ? "bg-success" : "bg-amber animate-pulse",
                    borderColor: isCredentialSubmitted ? "border-success" : "border-amber",
                  },
                  {
                    label: "Awaiting Buyer Action",
                    done: currentStatus !== null && currentStatus !== 0,
                    desc:
                      currentStatus === 1
                        ? "Released to broker"
                        : currentStatus === 2
                        ? "Refunded to buyer"
                        : "Pending",
                    dotColor:
                      currentStatus !== null && currentStatus !== 0
                        ? "bg-success"
                        : "bg-transparent",
                    borderColor:
                      currentStatus !== null && currentStatus !== 0
                        ? "border-success"
                        : "border-gold/20",
                  },
                ].map((item) => (
                  <div key={item.label} className="relative z-10 flex items-start gap-4">
                    <div
                      className={`w-8 h-8 rounded-full bg-surface border-2 flex items-center justify-center shrink-0 ${item.borderColor}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${item.dotColor}`} />
                    </div>
                    <div className="pt-1">
                      <h4 className="font-semibold text-sm text-off-white">
                        {item.label}
                      </h4>
                      <p className="text-xs text-muted mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
