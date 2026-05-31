import { cn } from "@/lib/utils";

interface EscrowStatusBadgeProps {
  status: 0 | 1 | 2 | null;
  className?: string;
}

type StatusKey = "0" | "1" | "2" | "none";

const statusConfig: Record<StatusKey, { label: string; styles: string; dot: string }> = {
  "0": {
    label: "Escrow Locked",
    styles: "bg-amber/10 text-amber border-amber/30",
    dot: "bg-amber",
  },
  "1": {
    label: "Released",
    styles: "bg-success/10 text-success border-success/30",
    dot: "bg-success",
  },
  "2": {
    label: "Refunded",
    styles: "bg-error/10 text-error border-error/30",
    dot: "bg-error",
  },
  "none": {
    label: "No Escrow",
    styles: "bg-muted/10 text-muted border-muted/20",
    dot: "bg-muted",
  },
};

export function EscrowStatusBadge({ status, className }: EscrowStatusBadgeProps) {
  const key: StatusKey =
    status === null || status === undefined ? "none" : (String(status) as StatusKey);
  const config = statusConfig[key] ?? statusConfig["none"];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
        config.styles,
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          config.dot,
          status === 0 && "animate-pulse"
        )}
      />
      {config.label}
    </span>
  );
}
