/**
 * SA Prime Properties — Property Card Component
 *
 * Displays a real estate lot with:
 * - XLM price + PHP equivalent side by side
 * - Gold padlock overlay with glow for locked lots (no CTA)
 * - "Reserve This Lot" CTA for available lots
 * - Hover gold border effect
 */
import { Lock } from "lucide-react";
import { PHP_CONVERSION_RATE } from "@/lib/constants";
import { Link } from "react-router-dom";
import type { Key } from "react";

interface Lot {
  id: string;
  name: string;
  location: string;
  priceXLM: number;
  status: number; // 0 = Available, 1 = Locked
  image?: string;
}

interface PropertyCardProps {
  lot: Lot;
  key?: Key | null;
}

export function PropertyCard({ lot }: PropertyCardProps) {
  const isLocked = lot.status !== 0;
  const phpEquiv = (lot.priceXLM * PHP_CONVERSION_RATE).toLocaleString("en-PH");

  return (
    <div
      className={`bg-surface border rounded-2xl overflow-hidden flex flex-col relative group transition-all duration-300 ${
        !isLocked
          ? "border-gold/20 hover:border-gold/60 hover:shadow-[0_0_30px_rgba(184,149,42,0.12)]"
          : "border-gold/10"
      }`}
    >
      {/* Locked Overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-navy/70 z-10 flex flex-col items-center justify-center text-center p-4 backdrop-blur-[3px]">
          <div className="w-14 h-14 bg-gradient-to-br from-gold to-[#8A6D1F] rounded-full flex items-center justify-center mb-3 shadow-[0_0_30px_rgba(184,149,42,0.5)] ring-4 ring-gold/20">
            <Lock className="w-6 h-6 text-navy" />
          </div>
          <span className="text-gold text-xs font-bold uppercase tracking-widest">
            Escrow Locked
          </span>
          <p className="text-muted text-[10px] mt-2 font-mono">
            Reservation in progress
          </p>
        </div>
      )}

      {/* Property Image */}
      <div
        className={`h-40 bg-[#1A2233] relative overflow-hidden ${
          isLocked ? "grayscale" : ""
        }`}
      >
        {lot.image ? (
          <img
            src={lot.image}
            alt={lot.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${
              !isLocked ? "group-hover:scale-105" : "opacity-40"
            } ${isLocked ? "opacity-30" : "opacity-70"}`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-navy to-surface" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />

        {/* Lot badge */}
        <div className="absolute top-3 left-3 bg-navy/80 backdrop-blur-sm border border-gold/20 rounded px-2 py-0.5">
          <span className="text-[10px] text-gold font-mono font-bold">
            LOT-{lot.id.padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div
        className={`p-5 flex flex-col flex-1 ${
          isLocked ? "opacity-40" : ""
        }`}
      >
        {/* Status + Location */}
        <div className="flex justify-between items-start mb-2">
          <span
            className={`text-[10px] uppercase font-bold tracking-widest ${
              !isLocked ? "text-success" : "text-muted"
            }`}
          >
            {!isLocked ? "● Available" : "● Reserved"}
          </span>
          <span className="text-[10px] text-muted font-mono">{lot.location}</span>
        </div>

        <h3 className="text-off-white text-sm font-semibold mb-4 leading-tight">
          {lot.name}
        </h3>

        <div className="mt-auto">
          {/* Price display — XLM + PHP side by side */}
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <p className="text-gold font-mono text-xl font-bold leading-none">
                {lot.priceXLM.toLocaleString()}{" "}
                <span className="text-xs font-normal">XLM</span>
              </p>
              <p className="text-[11px] text-muted mt-1 font-mono">
                ≈ ₱{phpEquiv} PHP
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <Link
            to={isLocked ? "#" : `/reserve/${lot.id}`}
            className={isLocked ? "pointer-events-none" : ""}
            tabIndex={isLocked ? -1 : 0}
          >
            <button
              disabled={isLocked}
              id={`reserve-lot-${lot.id}`}
              className={`w-full py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all duration-200 ${
                !isLocked
                  ? "bg-gradient-to-r from-gold to-[#8A6D1F] text-navy shadow-[0_4px_15px_rgba(184,149,42,0.25)] hover:shadow-[0_6px_20px_rgba(184,149,42,0.4)] hover:scale-[1.02]"
                  : "bg-transparent border border-muted/20 text-muted/40 cursor-not-allowed"
              }`}
            >
              {isLocked ? "Unavailable" : "Reserve This Lot"}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
