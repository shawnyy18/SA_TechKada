/**
 * SA Prime Properties — Landing Page
 *
 * Hero section + OFW stats bar + live property grid.
 * Polls the Soroban contract every 10 seconds to keep lot statuses live.
 */
import { useState, useEffect } from "react";
import { PropertyCard } from "@/components/PropertyCard";
import { SAMPLE_LOTS } from "@/lib/constants";
import { getAllEscrows } from "@/lib/stellar";
import { Loader2, Shield, TrendingUp, Globe, Lock } from "lucide-react";
import { ImpactBar } from "@/app/components/ImpactBar";
import { ActivityFeed } from "@/app/components/ActivityFeed";
import { LiveContractEvents } from "@/components/LiveContractEvents";

export function Landing() {
  const [lots, setLots] = useState(SAMPLE_LOTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLiveState() {
      try {
        const lotIds = SAMPLE_LOTS.map(l => `LOT-${l.id.padStart(2, '0')}`);
        const states = await getAllEscrows(lotIds);

        const newLots = SAMPLE_LOTS.map((lot) => {
          const contractLotId = `LOT-${lot.id.padStart(2, '0')}`;
          const state = states[contractLotId];

          if (
            state &&
            state.status !== null &&
            state.status !== undefined &&
            state.amount !== null
          ) {
            const liveAmountXLM = Number(state.amount) / 1e7;
            if (lot.priceXLM === liveAmountXLM) {
              // If refunded (2), make available again; otherwise locked/released (1)
              return { ...lot, status: state.status === 2 ? 0 : 1 };
            }
          }
          return { ...lot, status: 0 };
        });
        
        setLots(newLots);
      } catch (e) {
        console.error("Failed to fetch live contract state", e);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLiveState();
    const interval = setInterval(fetchLiveState, 10000);
    window.addEventListener("sa-prime:contract-event", fetchLiveState);
    return () => {
      clearInterval(interval);
      window.removeEventListener("sa-prime:contract-event", fetchLiveState);
    };
  }, []);

  return (
    <div className="min-h-screen">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden border-b border-gold/10">
        {/* Background radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gold/5 rounded-full blur-[120px]" />
          <div className="absolute top-20 right-0 w-96 h-96 bg-gold/3 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="max-w-4xl">
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/20 rounded-full mb-8">
              <Shield className="w-3.5 h-3.5 text-gold" />
              <span className="text-[11px] font-mono text-gold uppercase tracking-widest font-bold">
                Powered by Stellar Soroban · Testnet
              </span>
            </div>

            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-off-white leading-[1.05] mb-6">
              Uncompromising Trust.{" "}
              <span className="text-gold">Cryptographic Escrow</span> for
              Premium Real Estate.
            </h1>

            <p className="text-muted text-lg leading-relaxed max-w-2xl mb-10">
              Your reservation fee is locked in a Stellar smart contract.
              Released only when your documents are verified. Zero trust
              required — the blockchain enforces it.
            </p>

            {/* Quick stat pills */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-gold/10 rounded-full">
                <Lock className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-mono text-off-white/80">
                  Escrow-Protected
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-gold/10 rounded-full">
                <Globe className="w-3.5 h-3.5 text-gold" />
                <span className="text-xs font-mono text-off-white/80">
                  OFW-Focused
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-gold/10 rounded-full">
                <TrendingUp className="w-3.5 h-3.5 text-amber" />
                <span className="text-xs font-mono text-off-white/80">
                  100% Refundable
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── OFW Impact Stats (ImpactBar) ── */}
      <ImpactBar />

      {/* ── Live Activity Feed Ticker ── */}
      <ActivityFeed />
      <LiveContractEvents />

      {/* ── OFW Stats Bar ── */}
      <section className="border-b border-gold/10 bg-surface/60">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 md:divide-x md:divide-gold/10">
            <div className="flex flex-col md:px-8 first:pl-0">
              <span className="text-2xl font-serif font-bold text-gold-light">
                $36.1B
              </span>
              <span className="text-xs text-muted mt-1">
                Remitted by OFWs in 2023
              </span>
            </div>
            <div className="flex flex-col md:px-8">
              <span className="text-2xl font-serif font-bold text-error">
                ₱10.8B
              </span>
              <span className="text-xs text-muted mt-1">
                Est. lost to real estate fraud
              </span>
            </div>
            <div className="flex flex-col md:px-8">
              <span className="text-2xl font-serif font-bold text-success">
                100%
              </span>
              <span className="text-xs text-muted mt-1">
                Cryptographically protected reservations
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Property Listings ── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl text-off-white mb-2">
              Available Properties
            </h2>
            <p className="text-muted text-sm">
              All reservations secured on-chain via Soroban smart contracts
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-xs font-mono text-gold">
              <Loader2 className="w-4 h-4 animate-spin" />
              Syncing with ledger...
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live on Stellar Testnet
            </div>
          )}
        </div>

        <div className="relative min-h-[200px]">
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-500 ${
              isLoading ? "opacity-60" : "opacity-100"
            }`}
          >
            {lots.map((lot, i) => (
              <PropertyCard key={i} lot={lot} />
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20 border-t border-gold/10 pt-16">
          <h2 className="font-serif text-3xl text-off-white mb-10 text-center">
            How the Escrow Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Connect Wallet",
                desc: "Choose Freighter, Albedo, or xBull as your cryptographic identity on Stellar.",
                color: "text-gold",
              },
              {
                step: "02",
                title: "Lock Reservation",
                desc: "XLM is transferred into a Soroban smart contract vault. Not held by us.",
                color: "text-amber",
              },
              {
                step: "03",
                title: "Broker Verifies",
                desc: "Broker uploads PRC ID, TCT title, and zoning permits — all anchored on-chain.",
                color: "text-gold",
              },
              {
                step: "04",
                title: "You Decide",
                desc: "Release XLM to broker after verification, or request a full refund — any time.",
                color: "text-success",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-surface border border-gold/10 rounded-2xl p-6 hover:border-gold/30 transition-colors"
              >
                <div
                  className={`text-4xl font-serif font-bold mb-4 ${item.color} opacity-40`}
                >
                  {item.step}
                </div>
                <h3 className="font-semibold text-off-white mb-2 text-sm">
                  {item.title}
                </h3>
                <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
