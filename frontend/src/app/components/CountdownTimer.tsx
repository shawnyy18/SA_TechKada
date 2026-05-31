/**
 * SA Prime Properties — Enhanced Countdown Timer (Ledger-Aware)
 *
 * Two modes:
 *   "broker"  — 48-hour broker credential window from lockTimestamp
 *   "expiry"  — 7-day Soroban escrow via Horizon ledger fetch
 *
 * Color states:
 *   > 24hr:  gold #B8952A
 *   6–24hr:  amber #F59E0B
 *   < 6hr:   red #EF4444 + pulse animation
 *   Zero:    fires onExpired(), shows auto-refund banner
 *
 * Display: DD : HH : MM : SS — updates every second.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { HORIZON_URL } from "@/lib/constants";

interface EscrowCountdownTimerProps {
  lockTimestamp: number;
  expiryLedger: number;
  mode: "broker" | "expiry";
  onExpired?: () => void;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function EscrowCountdownTimer({
  lockTimestamp,
  expiryLedger,
  mode,
  onExpired,
}: EscrowCountdownTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const expiredFired = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Compute initial seconds remaining ── */
  const computeInitialSeconds = useCallback(async () => {
    if (mode === "broker") {
      // 48-hour window from lock timestamp
      const expiryMs = lockTimestamp + 172_800_000; // 48h in ms
      const remaining = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    } else {
      // "expiry" — fetch current ledger from Horizon
      try {
        const res = await fetch(
          `${HORIZON_URL}/ledgers?order=desc&limit=1`
        );
        const data = await res.json();
        const currentLedger: number = data._embedded.records[0].sequence;
        // Each Stellar ledger ≈ 5 seconds
        const remaining = Math.max(0, (expiryLedger - currentLedger) * 5);
        setSecondsRemaining(remaining);
      } catch (e) {
        console.warn("[EscrowCountdownTimer] Horizon ledger fetch failed:", e);
        // Fallback: estimate from lockTimestamp + 7 days
        const fallbackExpiryMs = lockTimestamp + 7 * 24 * 60 * 60 * 1000;
        const remaining = Math.max(
          0,
          Math.floor((fallbackExpiryMs - Date.now()) / 1000)
        );
        setSecondsRemaining(remaining);
      }
    }
  }, [lockTimestamp, expiryLedger, mode]);

  useEffect(() => {
    computeInitialSeconds();
  }, [computeInitialSeconds]);

  /* ── Tick every second ── */
  useEffect(() => {
    if (secondsRemaining === null) return;

    intervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [secondsRemaining !== null]);

  /* ── Fire onExpired once ── */
  useEffect(() => {
    if (
      secondsRemaining !== null &&
      secondsRemaining <= 0 &&
      !expiredFired.current
    ) {
      expiredFired.current = true;
      setExpired(true);
      onExpired?.();
    }
  }, [secondsRemaining, onExpired]);

  /* ── Derive DD:HH:MM:SS ── */
  const secs = secondsRemaining ?? 0;
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  /* ── Color thresholds ── */
  const hoursTotal = secs / 3600;
  const colorClass =
    secs <= 0
      ? "text-[#EF4444]"
      : hoursTotal < 6
      ? "text-[#EF4444]"
      : hoursTotal < 24
      ? "text-[#F59E0B]"
      : "text-[#B8952A]";

  const shouldPulse = secs > 0 && hoursTotal < 6;

  const label =
    mode === "broker"
      ? `Broker has ${pad(days)}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)} to upload credentials`
      : `Trust Vault expires in ${pad(days)}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  /* ── Expired state: full-width red banner ── */
  if (expired) {
    if (mode === "expiry") {
      return (
        <div className="w-full flex items-center gap-3 p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-pulse" />
          <span className="font-mono text-sm font-bold text-[#EF4444] uppercase tracking-wider">
            SA Prime Properties · Auto-Refund Now Available
          </span>
        </div>
      );
    }
    // broker mode expired — handled externally via onExpired callback
    return (
      <div className="w-full flex items-center gap-3 p-4 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl">
        <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] animate-pulse" />
        <span className="font-mono text-sm font-bold text-[#F59E0B] uppercase tracking-wider">
          Broker credential window has expired
        </span>
      </div>
    );
  }

  /* ── Loading state ── */
  if (secondsRemaining === null) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-[#B8952A]/30 border-t-[#B8952A] rounded-full animate-spin" />
        <span className="text-xs text-[#6B7280] font-mono">
          {mode === "expiry" ? "Fetching ledger..." : "Calculating..."}
        </span>
      </div>
    );
  }

  /* ── Active countdown ── */
  return (
    <div className="flex flex-col gap-1.5">
      {/* Label */}
      <span className="text-[10px] text-[#6B7280] uppercase tracking-widest font-semibold">
        {mode === "broker" ? "48-Hr Broker Window" : "7-Day Escrow Expiry"}
      </span>

      {/* Digits */}
      <div
        className={`flex items-center gap-1 font-mono font-bold text-2xl tabular-nums transition-colors ${colorClass}`}
        style={shouldPulse ? { animation: "pulse 1s ease-in-out infinite" } : {}}
      >
        {days > 0 && (
          <>
            <span>{pad(days)}</span>
            <span className="text-[#6B7280] text-sm font-normal">d</span>
          </>
        )}
        <span>{pad(hours)}</span>
        <span className="text-[#6B7280]/60 text-lg">:</span>
        <span>{pad(minutes)}</span>
        <span className="text-[#6B7280]/60 text-lg">:</span>
        <span>{pad(seconds)}</span>
      </div>

      {/* Contextual label */}
      <p className={`text-[11px] font-mono ${colorClass}`} style={{ opacity: 0.8 }}>
        {label}
      </p>

      {/* CSS pulse keyframe (scoped, emitted once) */}
      {shouldPulse && (
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.65; }
          }
        `}</style>
      )}
    </div>
  );
}
