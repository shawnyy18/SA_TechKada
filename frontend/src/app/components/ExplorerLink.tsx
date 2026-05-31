/**
 * SA Prime Properties — Explorer Link Component
 *
 * Renders a clickable link to Stellar Expert testnet explorer
 * for any given transaction hash. Always appends "(testnet ↗)"
 * in muted gray so judges can immediately see these are live links.
 */

interface ExplorerLinkProps {
  hash: string;
  label?: string;
  className?: string;
}

export function ExplorerLink({ hash, label, className = "" }: ExplorerLinkProps) {
  const displayLabel = label ?? `${hash.slice(0, 6)}...${hash.slice(-6)}`;

  return (
    <a
      href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 ${className}`}
    >
      <span className="font-mono text-sm text-[#B8952A] hover:underline transition">
        {displayLabel}
      </span>
      <span className="text-xs text-[#6B7280] ml-1">(testnet ↗)</span>
    </a>
  );
}
