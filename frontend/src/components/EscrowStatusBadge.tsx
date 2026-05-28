import { cn } from "@/lib/utils";

interface EscrowStatusBadgeProps {
  status: 0 | 1 | 2; // 0=Locked, 1=Released, 2=Refunded
  className?: string;
}

export function EscrowStatusBadge({ status, className }: EscrowStatusBadgeProps) {
  const statusConfig = {
    0: { label: "Escrow Locked", styles: "bg-amber/10 text-amber border-amber/30" },
    1: { label: "Released", styles: "bg-success/10 text-success border-success/30" },
    2: { label: "Refunded", styles: "bg-error/10 text-error border-error/30" },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        config.styles,
        className
      )}
    >
      {config.label}
    </span>
  );
}
