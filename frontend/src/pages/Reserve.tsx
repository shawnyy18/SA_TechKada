/**
 * SA Prime Properties — Reserve Page
 * 
 * The property reservation flow:
 *  Step 1: Connect Freighter wallet
 *  Step 2: Review escrow terms and lock funds via Soroban contract
 *  Step 3: Await verification, then manage from Trust Vault
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SAMPLE_LOTS, PHP_CONVERSION_RATE, BROKER_ADDRESS } from "@/lib/constants";
import { lockFunds } from "@/lib/stellar";
import { WalletConnect } from "@/components/WalletConnect";
import { Button } from "@/components/ui/Button";
import { showTransactionSuccess, showTransactionError } from "@/components/TransactionToast";
import { Check, ShieldAlert, Loader2 } from "lucide-react";

interface ReserveProps {
  publicKey: string | null;
  onConnect: (key: string) => void;
}

export function Reserve({ publicKey, onConnect }: ReserveProps) {
  const { lotId } = useParams();
  const navigate = useNavigate();
  const lot = SAMPLE_LOTS.find(l => l.id === lotId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  useEffect(() => {
    // If lot is missing or already locked, redirect
    if (!lot) navigate("/");
  }, [lot, navigate]);

  if (!lot) return null;

  const handleLockFunds = async () => {
    if (!publicKey) return;
    try {
      setIsSubmitting(true);
      const result = await lockFunds(publicKey, lot.priceXLM);
      if (result) {
        setIsLocked(true);
        showTransactionSuccess(result.hash, "Funds Locked in Escrow");
        setTimeout(() => {
          navigate("/vault");
        }, 3000);
      }
    } catch (error: any) {
      console.error(error);
      showTransactionError(error?.message || "Failed to submit transaction to testnet");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = isLocked ? 3 : (publicKey ? 2 : 1);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-serif mb-4">Reserve Property</h1>
        <p className="text-muted font-mono text-sm max-w-2xl">
          Secure the rights to {lot.name}. Your {lot.priceXLM} XLM will be locked in a smart contract vault.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 space-y-4 md:space-y-0 relative before:absolute before:top-1/2 before:-translate-y-1/2 before:left-[40px] before:right-[40px] before:h-[1px] before:bg-gold/10 hidden md:block">
        <div className="flex justify-between relative z-10 w-full">
          {[
            { step: 1, label: "Connect Wallet" },
            { step: 2, label: "Lock Funds" },
            { step: 3, label: "Await Verification" },
            { step: 4, label: "Release or Refund" }
          ].map((s) => (
            <div key={s.step} className="flex flex-col items-center bg-navy px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm border-2 ${currentStep > s.step ? 'bg-gold border-gold text-navy' : currentStep === s.step ? 'border-gold text-gold mb-0' : 'border-gold/30 text-gold/30'}`}>
                {currentStep > s.step ? <Check className="w-4 h-4" /> : s.step}
              </div>
              <span className={`mt-3 text-xs uppercase tracking-wider font-semibold ${currentStep >= s.step ? 'text-gold-light' : 'text-muted'}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Step 1 Panel */}
          <div className={`border border-gold/20 bg-surface rounded-xl p-8 transition-opacity ${currentStep === 1 ? 'opacity-100 ring-1 ring-gold/50' : 'opacity-70'}`}>
            <h3 className="text-xl font-serif mb-4 flex items-center">
              <span className="w-6 h-6 rounded-full bg-gold/10 text-gold flex items-center justify-center text-xs font-mono mr-3">1</span>
              Wallet Connection
            </h3>
            <div className="flex items-center justify-between p-4 bg-navy rounded-lg border border-gold/10">
              <span className="text-sm text-muted">Web3 Identity</span>
              <WalletConnect onConnect={onConnect} publicKey={publicKey} />
            </div>
          </div>

          {/* Step 2 Panel */}
          <div className={`border border-gold/20 bg-surface rounded-xl p-8 transition-opacity ${currentStep === 2 ? 'opacity-100 ring-1 ring-gold/50' : 'opacity-50 pointer-events-none'}`}>
            <h3 className="text-xl font-serif mb-6 flex items-center">
              <span className="w-6 h-6 rounded-full bg-gold/10 text-gold flex items-center justify-center text-xs font-mono mr-3">2</span>
              Escrow Terms
            </h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center py-3 border-b border-gold/10">
                <span className="text-muted">Reservation Fee</span>
                <span className="font-mono text-gold-light text-lg">{lot.priceXLM.toLocaleString()} XLM</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gold/10">
                <span className="text-muted">PHP Equivalent</span>
                <span className="font-mono">≈ ₱{(lot.priceXLM * PHP_CONVERSION_RATE).toLocaleString()}</span>
              </div>
              <div className="flex flex-col py-3 border-b border-gold/10">
                <span className="text-muted mb-1">Broker Wallet (Pre-filled)</span>
                <span className="font-mono text-xs text-gold/60 truncate">{BROKER_ADDRESS}</span>
              </div>
            </div>

            <div className="bg-amber/10 border border-amber/20 rounded-lg p-4 mb-6 flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-amber shrink-0 mt-0.5" />
              <p className="text-xs text-amber leading-relaxed font-medium">
                Your funds remain entirely under your cryptographic control. The broker cannot withdraw them until you explicitly sign the release transaction after document verification.
              </p>
            </div>

            <Button 
              className="w-full h-12 text-base" 
              onClick={handleLockFunds}
              disabled={isSubmitting || !publicKey || isLocked}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Submitting to Stellar Testnet...
                </>
              ) : isLocked ? (
                "Escrow Locked Successfully"
              ) : (
                "Lock Reservation — Approve in Freighter"
              )}
            </Button>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="md:col-span-1">
          <div className="sticky top-28 border border-gold/20 bg-surface rounded-xl overflow-hidden shadow-[0_0_20px_rgba(184,149,42,0.05)]">
            <div className="h-32 bg-navy relative">
               <img 
                src={`https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800&h=400&seed=${lot.id}`}
                alt={lot.name}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent"></div>
            </div>
            <div className="p-6">
              <h4 className="font-serif text-lg leading-tight mb-2">{lot.name}</h4>
              <p className="text-xs font-mono text-muted mb-6 line-clamp-2 bg-gold/5 p-2 rounded">
                ID: {lot.id} | TESTNET RESERVATION
              </p>
              
              <div className="flex items-center space-x-2 text-xs font-medium text-success/80 border border-success/20 bg-success/10 px-3 py-2 rounded-md">
                <ShieldAlert className="w-4 h-4" />
                <span>100% Refundable via Soroban</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
