/**
 * SA Prime Properties — Credential Uploader Component
 *
 * Inline expandable panel for the broker to submit PRC ID, TCT/CCT, and
 * zoning permit credentials. Hashes them via Web Crypto SHA-256 and
 * anchors the hash on the Stellar testnet via upload_docs().
 *
 * DEMO MODE: No real files are read. All hashing is done on text inputs only.
 */
import { useState } from "react";
import {
  generateCredentialHash,
  uploadDocs,
} from "@/lib/stellar";
import { DEMO_CREDENTIALS, EXPLORER_BASE } from "@/lib/constants";
import {
  showTransactionSuccess,
  showTransactionError,
} from "@/components/TransactionToast";
import {
  Hash,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  Shield,
  ChevronUp,
} from "lucide-react";

interface CredentialUploaderProps {
  propertyId: string;
  propertyName: string;
  publicKey: string;
  onSuccess?: (hash: string, txHash: string | null) => void;
  onClose?: () => void;
}

type UploadPhase =
  | "idle"
  | "hashing"
  | "show_hash"
  | "submitting"
  | "success"
  | "error";

export function CredentialUploader({
  propertyId,
  propertyName,
  publicKey,
  onSuccess,
  onClose,
}: CredentialUploaderProps) {
  const [prc, setPrc] = useState(DEMO_CREDENTIALS.prcBrokerId);
  const [tct, setTct] = useState(DEMO_CREDENTIALS.tctReference);
  const [zoning, setZoning] = useState(DEMO_CREDENTIALS.zoningPermit);

  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [credentialHash, setCredentialHash] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!publicKey) return;
    setPhase("hashing");
    setErrorMsg(null);

    try {
      // ── Step 1 & 2: Concatenate and SHA-256 hash via Web Crypto API ──
      const combined = `${prc}|${tct}|${zoning}|${propertyId}|${Date.now()}`;
      const encoded = new TextEncoder().encode(combined);
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      setCredentialHash(hashHex);

      // ── Step 3: Show hash before submitting ──
      setPhase("show_hash");

      // Brief display delay so broker can see the hash
      await new Promise((r) => setTimeout(r, 800));

      // ── Step 4: Submit on-chain via Freighter → Soroban testnet ──
      setPhase("submitting");

      const contractLotId = `LOT-${propertyId.padStart(2, "0")}`;
      const result = await uploadDocs(publicKey, contractLotId, hashHex);
      const onChainTxHash = result.hash;
      showTransactionSuccess(
        result.hash,
        "Credentials Anchored to Stellar Testnet"
      );

      // Still update sessionStorage so the rest of the UI knows it succeeded instantly
      sessionStorage.setItem("sa_prime_simulated_docs_verified", "true");
      sessionStorage.setItem("sa_prime_simulated_doc_hash", hashHex);

      setTxHash(onChainTxHash);

      // ── Step 5: Success state ──
      setPhase("success");
      onSuccess?.(hashHex, onChainTxHash);
    } catch (err: any) {
      setPhase("error");
      setErrorMsg(err?.message || "Failed to process credentials");
      showTransactionError(err?.message || "Credential submission failed");
    }
  };

  const handleReset = () => {
    sessionStorage.removeItem("sa_prime_simulated_docs_verified");
    sessionStorage.removeItem("sa_prime_simulated_doc_hash");
    setPhase("idle");
    setCredentialHash(null);
    setTxHash(null);
    setErrorMsg(null);
  };

  return (
    <div className="border border-gold/30 bg-[#0D1424] rounded-2xl overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10 bg-gradient-to-r from-[#111827] to-[#0D1424]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-gold" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#F5F0E8]">
              Upload Credentials
            </p>
            <p className="text-[10px] font-mono text-[#6B7280]">
              LOT-{propertyId.padStart(2, "0")} · {propertyName}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#F5F0E8] hover:bg-white/5 transition-all"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-6">
        {phase === "success" ? (
          /* ── Success State ── */
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-5 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-[#22C55E] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#22C55E] mb-1">
                  ✓ Credentials Anchored to Stellar Testnet — SA Prime
                  Properties
                </p>
                <p className="text-xs text-[#6B7280]">
                  Buyer can now authorize release from their Trust Vault
                </p>
              </div>
            </div>

            {/* Credential Hash Display */}
            <div className="p-4 bg-[#0A0E1A] rounded-xl border border-gold/10">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-3.5 h-3.5 text-[#B8952A]" />
                <span className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold">
                  Credential Hash
                </span>
              </div>
              <code className="font-mono text-xs text-[#E8D5A0] break-all leading-relaxed">
                0x{credentialHash}
              </code>
            </div>

            {/* TX link or simulated note */}
            {txHash ? (
              <a
                href={`${EXPLORER_BASE}/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#E8D5A0] hover:text-[#B8952A] transition-colors"
              >
                View Transaction on Stellar Expert
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-[#F59E0B]/8 border border-[#F59E0B]/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#F59E0B]/80 leading-relaxed">
                  <span className="font-semibold">Demo mode:</span>{" "}
                  upload_docs() is not available on the deployed contract. In
                  production, the hash above would be anchored on-chain.
                </p>
              </div>
            )}

            <button
              onClick={handleReset}
              className="text-xs text-[#6B7280] hover:text-[#B8952A] transition-colors font-mono"
            >
              ↩ Resubmit with different credentials
            </button>
          </div>
        ) : phase === "error" ? (
          /* ── Error State ── */
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#EF4444]">
                  Submission Failed
                </p>
                <p className="text-xs text-[#6B7280] mt-1 font-mono">
                  {errorMsg}
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-[#6B7280] hover:text-[#B8952A] transition-colors font-mono"
            >
              ↩ Try again
            </button>
          </div>
        ) : (
          /* ── Input Form ── */
          <div className="space-y-5">
            {/* Three credential fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: "prc-broker-id",
                  label: "PRC Broker ID",
                  value: prc,
                  onChange: setPrc,
                  placeholder: "PRC-YYYY-XXXXXXX",
                },
                {
                  id: "tct-reference",
                  label: "TCT/CCT Reference",
                  value: tct,
                  onChange: setTct,
                  placeholder: "TCT-N-XXXXXX",
                },
                {
                  id: "zoning-permit",
                  label: "Municipal Zoning",
                  value: zoning,
                  onChange: setZoning,
                  placeholder: "XXX-ZP-YYYY-XXXX",
                },
              ].map((field) => (
                <div key={field.id}>
                  <label className="block text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold mb-2">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    id={field.id}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    disabled={phase !== "idle"}
                    placeholder={field.placeholder}
                    className="w-full bg-[#0A0E1A] border border-[#B8952A]/20 rounded-lg px-3.5 py-2.5 text-sm font-mono text-[#F5F0E8] focus:outline-none focus:border-[#B8952A]/60 focus:ring-1 focus:ring-[#B8952A]/20 placeholder:text-[#6B7280]/40 transition-colors disabled:opacity-50"
                  />
                </div>
              ))}
            </div>

            {/* Hash algorithm note */}
            <div className="p-3 bg-[#0A0E1A] border border-[#B8952A]/10 rounded-lg">
              <p className="text-[10px] text-[#6B7280] font-mono leading-relaxed">
                <span className="text-[#B8952A]">SHA-256</span>( PRC_ID |
                TCT_REF | ZONING | PROPERTY_ID | TIMESTAMP ) → 32-byte hash →
                anchored on Stellar Testnet
              </p>
            </div>

            {/* Hash preview during show_hash phase */}
            {(phase === "show_hash" || phase === "submitting") &&
              credentialHash && (
                <div className="p-4 bg-[#0A0E1A] rounded-xl border border-[#B8952A]/20 animate-pulse">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-3.5 h-3.5 text-[#B8952A]" />
                    <span className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold">
                      Credential Hash
                    </span>
                  </div>
                  <code className="font-mono text-xs text-[#E8D5A0] break-all">
                    0x{credentialHash}
                  </code>
                </div>
              )}

            {/* Submit Button */}
            <button
              id={`submit-credentials-${propertyId}`}
              onClick={handleSubmit}
              disabled={phase !== "idle" || !prc || !tct || !zoning}
              className="w-full py-3.5 bg-gradient-to-r from-[#B8952A] to-[#8A6D1F] text-[#0A0E1A] font-bold text-sm uppercase tracking-widest rounded-xl shadow-[0_4px_20px_rgba(184,149,42,0.3)] hover:shadow-[0_6px_25px_rgba(184,149,42,0.45)] transition-all hover:scale-[1.01] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
            >
              {phase === "hashing" && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating SHA-256 Hash...
                </>
              )}
              {phase === "show_hash" && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Hash Ready — Preparing Transaction...
                </>
              )}
              {phase === "submitting" && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting to Stellar Testnet...
                </>
              )}
              {phase === "idle" && (
                <>
                  <Shield className="w-4 h-4" />
                  Submit Credentials to Ledger
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer Disclaimer */}
      <div className="px-6 pb-5">
        <p className="text-[10px] text-[#6B7280]/70 text-center leading-relaxed">
          DEMO: In production, real PDF files would be hashed client-side and
          their IPFS CID stored on-chain. No document content ever leaves your
          device.
        </p>
      </div>
    </div>
  );
}
