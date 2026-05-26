Contract ID: CDKUIVWPVLL5MYZXJWVQONH4XR4KAKJYONQTUN77TP2FCTOPSKJLQ6V7

🔗 https://stellar.expert/explorer/testnet/tx/b3438ac2253ac9fdf42abf5433c409ffa572c19a80e79f044768d5892c35995f

<img width="1920" height="905" alt="Screenshot 2026-05-26 120857" src="https://github.com/user-attachments/assets/907003ba-3cc0-4ce6-8cf1-ecd6efed7f23" />


# SA Prime Properties
Uncompromising Trust. Cryptographic Escrow for Premium Real Estate.

## Problem
International buyers and Overseas Filipino Workers (OFWs) remit billions annually to acquire premium real estate in the Philippines, yet face massive counterparty risk. The current friction involves wiring hundreds of thousands of pesos in initial reservation fees via unregulated OTC transfers or direct bank deposits to unverified brokers. This relies entirely on blind faith, resulting in high rates of capital loss, agent fraud, and zero financial recourse for the buyer when a transaction fails.

## Solution
SA Prime Properties eliminates human vulnerability by deploying a decentralized, private escrow vault directly on the Stellar network. The user connects their Freighter wallet via our bespoke luxury Next.js interface, locking their USDC deposit in a Soroban smart contract. The capital is mathematically untouchable by the broker until legal transfer documents are verified by the buyer. Stellar is essential here: it provides 5-second settlement, native USDC stablecoin integration, and fractional-cent fees, making institutional-grade cross-border escrow accessible and viable for retail buyers.

## Timeline
Developed, tested, and deployed as an enterprise-grade MVP within a 24-hour hackathon sprint.
- **Hours 1-4:** Soroban architecture design, state-machine mapping, and test-driven development (TDD).
- **Hours 5-12:** Smart contract deployment to the Stellar Testnet and Freighter API bridging.
- **Hours 13-24:** UI/UX frontend execution (Next.js/Tailwind), prioritizing an ultra-minimalist, monochromatic private banking aesthetic.

## Stellar Features Used
- **XLM / Native USDC Transfers:** Insulates the buyer from cross-border FX volatility and ensures zero-friction settlement without expensive Ethereum-style gas fees.
- **Soroban Smart Contracts:** Replaces the traditional, expensive corporate escrow agent with a trustless, decentralized state machine.
- **Stellar Authentication (`require_auth`):** Ensures cryptographic proof that only the authorized buyer can lock, release, or refund the capital, preventing third-party interception.

## Vision and Purpose
Founded on the S.A. (Shawn Ashlee) principle of uncompromising asset protection, our vision is to redefine private wealth management for the modern international buyer. We are merging bespoke, luxury Web2 user interfaces with the bulletproof Web3 financial security of the Stellar network to ensure family legacies are protected by code, not promises.

## Prerequisites
Ensure your local development environment is configured for Stellar smart contract compilation:
- Rust (Edition 2021) and Cargo installed.
- Soroban CLI v20.0.0+ installed globally.
- WebAssembly (Wasm) target installed via: `rustup target add wasm32-unknown-unknown`
- A Stellar Testnet funded account (can be generated via the Stellar Laboratory Friendbot).

## How to Build
Compile the smart contract into a WebAssembly (Wasm) binary optimized for the Stellar network. The release profile in `Cargo.toml` is pre-configured to strip dead code and minimize the final deployment size:

```bash
soroban contract build
