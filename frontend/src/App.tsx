/**
 * SA Prime Properties — Root Application
 *
 * Top-level routing with global navbar (wallet + TESTNET badge),
 * buyer routes, and broker portal routes.
 */
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Reserve } from "./pages/Reserve";
import { Vault } from "./pages/Vault";
import { Broker } from "./pages/Broker";
import { BrokerEscrow } from "./pages/BrokerEscrow";
// ── New Broker Portal (app/broker/ convention) ──
import { BrokerPage } from "./app/broker/page";
import { BrokerEscrowDetail } from "./app/broker/escrow/[lotId]/page";
import { Toaster } from "./components/TransactionToast";
import { WalletConnect } from "./components/WalletConnect";

export default function App() {
  const [publicKey, setPublicKey] = useState<string | null>(null);

  return (
    <Router>
      <div className="min-h-screen flex flex-col font-sans text-off-white selection:bg-gold/30">
        {/* ── Navigation Header ── */}
        <header className="h-20 border-b border-gold/15 flex items-center px-6 bg-surface/70 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
            {/* Wordmark */}
            <Link to="/" className="flex items-center gap-4 shrink-0">
              <div className="w-10 h-10 border-2 border-gold rounded-lg flex items-center justify-center rotate-45">
                <span className="-rotate-45 text-xl font-bold italic text-gold leading-none">
                  S
                </span>
              </div>
              <div className="flex flex-col">
                <h1 className="font-serif text-lg leading-none tracking-wide text-gold-light">
                  SA PRIME PROPERTIES
                </h1>
                <p className="text-[9px] text-gold font-mono tracking-widest uppercase mt-0.5">
                  Stellar Escrow Vault
                </p>
              </div>
            </Link>

            {/* Center Nav Links */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-4 py-2 text-xs font-mono uppercase tracking-widest rounded-lg transition-all ${
                    isActive
                      ? "text-gold bg-gold/10 border border-gold/20"
                      : "text-muted hover:text-gold hover:bg-gold/5"
                  }`
                }
              >
                Properties
              </NavLink>
              <NavLink
                to="/vault"
                className={({ isActive }) =>
                  `px-4 py-2 text-xs font-mono uppercase tracking-widest rounded-lg transition-all ${
                    isActive
                      ? "text-gold bg-gold/10 border border-gold/20"
                      : "text-muted hover:text-gold hover:bg-gold/5"
                  }`
                }
              >
                Trust Vault
              </NavLink>
              <NavLink
                to="/broker"
                className={({ isActive }) =>
                  `px-4 py-2 text-xs font-mono uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "text-amber bg-amber/10 border border-amber/20"
                      : "text-muted hover:text-amber hover:bg-amber/5"
                  }`
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber" />
                Broker Portal
              </NavLink>
            </nav>

            {/* Right — TESTNET badge + Wallet */}
            <div className="flex items-center gap-4 shrink-0">
              {/* TESTNET badge — always visible */}
              <div className="hidden md:flex flex-col items-end">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber/10 border border-amber/30 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                  <span className="text-[9px] font-mono text-amber font-bold uppercase tracking-widest">
                    STELLAR TESTNET
                  </span>
                </div>
                <p className="text-[9px] font-mono text-muted mt-1 uppercase tracking-tighter">
                  SOROBAN-TESTNET.STELLAR.ORG
                </p>
              </div>

              <WalletConnect
                publicKey={publicKey}
                onConnect={(pk) => setPublicKey(pk)}
                onDisconnect={() => setPublicKey(null)}
                compact
              />
            </div>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="flex-1">
          <Routes>
            {/* Buyer Routes */}
            <Route path="/" element={<Landing />} />
            <Route
              path="/reserve/:lotId"
              element={
                <Reserve publicKey={publicKey} onConnect={setPublicKey} />
              }
            />
            <Route
              path="/vault"
              element={<Vault publicKey={publicKey} onConnect={setPublicKey} />}
            />

            {/* Broker Routes — now served from app/broker/ */}
            <Route
              path="/broker"
              element={
                <BrokerPage publicKey={publicKey} onConnect={setPublicKey} />
              }
            />
            <Route
              path="/broker/escrow/:lotId"
              element={<BrokerEscrowDetail publicKey={publicKey} />}
            />
          </Routes>
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-gold/10 bg-surface py-8">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-muted font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Secured by Stellar Blockchain · Cryptographic Escrow · TESTNET
            </div>
            <p className="text-xs text-muted">
              © {new Date().getFullYear()} SA Prime Properties
            </p>
          </div>
        </footer>
      </div>

      {/* Global Toast Notifications */}
      <Toaster />
    </Router>
  );
}
