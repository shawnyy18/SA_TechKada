import { Lock } from "lucide-react";
import { PHP_CONVERSION_RATE } from "@/lib/constants";
import { Link } from "react-router-dom";

interface PropertyCardProps {
  lot: {
    id: string;
    name: string;
    priceXLM: number;
    status: number;
  };
}

export function PropertyCard({ lot }: PropertyCardProps) {
  const isLocked = lot.status !== 0;

  return (
    <div className={`bg-surface border border-gold/20 rounded-xl overflow-hidden flex flex-col relative group transition-colors ${!isLocked && 'hover:border-gold/50'}`}>
      {isLocked && (
        <div className="absolute inset-0 bg-navy/60 z-10 flex flex-col items-center justify-center text-center p-4 backdrop-blur-[2px]">
          <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(184,149,42,0.4)]">
            <Lock className="w-6 h-6 text-navy" />
          </div>
          <span className="text-gold text-xs font-bold uppercase tracking-widest">Escrow Locked</span>
          <p className="text-muted text-[10px] mt-2">Contract: CX...XXXX</p>
        </div>
      )}

      {/* Image placeholder / Top block */}
      <div className={`h-32 bg-[#1A2233] relative overflow-hidden ${isLocked ? 'grayscale opacity-50' : ''}`}>
        <img 
          src={`https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800&h=400&seed=${lot.id}`}
          alt={lot.name}
          className="w-full h-full object-cover opacity-60"
        />
      </div>

      <div className={`p-4 flex flex-col flex-1 ${isLocked ? 'grayscale opacity-50' : ''}`}>
        <div className="flex justify-between items-start mb-2">
          {!isLocked ? (
             <span className="text-[10px] text-success uppercase font-bold tracking-widest">Available</span>
          ) : (
             <span className="text-[10px] text-muted uppercase font-bold tracking-widest">Reserved</span>
          )}
          <span className="text-[10px] text-muted font-mono">LOT-{lot.id.padStart(2, '0')}</span>
        </div>
        
        <h3 className="text-off-white text-sm font-semibold mb-3 leading-tight">
          {lot.name}
        </h3>

        <div className="mt-auto">
          <p className="text-gold font-mono text-lg font-bold">
            {lot.priceXLM.toLocaleString()} <span className="text-[10px] uppercase">XLM</span>
          </p>
          <p className="text-[10px] text-muted mb-3">
            ≈ ₱{(lot.priceXLM * PHP_CONVERSION_RATE).toLocaleString()} PHP
          </p>

          <Link to={`/reserve/${lot.id}`} className={isLocked ? 'pointer-events-none' : ''}>
            <button 
              disabled={isLocked}
              className={`w-full py-2 bg-transparent border text-[10px] font-bold uppercase tracking-widest rounded transition-all
                ${!isLocked 
                  ? 'border-gold/40 text-gold hover:bg-gold hover:text-navy cursor-pointer' 
                  : 'border-muted/20 text-muted/50 cursor-not-allowed'
                }`}
            >
              {isLocked ? "Unavailable" : "Reserve Now"}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
