import { useEffect, useState } from "react";
import { CheckCircle2, CircleX, ExternalLink, Loader2, WalletCards } from "lucide-react";
import { EXPLORER_BASE } from "@/lib/constants";
import type { TransactionStatusUpdate } from "@/lib/stellar";

export function TransactionStatus() {
  const [status, setStatus] = useState<TransactionStatusUpdate | null>(null);

  useEffect(() => {
    const listener = (event: Event) => setStatus((event as CustomEvent<TransactionStatusUpdate>).detail);
    window.addEventListener("sa-prime:transaction-status", listener);
    return () => window.removeEventListener("sa-prime:transaction-status", listener);
  }, []);

  useEffect(() => {
    if (!status || (status.phase !== "success" && status.phase !== "failed")) return;
    const timer = window.setTimeout(() => setStatus(null), 8_000);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (!status) return null;
  const busy = status.phase === "preparing" || status.phase === "awaiting_signature" || status.phase === "pending";

  return (
    <div className="fixed bottom-5 right-5 z-[120] w-[min(92vw,380px)] bg-surface border border-gold/30 rounded-2xl p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        {status.phase === "awaiting_signature" ? <WalletCards className="w-5 h-5 text-amber mt-0.5" /> : busy ? <Loader2 className="w-5 h-5 text-gold animate-spin mt-0.5" /> : status.phase === "success" ? <CheckCircle2 className="w-5 h-5 text-success mt-0.5" /> : <CircleX className="w-5 h-5 text-error mt-0.5" />}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted">Transaction · {status.phase.replace("_", " ")}</p>
          <p className="text-sm text-off-white mt-1">{status.message}</p>
          {status.hash && <a href={`${EXPLORER_BASE}/${status.hash}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-mono text-gold hover:text-gold-light">View on Stellar Explorer <ExternalLink className="w-3 h-3" /></a>}
        </div>
      </div>
    </div>
  );
}
