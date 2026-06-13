import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Loader2, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "./ui/Button";
import { getXlmBalance } from "@/lib/stellar";
import { saveAccountProfile, type AccountProfile, type AccountRole } from "@/lib/account";
import { truncateAddress } from "@/lib/freighter";

interface AccountSetupProps {
  address: string;
  onComplete: (profile: AccountProfile) => void;
}

export function AccountSetup({ address, onComplete }: AccountSetupProps) {
  const [role, setRole] = useState<AccountRole>("client");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [prcLicense, setPrcLicense] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(true);

  useEffect(() => {
    getXlmBalance(address).then((value) => {
      setBalance(value);
      setCheckingBalance(false);
    });
  }, [address]);

  const canSubmit =
    displayName.trim().length >= 2 &&
    (role === "client" || prcLicense.trim().length >= 5);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const profile = saveAccountProfile(address, {
      role,
      displayName: displayName.trim(),
      email: email.trim() || undefined,
      prcLicense: role === "broker" ? prcLicense.trim() : undefined,
      agencyName: role === "broker" ? agencyName.trim() || undefined : undefined,
    });
    onComplete(profile);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-navy/90 backdrop-blur-lg flex items-center justify-center p-5">
      <div className="w-full max-w-2xl bg-surface border border-gold/25 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-7 md:p-9 border-b border-gold/10">
          <div className="flex items-center gap-2 text-success text-xs font-mono uppercase tracking-widest mb-4">
            <ShieldCheck className="w-4 h-4" /> Wallet ownership verified
          </div>
          <h2 className="text-3xl md:text-4xl font-serif text-off-white">Create your Stellar account</h2>
          <p className="text-muted text-sm mt-2">Choose how you will use SA Prime Properties. Your wallet remains noncustodial.</p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-mono">
            <span className="px-3 py-2 rounded-lg bg-navy border border-gold/15 text-gold-light">{truncateAddress(address)}</span>
            <span className="px-3 py-2 rounded-lg bg-navy border border-gold/15 text-muted flex items-center gap-2">
              {checkingBalance ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-success" />}
              {checkingBalance ? "Reading Horizon" : balance === null ? "Unfunded Testnet account" : `${balance.toLocaleString()} XLM`}
            </span>
          </div>
        </div>

        <div className="p-7 md:p-9 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => setRole("client")} className={`text-left p-5 rounded-2xl border transition-all ${role === "client" ? "border-gold bg-gold/10" : "border-gold/10 bg-navy hover:border-gold/30"}`}>
              <UserRound className="w-6 h-6 text-gold mb-3" />
              <strong className="block text-off-white">Property Client</strong>
              <span className="block text-xs text-muted mt-1">Browse properties, lock XLM in escrow, and release or refund funds.</span>
            </button>
            <button onClick={() => setRole("broker")} className={`text-left p-5 rounded-2xl border transition-all ${role === "broker" ? "border-amber bg-amber/10" : "border-gold/10 bg-navy hover:border-amber/30"}`}>
              <Building2 className="w-6 h-6 text-amber mb-3" />
              <strong className="block text-off-white">Licensed Broker</strong>
              <span className="block text-xs text-muted mt-1">Apply to manage listings and anchor verified property credentials.</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-xs text-muted">Display name<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Juan Dela Cruz" className="mt-2 w-full bg-navy border border-gold/15 rounded-xl px-4 py-3 text-off-white outline-none focus:border-gold" /></label>
            <label className="text-xs text-muted">Email (optional)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="mt-2 w-full bg-navy border border-gold/15 rounded-xl px-4 py-3 text-off-white outline-none focus:border-gold" /></label>
            {role === "broker" && <>
              <label className="text-xs text-muted">PRC broker license<input value={prcLicense} onChange={(e) => setPrcLicense(e.target.value)} placeholder="PRC-2026-000000" className="mt-2 w-full bg-navy border border-amber/20 rounded-xl px-4 py-3 text-off-white outline-none focus:border-amber" /></label>
              <label className="text-xs text-muted">Agency (optional)<input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Agency name" className="mt-2 w-full bg-navy border border-amber/20 rounded-xl px-4 py-3 text-off-white outline-none focus:border-amber" /></label>
            </>}
          </div>

          {role === "broker" && <p className="text-xs text-amber bg-amber/10 border border-amber/20 rounded-xl p-3">Broker applications remain pending until the wallet and license are approved. Pending accounts cannot upload credentials or control escrow.</p>}

          <Button onClick={handleSubmit} disabled={!canSubmit} size="lg" className="w-full">Create {role === "broker" ? "Broker Application" : "Client Account"}</Button>
        </div>
      </div>
    </div>
  );
}
