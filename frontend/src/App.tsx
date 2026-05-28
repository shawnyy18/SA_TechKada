/**
 * SA Prime Properties — Root Application
 * 
 * Top-level routing, global navbar with wallet connection,
 * and footer branding.
 */

import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Reserve } from "./pages/Reserve";
import { Vault } from "./pages/Vault";
import { Toaster } from "./components/TransactionToast";
import { WalletConnect } from "./components/WalletConnect";

export default function App() {
  const [publicKey, setPublicKey] = useState<string | null>(null);

  return (
    <Router>
      <div className="min-h-screen flex flex-col font-sans text-off-white selection:bg-gold/30">
        <header className="h-20 border-b border-gold/20 flex items-center justify-between px-6 bg-surface/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <Link to="/" className="flex items-center gap-4">
              <div className="w-10 h-10 border-2 border-gold rounded-lg flex items-center justify-center rotate-45">
                <span className="-rotate-45 text-xl font-bold italic text-gold">S</span>
              </div>
              <div className="flex flex-col">
                <h1 className="font-serif text-xl leading-none tracking-wide text-gold-light">SA PRIME PROPERTIES</h1>
                <p className="text-[10px] text-gold font-mono tracking-widest uppercase">Stellar Escrow Vault</p>
              </div>
            </Link>
            <nav className="flex items-center gap-6">
              {/* Wallet Connection — integrated into the navbar */}
              <WalletConnect
                publicKey={publicKey}
                onConnect={(pk) => setPublicKey(pk)}
                onDisconnect={() => setPublicKey(null)}
              />

              <div className="hidden md:flex flex-col items-end">
                <div className="flex items-center gap-2 px-3 py-1 bg-amber/10 border border-amber/30 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber shadow-[0_0_8px_var(--color-amber)]"></div>
                  <span className="text-[10px] font-mono text-amber font-bold">STELLAR TESTNET</span>
                </div>
                <p className="text-[10px] font-mono text-muted mt-1 uppercase tracking-tighter">HORIZON: SOROBAN-TESTNET.STELLAR.ORG</p>
              </div>
              <Link to="/vault" className="h-10 px-4 bg-gradient-to-r from-gold to-[#8A6D1F] rounded flex items-center gap-3 shadow-[0_0_15px_rgba(184,149,42,0.2)] transition-opacity hover:opacity-90">
                <svg className="w-4 h-4 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002-2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                <span className="text-navy text-xs font-bold font-mono uppercase">Trust Vault</span>
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/reserve/:lotId" element={<Reserve publicKey={publicKey} onConnect={setPublicKey} />} />
            <Route path="/vault" element={<Vault publicKey={publicKey} onConnect={setPublicKey} />} />
          </Routes>
        </main>
        
        <footer className="border-t border-gold/10 bg-surface py-8">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-muted font-mono">
              Secured by Stellar Blockchain • Cryptographic Escrow
            </p>
            <p className="text-sm text-muted mt-4 md:mt-0">
              © {new Date().getFullYear()} SA Prime Properties
            </p>
          </div>
        </footer>
      </div>
      <Toaster />
    </Router>
  );
}
