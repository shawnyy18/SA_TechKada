/**
 * SA Prime Properties — Wallet Connection Component
 * 
 * Renders a Freighter wallet connect/disconnect button with
 * truncated public key display, Testnet badge, and a manual connection fallback.
 */
import { useState, useEffect } from "react";
import { connectWallet, isConnected, getPublicKey, truncateAddress } from "@/lib/freighter";
import { Button } from "./ui/Button";
import { Wallet, LogOut, Code } from "lucide-react";
import { showTransactionError } from "./TransactionToast";

interface WalletConnectProps {
  onConnect?: (publicKey: string) => void;
  onDisconnect?: () => void;
  publicKey?: string | null;
}

export function WalletConnect({ onConnect, onDisconnect, publicKey: externalPublicKey }: WalletConnectProps) {
  const [localKey, setLocalKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualInput, setManualInput] = useState("");

  const keyToUse = externalPublicKey !== undefined ? externalPublicKey : localKey;

  // Auto-detect existing Freighter connection on mount
  useEffect(() => {
    (async () => {
      if (await isConnected()) {
        const pk = await getPublicKey();
        if (pk) {
          setLocalKey(pk);
          onConnect?.(pk);
        }
      }
    })();
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const key = await connectWallet();
      if (key) {
        setLocalKey(key);
        onConnect?.(key);
      }
    } catch (e: any) {
      console.error("[WalletConnect] Freighter Error:", e);
      showTransactionError(e?.message || "Failed to connect Freighter.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualConnect = () => {
    if (manualInput.length === 56 && manualInput.startsWith("G")) {
      setLocalKey(manualInput);
      onConnect?.(manualInput);
      setShowManual(false);
    } else {
      showTransactionError("Invalid Stellar Public Key. Must start with 'G' and be 56 characters.");
    }
  };

  const handleDisconnect = () => {
    setLocalKey(null);
    setManualInput("");
    onDisconnect?.();
  };

  return (
    <div className="flex items-center space-x-3">
      {keyToUse ? (
        <>
          <div className="flex flex-col items-end">
            <span className="text-sm font-mono text-off-white">
              {truncateAddress(keyToUse)}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber border border-amber/40 bg-amber/10 px-1.5 py-0.5 rounded-sm">
              Testnet
            </span>
          </div>
          <Button
            onClick={handleDisconnect}
            variant="outline"
            size="sm"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Disconnect
          </Button>
        </>
      ) : showManual ? (
        <div className="flex items-center space-x-2 bg-surface p-1 rounded-md border border-gold/20">
          <input 
            type="text" 
            placeholder="G..."
            className="bg-transparent border-none text-xs font-mono text-off-white px-2 py-1 w-32 focus:outline-none placeholder:text-muted/50"
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
      ) : (
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleConnect}
            variant="default"
            size="sm"
            disabled={isLoading}
          >
            <Wallet className="w-3.5 h-3.5 mr-1.5" />
            {isLoading ? "Connecting…" : "Connect Freighter"}
          </Button>
          <button 
            onClick={() => setShowManual(true)}
            className="text-muted hover:text-gold transition-colors p-2"
            title="Manual Connect (Demo)"
          >
            <Code className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
