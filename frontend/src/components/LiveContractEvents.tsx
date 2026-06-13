import { useEffect, useState } from "react";
import { Activity, ExternalLink } from "lucide-react";
import { EXPLORER_BASE } from "@/lib/constants";
import { watchContractEvents, type ContractEventRecord } from "@/lib/stellar";

export function LiveContractEvents() {
  const [events, setEvents] = useState<ContractEventRecord[]>([]);

  useEffect(() => watchContractEvents((fresh) => {
    setEvents((current) => {
      const byId = new Map([...fresh, ...current].map((event) => [event.id, event]));
      return Array.from(byId.values()).slice(0, 5);
    });
    window.dispatchEvent(new CustomEvent("sa-prime:contract-event", { detail: fresh }));
  }), []);

  return (
    <section className="border-b border-gold/10 bg-navy/80">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Activity className="w-4 h-4 text-success" />
          <span className="text-[10px] font-mono text-success uppercase tracking-widest">RPC event listener active</span>
        </div>
        {events.length === 0 ? (
          <p className="text-xs text-muted">Waiting for the next escrow contract event...</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto">
            {events.map((event) => (
              <a key={event.id} href={`${EXPLORER_BASE}/${event.txHash}`} target="_blank" rel="noreferrer" className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-gold/10 text-xs font-mono text-gold-light hover:border-gold/30">
                {event.action} · ledger {event.ledger} <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
