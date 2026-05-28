/**
 * SA Prime Properties — Trust Vault Dashboard
 * 
 * Displays live escrow state from the Soroban contract with
 * Release/Refund controls, Broker Refund, Reset Escrow, and transaction timeline.
 */
import { useState, useEffect, useCallback } from "react";
import { getContractStatus, releaseFunds, refundFunds, brokerRefund, resetEscrow, type EscrowState } from "@/lib/stellar";
import { connectWallet } from "@/lib/freighter";
import { truncateAddress } from "@/lib/freighter";
import { BROKER_ADDRESS } from "@/lib/constants";
import { EscrowStatusBadge } from "@/components/EscrowStatusBadge";
import { Button } from "@/components/ui/Button";
import { showTransactionSuccess, showTransactionError } from "@/components/TransactionToast";
import { Lock, Unlock, ArrowLeftRight, Clock, ExternalLink, Loader2, RotateCcw, ShieldCheck } from "lucide-react";

interface VaultProps {
  publicKey: string | null;
  onConnect: (key: string) => void;
}

export function Vault({ publicKey, onConnect }: VaultProps) {
  const [statusObj, setStatusObj] = useState<EscrowState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Determine if the connected wallet is the broker
  const isBroker = publicKey === BROKER_ADDRESS;

  // ── Load escrow state from contract ──
  const fetchStatus = useCallback(async () => {
    try {
      const data = await getContractStatus();
      setStatusObj(data);
    } catch (e) {
      console.error("[Vault] Failed to fetch status:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount + poll every 10 seconds when connected
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleWalletConnect = async () => {
    const pk = await connectWallet();
    if (pk) onConnect(pk);
  };

  const handleAction = async (actionType: 'release' | 'refund' | 'broker_refund') => {
    if (!publicKey) return;
    try {
      setIsSubmitting(true);
      let result;
      if (actionType === 'release') {
        result = await releaseFunds(publicKey);
      } else if (actionType === 'refund') {
        result = await refundFunds(publicKey);
      } else {
        result = await brokerRefund(publicKey);
      }
      
      if (result) {
        setTxHash(result.hash);
        const label = actionType === 'release' 
          ? 'Released to Broker' 
          : actionType === 'broker_refund' 
            ? 'Broker Refunded to Buyer'
            : 'Refunded to Buyer';
        showTransactionSuccess(result.hash, `Escrow ${label}`);
        // Optimistic UI update
        setStatusObj(prev => prev ? { ...prev, status: actionType === 'release' ? 1 : 2 } : null);
      }
    } catch (error: any) {
      console.error(error);
      showTransactionError(error?.message || "Failed to submit transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!publicKey) return;
    try {
      setIsResetting(true);
      const result = await resetEscrow(publicKey);
      if (result) {
        setTxHash(result.hash);
        showTransactionSuccess(result.hash, "Escrow Reset — Properties Available");
        // Clear state so the UI reflects "No Active Escrow"
        setStatusObj({ status: null, amount: null, buyer: null, broker: null, token: null });
      }
    } catch (error: any) {
      console.error(error);
      showTransactionError(error?.message || "Failed to reset escrow");
    } finally {
      setIsResetting(false);
    }
  };

  // ── Gate: Wallet not connected ──
  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <Lock className="w-16 h-16 text-gold/30 mb-6" />
        <h2 className="text-3xl font-serif mb-4">Trust Vault Access</h2>
        <p className="text-muted text-center max-w-md mb-8">
          Connect your Freighter wallet to view your active real estate reservations and manage cryptographic escrows.
        </p>
        <Button onClick={handleWalletConnect} size="lg">
          Connect Freighter Wallet
        </Button>
      </div>
    );
  }

  const currentStatus = statusObj?.status ?? null;
  const hasEscrow = currentStatus !== null && currentStatus !== undefined;

  const formatAmount = (raw: number | null) => {
    if (raw === null || raw === undefined) return "0";
    return (Number(raw) / 1e7).toLocaleString("en-US", { maximumFractionDigits: 4 });
  };
  
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
        <div>
          <h1 className="text-4xl font-serif mb-4 flex items-center">
            Trust Vault Dashboard
          </h1>
          <p className="text-muted font-mono text-sm inline-flex items-center space-x-2 bg-navy px-3 py-1.5 rounded-md border border-gold/10">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            <span>Network: TESTNET</span>
            <span className="px-2">|</span>
            <span className="truncate max-w-[200px]">{publicKey}</span>
            {isBroker && (
              <>
                <span className="px-2">|</span>
                <span className="text-amber font-bold">BROKER</span>
              </>
            )}
          </p>
        </div>
        {/* Reset Escrow Button — always visible when wallet is connected */}
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={isResetting || !hasEscrow}
            className="flex items-center gap-2 px-4 py-2.5 bg-transparent border border-amber/40 text-amber text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-amber/10 transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            {isResetting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Reset Escrow (Demo)
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
          <p className="text-muted font-mono text-sm">Reading contract state from Stellar Testnet...</p>
        </div>
      )}

      {/* No Escrow State */}
      {!isLoading && !hasEscrow && (
        <div className="flex flex-col items-center justify-center py-24 border border-gold/10 bg-surface rounded-2xl">
          <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-gold/40" />
          </div>
          <h3 className="text-xl font-serif mb-2">No Active Escrow</h3>
          <p className="text-muted text-sm max-w-md text-center">
            No escrow vault is currently active on this contract. Reserve a property from the landing page to initialize a new vault.
          </p>
        </div>
      )}

      {/* Active Escrow Dashboard */}
      {!isLoading && hasEscrow && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Status Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface border-2 border-gold rounded-2xl flex-1 flex flex-col overflow-hidden shadow-[0_0_40px_rgba(184,149,42,0.05)]">
               <div className="p-6 border-b border-gold/10 bg-gradient-to-br from-[#1A2233] to-surface flex justify-between items-start">
                 <div>
                   <h3 className="font-serif text-2xl text-gold-light mb-1">Active Trust Vault</h3>
                   <p className="text-[10px] font-mono text-muted uppercase tracking-tighter">
                     Buyer: {truncateAddress(statusObj?.buyer)}
                   </p>
                 </div>
                 <EscrowStatusBadge status={currentStatus as 0|1|2} />
               </div>

               <div className="p-6 flex-1 flex flex-col">
                 {/* Key Metrics */}
                 <div className="grid grid-cols-2 gap-6 mb-8">
                   <div className="flex flex-col">
                     <span className="text-[10px] text-muted uppercase tracking-widest mb-1">Vault Status</span>
                     <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${currentStatus === 0 ? 'bg-amber animate-pulse' : currentStatus === 1 ? 'bg-success' : 'bg-error'}`}></div>
                       <span className="text-lg font-bold text-off-white">
                         {currentStatus === 0 ? 'LOCKED' : currentStatus === 1 ? 'RELEASED' : 'REFUNDED'}
                       </span>
                     </div>
                   </div>
                   <div className="text-right">
                     <span className="text-[10px] text-muted uppercase tracking-widest mb-1 block">Amount</span>
                     <p className="text-lg font-mono text-gold-light">{formatAmount(statusObj?.amount ?? null)} <span className="text-xs">XLM</span></p>
                   </div>
                 </div>

                 {/* Contract Details */}
                 <div className="space-y-3 mb-8 p-4 bg-navy/50 rounded-lg border border-gold/10">
                   <div className="flex justify-between text-xs">
                     <span className="text-muted">Buyer</span>
                     <span className="font-mono text-off-white/80">{truncateAddress(statusObj?.buyer)}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                     <span className="text-muted">Broker</span>
                     <span className="font-mono text-off-white/80">{truncateAddress(statusObj?.broker)}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                     <span className="text-muted">Token</span>
                     <span className="font-mono text-off-white/80">{truncateAddress(statusObj?.token)}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                     <span className="text-muted">Your Role</span>
                     <span className={`font-mono font-bold ${isBroker ? 'text-amber' : 'text-gold-light'}`}>
                       {isBroker ? 'BROKER' : 'BUYER / CLIENT'}
                     </span>
                   </div>
                 </div>

                 {/* Action Buttons — role-aware */}
                 <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 pt-4 mt-auto">
                    {/* Buyer Actions */}
                    {!isBroker && (
                      <>
                        <button 
                          className="flex-1 py-4 bg-gold text-navy font-bold uppercase tracking-widest rounded-xl shadow-[0_5px_15px_rgba(184,149,42,0.3)] transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                          disabled={currentStatus !== 0 || isSubmitting}
                          onClick={() => handleAction('release')}
                        >
                          {isSubmitting ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <Unlock className="w-5 h-5 mr-3" />}
                          Authorize Release
                        </button>
                        <button 
                          className="flex-1 py-4 bg-transparent border border-red-500/50 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                          disabled={currentStatus !== 0 || isSubmitting}
                          onClick={() => handleAction('refund')}
                        >
                          {isSubmitting ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <ArrowLeftRight className="w-5 h-5 mr-3" />}
                          Request Refund
                        </button>
                      </>
                    )}

                    {/* Broker Actions */}
                    {isBroker && (
                      <>
                        <button 
                          className="flex-1 py-4 bg-amber text-navy font-bold uppercase tracking-widest rounded-xl shadow-[0_5px_15px_rgba(245,158,11,0.3)] transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                          disabled={currentStatus !== 0 || isSubmitting}
                          onClick={() => handleAction('broker_refund')}
                        >
                          {isSubmitting ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <ShieldCheck className="w-5 h-5 mr-3" />}
                          Approve Refund to Buyer
                        </button>
                      </>
                    )}
                 </div>
               </div>
            </div>

            {/* Transaction History */}
            <div className="border border-gold/10 bg-surface rounded-xl p-8">
               <h3 className="text-lg font-serif mb-6">Transaction History</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="text-xs text-muted uppercase bg-navy block w-full mb-2 border border-gold/10 rounded">
                     <tr className="flex w-full">
                       <th className="py-3 px-4 w-1/3">Action</th>
                       <th className="py-3 px-4 w-1/4">Amount</th>
                       <th className="py-3 px-4 w-1/4">Status</th>
                       <th className="py-3 px-4 w-1/6 text-right">Explorer</th>
                     </tr>
                   </thead>
                   <tbody className="block w-full h-[150px] overflow-y-auto font-mono text-xs">
                     {/* Lock entry — always show when escrow exists */}
                     <tr className="flex w-full items-center border-b border-gold/5 hover:bg-navy/50 transition-colors">
                      <td className="py-3 px-4 w-1/3 flex items-center"><span className="w-2 h-2 rounded-full bg-amber mr-2"></span>lock_funds</td>
                      <td className="py-3 px-4 w-1/4 text-gold-light">{formatAmount(statusObj?.amount ?? null)} XLM</td>
                      <td className="py-3 px-4 w-1/4">SUCCESS</td>
                      <td className="py-3 px-4 w-1/6 text-right">
                        {txHash ? (
                          <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center text-muted hover:text-gold transition-colors">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-muted/50">—</span>
                        )}
                      </td>
                    </tr>
                     {currentStatus === 1 && (
                        <tr className="flex w-full items-center border-b border-gold/5 hover:bg-navy/50 transition-colors">
                        <td className="py-3 px-4 w-1/3 flex items-center"><span className="w-2 h-2 rounded-full bg-success mr-2"></span>release</td>
                        <td className="py-3 px-4 w-1/4 text-gold-light">{formatAmount(statusObj?.amount ?? null)} XLM</td>
                        <td className="py-3 px-4 w-1/4">SUCCESS</td>
                        <td className="py-3 px-4 w-1/6 text-right">
                          {txHash ? (
                            <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center text-muted hover:text-gold transition-colors">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : <span className="text-muted/50">—</span>}
                        </td>
                      </tr>
                     )}
                     {currentStatus === 2 && (
                        <tr className="flex w-full items-center border-b border-gold/5 hover:bg-navy/50 transition-colors">
                        <td className="py-3 px-4 w-1/3 flex items-center"><span className="w-2 h-2 rounded-full bg-error mr-2"></span>refund</td>
                        <td className="py-3 px-4 w-1/4 text-gold-light">{formatAmount(statusObj?.amount ?? null)} XLM</td>
                        <td className="py-3 px-4 w-1/4">SUCCESS</td>
                        <td className="py-3 px-4 w-1/6 text-right">
                          {txHash ? (
                            <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center text-muted hover:text-gold transition-colors">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : <span className="text-muted/50">—</span>}
                        </td>
                      </tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>

          {/* Timeline Panel */}
          <div className="lg:col-span-1">
            <div className="border border-gold/20 bg-surface rounded-xl p-8 sticky top-28">
              <h3 className="text-xl font-serif mb-8 flex items-center">
                <Clock className="w-5 h-5 mr-3 text-gold" />
                Status Timeline
              </h3>

              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-4 before:border-l before:border-gold/20 before:h-full before:-z-0">
                 
                 <div className="relative z-10 flex items-start">
                    <div className="w-8 h-8 rounded-full bg-surface border-2 border-gold flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(184,149,42,0.3)]">
                      <div className="w-2 h-2 rounded-full bg-gold"></div>
                    </div>
                    <div className="ml-4 pt-1">
                      <h4 className="font-semibold text-off-white">Funds Locked</h4>
                      <p className="text-xs text-muted mt-1 font-mono">Smart contract initialized</p>
                    </div>
                 </div>

                 <div className="relative z-10 flex items-start">
                    <div className={`w-8 h-8 rounded-full bg-surface border-2 flex items-center justify-center shrink-0 transition-colors ${currentStatus === 0 ? 'border-amber shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'border-gold'}`}>
                      <div className={`w-2 h-2 rounded-full ${currentStatus === 0 ? 'bg-amber animate-pulse' : 'bg-gold'}`}></div>
                    </div>
                    <div className="ml-4 pt-1">
                      <h4 className={`font-semibold ${currentStatus === 0 ? 'text-amber' : 'text-off-white'}`}>Broker Credentials Pending</h4>
                      {currentStatus === 0 && (
                        <div className="mt-2 text-xs font-mono bg-amber/10 border border-amber/20 text-amber px-2 py-1 rounded inline-block">
                          Awaiting verification
                        </div>
                      )}
                    </div>
                 </div>

                 <div className="relative z-10 flex items-start">
                    <div className={`w-8 h-8 rounded-full bg-surface border-2 flex items-center justify-center shrink-0 transition-colors ${currentStatus !== null && currentStatus !== 0 ? 'border-success shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'border-gold/20'}`}>
                      <div className={`w-2 h-2 rounded-full ${currentStatus !== null && currentStatus !== 0 ? 'bg-success' : 'bg-transparent'}`}></div>
                    </div>
                    <div className="ml-4 pt-1 opacity-100">
                      <h4 className={`font-semibold ${currentStatus !== null && currentStatus !== 0 ? 'text-success' : 'text-muted'}`}>
                        {currentStatus === 1 ? 'Released' : currentStatus === 2 ? 'Refunded' : 'Ready to Release / Request Refund'}
                      </h4>
                      <p className="text-xs text-muted mt-1">Smart contract settled</p>
                    </div>
                 </div>

              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
