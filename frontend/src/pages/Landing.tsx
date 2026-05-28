import { useState, useEffect } from "react";
import { PropertyCard } from "@/components/PropertyCard";
import { SAMPLE_LOTS } from "@/lib/constants";
import { getContractStatus } from "@/lib/stellar";
import { Loader2 } from "lucide-react";

export function Landing() {
  const [lots, setLots] = useState(SAMPLE_LOTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLiveState() {
      try {
        const state = await getContractStatus();
        
        // If there's an active escrow in the smart contract
        if (state.status !== null && state.status !== undefined && state.amount !== null) {
          const liveAmountXLM = Number(state.amount) / 1e7;
          
          // Map over the sample lots and update the one that matches the contract's locked amount
          // Or if there's an active escrow (status 0 = Locked, 1 = Released), we mark the matching lot as Reserved.
          setLots(prev => prev.map(lot => {
            if (lot.priceXLM === liveAmountXLM) {
              return { ...lot, status: state.status === 2 ? 0 : 1 }; // If refunded (2), it becomes available again (0). Otherwise it's reserved (1).
            }
            // If the contract is locked on another lot, we might want to disable all others, 
            // but for this demo we just show the specific one as locked.
            return lot;
          }));
        }
      } catch (e) {
        console.error("Failed to fetch live contract state", e);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLiveState();
    // Poll every 10 seconds to keep the landing page live
    const interval = setInterval(fetchLiveState, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Bento Grid Header Layout */}
      <div className="flex flex-col gap-6">
        <div className="bg-surface border border-gold/20 rounded-2xl p-8 md:p-12 relative overflow-hidden flex flex-col justify-center min-h-[240px]">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <svg className="w-48 h-48 md:w-64 md:h-64 text-gold" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-gold-light mb-4 relative z-10">Uncompromising Trust.</h2>
          <p className="text-muted max-w-xl text-base leading-relaxed relative z-10">
            Your reservation fee is mathematically protected until your documents are verified. Cryptographic escrow built for Overseas Filipino Workers. Powered by Stellar.
          </p>
        </div>

        {/* Property Listings */}
        <div className="relative min-h-[200px]">
          {isLoading && (
             <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-surface/50 backdrop-blur-sm rounded-xl">
               <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
               <p className="text-xs font-mono text-gold-light">Syncing with Stellar Ledger...</p>
             </div>
          )}
          
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-500 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            {lots.map(lot => (
              <PropertyCard key={lot.id} lot={lot} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
