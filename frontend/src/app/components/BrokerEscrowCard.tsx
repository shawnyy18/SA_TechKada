/**
 * SA Prime Properties — Broker Escrow Card Component
 *
 * Displays a single property row in the broker's active escrow table.
 * Shows: property name, buyer address (truncated), amount XLM + PHP,
 * status badge, and the "Upload Credentials" action button that
 * expands the CredentialUploader panel inline.
 */
import { useState } from "react";
import type { Key } from "react";
import { Link } from "react-router-dom";
import { CredentialUploader } from "./CredentialUploader";
import { truncateAddress } from "@/lib/freighter";
import { PHP_CONVERSION_RATE, EXPLORER_BASE, BROKER_ADDRESS } from "@/lib/constants";
import {
  Lock,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

interface Lot {
  id: string;
  name: string;
  location: string;
  priceXLM: number;
  status: number;
}

interface EscrowRecord {
  buyer: string | null;
  amountStroops: number | null;
  onChainStatus: number | null; // 0=Locked 1=Released 2=Refunded
}

interface BrokerEscrowCardProps {
  lot: Lot;
  escrow: EscrowRecord;
  publicKey: string;
  credentialHash: string | null;
  onCredentialSuccess: (lotId: string, hash: string, txHash: string | null) => void;
  key?: Key | null;
}

function StatusBadge({ status }: { status: number | null }) {
  if (status === null)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#6B7280]/10 text-[#6B7280] border border-[#6B7280]/20">
        <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" />
        No Escrow
      </span>
    );
  if (status === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
        Locked
      </span>
    );
  if (status === 1)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
        Released
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30">
      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
      Refunded
    </span>
  );
}

export function BrokerEscrowCard({
  lot,
  escrow,
  publicKey,
  credentialHash,
  onCredentialSuccess,
}: BrokerEscrowCardProps) {
  const [uploaderOpen, setUploaderOpen] = useState(false);

  const isLocked = escrow.onChainStatus === 0;
  const amountXlm =
    escrow.amountStroops !== null
      ? (Number(escrow.amountStroops) / 1e7).toLocaleString("en-US", {
          maximumFractionDigits: 2,
        })
      : lot.priceXLM.toLocaleString();
  const phpEquiv = (
    (escrow.amountStroops !== null
      ? Number(escrow.amountStroops) / 1e7
      : lot.priceXLM) * PHP_CONVERSION_RATE
  ).toLocaleString("en-PH", { maximumFractionDigits: 2 });

  return (
    <div className="border border-[#B8952A]/20 rounded-2xl overflow-hidden bg-[#111827] hover:border-[#B8952A]/40 transition-colors">
      {/* Table Row */}
      <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 items-center px-6 py-5">
        {/* Property */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isLocked
                ? "bg-[#B8952A]/15 border border-[#B8952A]/30"
                : "bg-[#6B7280]/10 border border-[#6B7280]/20"
            }`}
          >
            <Lock
              className={`w-3.5 h-3.5 ${
                isLocked ? "text-[#B8952A]" : "text-[#6B7280]"
              }`}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#F5F0E8] truncate">
              {lot.name}
            </p>
            <p className="text-[10px] text-[#6B7280] font-mono">
              LOT-{lot.id.padStart(2, "0")} · {lot.location}
            </p>
          </div>
        </div>

        {/* Buyer */}
        <div>
          {escrow.buyer ? (
            <span className="font-mono text-xs text-[#F5F0E8]/70">
              {truncateAddress(escrow.buyer)}
            </span>
          ) : (
            <span className="font-mono text-xs text-[#6B7280]">—</span>
          )}
        </div>

        {/* Amount XLM */}
        <div>
          <p className="font-mono text-sm font-bold text-[#B8952A]">
            {amountXlm}
          </p>
          <p className="text-[10px] text-[#6B7280] font-mono">XLM</p>
        </div>

        {/* PHP */}
        <div>
          <p className="font-mono text-sm text-[#F5F0E8]/70">₱{phpEquiv}</p>
          <p className="text-[10px] text-[#6B7280] font-mono">PHP</p>
        </div>

        {/* Status */}
        <div>
          <StatusBadge status={isLocked ? 0 : escrow.onChainStatus} />
          {credentialHash && isLocked && (
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
              <span className="text-[9px] text-[#22C55E] font-mono">
                Docs anchored
              </span>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="flex items-center gap-2">
          <Link
            to={`/broker/escrow/${lot.id}`}
            className="p-2 rounded-lg border border-[#B8952A]/20 text-[#6B7280] hover:text-[#B8952A] hover:border-[#B8952A]/40 transition-all"
            title="View Escrow Detail"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>

          {isLocked && publicKey === BROKER_ADDRESS && (
            <button
              id={`upload-credentials-${lot.id}`}
              onClick={() => setUploaderOpen((p) => !p)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all ${
                uploaderOpen
                  ? "bg-[#B8952A]/20 border border-[#B8952A]/40 text-[#B8952A]"
                  : "bg-gradient-to-r from-[#B8952A] to-[#8A6D1F] text-[#0A0E1A] shadow-[0_3px_12px_rgba(184,149,42,0.25)] hover:shadow-[0_5px_18px_rgba(184,149,42,0.4)] hover:scale-[1.02]"
              }`}
            >
              {uploaderOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              {uploaderOpen ? "Collapse" : "Upload Credentials"}
            </button>
          )}
        </div>
      </div>

      {/* Inline Credential Upload Panel */}
      {uploaderOpen && (
        <div className="border-t border-[#B8952A]/10 p-6 bg-[#0D1424]">
          <CredentialUploader
            propertyId={lot.id}
            propertyName={lot.name}
            publicKey={publicKey}
            onSuccess={(hash, tx) => {
              onCredentialSuccess(lot.id, hash, tx);
              setUploaderOpen(false);
            }}
            onClose={() => setUploaderOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
