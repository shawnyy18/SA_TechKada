/**
 * SA Prime Properties — Wallet Connection Component
 *
 * Renders a Freighter wallet connect/disconnect button with:
 * - Truncated public key display
 * - Live XLM balance from Horizon
 * - Always-visible TESTNET amber badge when connected
 * - Network guard: shows error if user is not on Stellar Testnet
 * - Manual connect fallback for demo purposes
 */
import { useState, useEffect } from "react";
import {
  connectWallet,
  guardTestnet,
  isConnected,
  getPublicKey,
  truncateAddress,
} from "@/lib/freighter";
import { getXlmBalance } from "@/lib/stellar";
import { Button } from "./ui/Button";
import { Wallet, LogOut, Code, AlertTriangle } from "lucide-react";
import { showTransactionError } from "./TransactionToast";

interface WalletConnectProps {
  onConnect?: (publicKey: string) => void;
  onDisconnect?: () => void;
  publicKey?: string | null;
  compact?: boolean;
}

export function WalletConnect({
  onConnect,
  onDisconnect,
  publicKey: externalPublicKey,
  compact = false,
}: WalletConnectProps) {
  const [localKey, setLocalKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [xlmBalance, setXlmBalance] = useState<number | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const keyToUse =
    externalPublicKey !== undefined ? externalPublicKey : localKey;

  // Auto-detect existing Freighter connection on mount
  useEffect(() => {
    (async () => {
      if (await isConnected()) {
        const pk = await getPublicKey();
        if (pk) {
          setLocalKey(pk);
          onConnect?.(pk);
          fetchBalance(pk);
        }
      }
    })();
  }, []);

  const fetchBalance = async (pk: string) => {
    const bal = await getXlmBalance(pk);
    setXlmBalance(bal);
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setNetworkError(null);
    try {
      const key = await connectWallet();
      if (key) {
        // Guard: must be on Testnet
        await guardTestnet().catch((err: Error) => {
          setNetworkError(err.message);
        });
        setLocalKey(key);
        onConnect?.(key);
        fetchBalance(key);
      }
    } catch (e: any) {
      console.error("[WalletConnect] Freighter Error:", e);
      showTransactionError(e?.message || "Failed to connect Freighter.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualConnect = () => {
    const trimmed = manualInput.trim();
    if (trimmed.length === 56 && trimmed.startsWith("G")) {
      setLocalKey(trimmed);
      onConnect?.(trimmed);
      fetchBalance(trimmed);
      setShowManual(false);
    } else {
      showTransactionError(
        "Invalid Stellar Public Key. Must start with 'G' and be 56 characters."
      );
    }
  };

  const handleDisconnect = () => {
    setLocalKey(null);
    setManualInput("");
    setXlmBalance(null);
    setNetworkError(null);
    onDisconnect?.();
  };

  if (keyToUse) {
    return (
      <div className="flex items-center gap-3">
        {networkError && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-error/10 border border-error/30 rounded-lg">
            <AlertTriangle className="w-3 h-3 text-error shrink-0" />
            <span className="text-[10px] font-mono text-error font-bold">
              Switch to Testnet
            </span>
          </div>
        )}
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber border border-amber/40 bg-amber/10 px-1.5 py-0.5 rounded-sm">
              ● TESTNET
            </span>
          </div>
          <span className="text-sm font-mono text-off-white">
            {truncateAddress(keyToUse)}
          </span>
          {xlmBalance !== null && !compact && (
            <span className="text-[10px] font-mono text-gold">
              {xlmBalance.toLocaleString("en-US", { maximumFractionDigits: 2 })}{" "}
              XLM
            </span>
          )}
        </div>
        <Button onClick={handleDisconnect} variant="outline" size="sm">
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Disconnect
        </Button>
      </div>
    );
  }

  if (showManual) {
    return (
      <div className="flex items-center space-x-2 bg-surface p-1 rounded-md border border-gold/20">
        <input
          type="text"
          placeholder="G..."
          className="bg-transparent border-none text-xs font-mono text-off-white px-2 py-1 w-40 focus:outline-none placeholder:text-muted/50"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleManualConnect()}
        />
        <Button onClick={handleManualConnect} size="sm" className="h-7 text-[10px]">
          Connect
        </Button>
        <button
          onClick={() => setShowManual(false)}
          className="text-muted hover:text-off-white px-2 text-xs"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        onClick={handleConnect}
        variant="default"
        size="sm"
        disabled={isLoading}
        id="connect-wallet-btn"
      >
        <Wallet className="w-3.5 h-3.5 mr-1.5" />
        {isLoading ? "Connecting…" : "Connect Freighter"}
      </Button>
      <button
        onClick={() => setShowManual(true)}
        className="text-muted hover:text-gold transition-colors p-2"
        title="Manual Connect (Demo)"
        id="manual-connect-btn"
      >
        <Code className="w-4 h-4" />
      </button>
    </div>
  );
}
