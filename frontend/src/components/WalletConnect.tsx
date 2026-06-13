/**
 * SA Prime Properties — Wallet Connection Component
 *
 * Renders a multi-wallet connect/disconnect button with:
 * - Truncated public key display
 * - Live XLM balance from Horizon
 * - Always-visible TESTNET amber badge when connected
 * - Network guard: shows error if user is not on Stellar Testnet
 * - Signed, expiring wallet session proof
 */
import { useState, useEffect } from "react";
import {
  connectWallet,
  guardTestnet,
  isConnected,
  getPublicKey,
  signInWithStellar,
  getConnectedWalletName,
  disconnectWallet,
  truncateAddress,
} from "@/lib/freighter";
import { getXlmBalance } from "@/lib/stellar";
import { Button } from "./ui/Button";
import { Wallet, LogOut, AlertTriangle, ShieldCheck } from "lucide-react";
import { showTransactionError } from "./TransactionToast";
import { clearWalletSession, hasValidWalletSession, saveWalletSession } from "@/lib/account";

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
  const [xlmBalance, setXlmBalance] = useState<number | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [walletName, setWalletName] = useState("Stellar Wallet");

  const keyToUse =
    externalPublicKey !== undefined ? externalPublicKey : localKey;

  // Auto-detect an existing StellarWalletsKit connection on mount.
  useEffect(() => {
    (async () => {
      if (await isConnected()) {
        const pk = await getPublicKey();
        if (pk && hasValidWalletSession(pk)) {
          setLocalKey(pk);
          onConnect?.(pk);
          setWalletName(getConnectedWalletName());
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
        await guardTestnet();
        const proof = await signInWithStellar(key);
        saveWalletSession(proof);
        setLocalKey(key);
        setWalletName(getConnectedWalletName());
        onConnect?.(key);
        fetchBalance(key);
      }
    } catch (e: any) {
      console.error("[WalletConnect] Wallet Error:", e);
      showTransactionError(e?.message || "Failed to connect the Stellar wallet.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (keyToUse) clearWalletSession(keyToUse);
    await disconnectWallet().catch(() => undefined);
    setLocalKey(null);
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
          <span className="text-[9px] font-mono text-success flex items-center gap-1 uppercase tracking-wider">
              <ShieldCheck className="w-2.5 h-2.5" /> {walletName}
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
        {isLoading ? "Connecting…" : "Connect Wallet"}
      </Button>
    </div>
  );
}
