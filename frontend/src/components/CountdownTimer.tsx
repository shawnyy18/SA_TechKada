/**
 * SA Prime Properties — Countdown Timer Component
 *
 * Displays a live DD:HH:MM:SS countdown to an expiry timestamp.
 * Turns red when fewer than 2 hours remain.
 * Shows "Expired — Refund Available" when the time has passed.
 */
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  expiryTimestamp: number; // Unix timestamp in milliseconds
  className?: string;
  showLabel?: boolean;
  label?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

function getTimeLeft(expiryTimestamp: number): TimeLeft {
  const diff = expiryTimestamp - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, totalMs: diff };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function CountdownTimer({
  expiryTimestamp,
  className,
  showLabel = true,
  label = "Time Remaining",
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(
    getTimeLeft(expiryTimestamp)
  );

  useEffect(() => {
    const tick = () => setTimeLeft(getTimeLeft(expiryTimestamp));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiryTimestamp]);

  const isExpired = timeLeft.totalMs <= 0;
  const isCritical = !isExpired && timeLeft.totalMs < 2 * 60 * 60 * 1000; // < 2 hours
  const isWarning = !isExpired && !isCritical && timeLeft.totalMs < 24 * 60 * 60 * 1000; // < 24 hours

  if (isExpired) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-error/10 border-error/30",
          className
        )}
      >
        <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
        <span className="font-mono text-sm font-bold text-error uppercase tracking-wider">
          Expired — Refund Available
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {showLabel && (
        <span className="text-[10px] text-muted uppercase tracking-widest font-semibold">
          {label}
        </span>
      )}
      <div
        className={cn(
          "flex items-center gap-1 font-mono font-bold text-2xl tabular-nums transition-colors",
          isCritical
            ? "text-error"
            : isWarning
            ? "text-amber"
            : "text-gold-light"
        )}
      >
        {timeLeft.days > 0 && (
          <>
            <span>{pad(timeLeft.days)}</span>
            <span className="text-muted text-sm font-normal">d</span>
          </>
        )}
        <span>{pad(timeLeft.hours)}</span>
        <span className="text-muted/60 text-lg">:</span>
        <span>{pad(timeLeft.minutes)}</span>
        <span className="text-muted/60 text-lg">:</span>
        <span>{pad(timeLeft.seconds)}</span>
      </div>
      {isCritical && (
        <p className="text-[10px] text-error font-mono animate-pulse">
          ⚠ Auto-refund imminent
        </p>
      )}
    </div>
  );
}
