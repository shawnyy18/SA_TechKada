# SA Prime Properties
Uncompromising Trust. Cryptographic Escrow for Premium Real Estate.

## Problem
International buyers and Overseas Filipino Workers (OFWs) remit billions annually to acquire premium real estate in the Philippines, yet face massive counterparty risk. The current friction involves wiring hundreds of thousands of pesos in initial reservation fees via unregulated OTC transfers or direct bank deposits to unverified brokers. This relies entirely on blind faith, resulting in high rates of capital loss, agent fraud, and zero financial recourse for the buyer when a transaction fails.

## Solution
SA Prime Properties eliminates human vulnerability by deploying a decentralized, private escrow vault directly on the Stellar network. The user chooses Freighter, Albedo, or xBull through StellarWalletsKit, creates a client or broker profile, and locks their deposit in a Soroban smart contract. The capital is untouchable by the broker until legal transfer documents are verified. Stellar provides fast settlement, native token integration, and fractional-cent fees, making institutional-grade cross-border escrow viable for retail buyers.

## Timeline
Developed, tested, and deployed as an enterprise-grade MVP within a 24-hour hackathon sprint.
- **Hours 1-4:** Soroban architecture design, state-machine mapping, and test-driven development (TDD).
- **Hours 5-12:** Smart contract deployment to Stellar Testnet and wallet integration.
- **Hours 13-24:** UI/UX frontend execution (Vite/React/Tailwind), prioritizing an ultra-minimalist, monochromatic private banking aesthetic.

## Stellar Features Used
- **Native XLM / Stellar Assets:** Insulates the buyer from cross-border FX volatility and ensures zero-friction settlement without expensive gas fees.
- **Soroban Smart Contracts:** Replaces the traditional, expensive corporate escrow agent with a trustless, decentralized state machine.
- **Stellar Authentication (`require_auth`):** Ensures cryptographic proof that only the authorized buyer can lock, release, or refund the capital, preventing third-party interception.
- **StellarWalletsKit:** Offers Freighter, Albedo, and xBull from one connection modal and shared transaction-signing pipeline.
- **Signed wallet login:** Creates a 24-hour, noncustodial browser session. Wallets without message signing use an explicit wallet-connection proof for this Testnet MVP.
- **Role-based onboarding:** A wallet can create a client profile or submit a broker application. Broker actions remain restricted to the configured approved broker wallet.
- **Contract events:** Typed `locked`, `verified`, `released`, `refunded`, and `cleared` events are polled from Soroban RPC and synchronized into the React UI.
- **Transaction tracking:** Contract writes visibly progress through preparing, awaiting signature, pending, success, or failed states.

## Level 2 Yellow Belt Evidence

All required Level 2 items are implemented and verifiable on Stellar Testnet.

- **Public repository:** [github.com/shawnyy18/SA_TechKada](https://github.com/shawnyy18/SA_TechKada)
- **Live demo:** [sa-tech-kada.vercel.app](https://sa-tech-kada.vercel.app)
- **Deployed contract:** [`CBIER3WKTHQDBRRFQN6XPN76Q7GNUAFMX3YLJMK3X7BZ44EDNSRQCFX5`](https://stellar.expert/explorer/testnet/contract/CBIER3WKTHQDBRRFQN6XPN76Q7GNUAFMX3YLJMK3X7BZ44EDNSRQCFX5)
- **Contract deployment transaction:** [`85b1be0e...d7eb87b`](https://stellar.expert/explorer/testnet/tx/85b1be0e6eab272e052b11898ae3756b439f75f1ea3cef7fbcbaf3af5d7eb87b)
- **Verified `lock_funds` call:** [`4b5320e7...aa6c0632`](https://stellar.expert/explorer/testnet/tx/4b5320e7de5e8b451397d58e67e801c92530b1e3bfdf3b64f55f1ff8aa6c0632)
- **On-chain event:** The verified call emitted the contract's typed `locked` event for `LOT-YELLOW-LEVEL-2` and transferred 1 Testnet XLM into escrow.
- **Meaningful commits:** The repository contains more than the required two commits, including separate account/wallet and contract/event changes.

### Requirement Checklist

- [x] StellarWalletsKit with Freighter, Albedo, and xBull
- [x] Wallet not found/unavailable error
- [x] User-rejected connection or signature error
- [x] Insufficient XLM balance error before contract submission
- [x] Soroban contract deployed on Testnet
- [x] Contract read and write functions called from the frontend
- [x] Pending, success, and failed transaction states visible
- [x] Real-time contract event polling and UI state refresh
- [x] Client and broker account onboarding
- [x] 16 passing Soroban contract tests

### Wallet Options Screenshot

![StellarWalletsKit options showing Albedo, xBull, and Freighter](docs/yellow-belt-wallet-options.png)

The signed browser session is intentionally frontend-only for this Testnet MVP. Before production or Mainnet, replace local profile storage with a server-issued session using SEP-10-style challenge verification, store broker applications in a database, and integrate real broker KYC/licensing review.

## Run in Antigravity

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

In a second terminal, run the checks:

```bash
cd frontend
npm run lint
npm run build

cd ../contracts/SA-Prime-Properties
cargo test
```

## Vision and Purpose
Founded on the S.A. (Shawn Ashlee) principle of uncompromising asset protection, our vision is to redefine private wealth management for the modern international buyer. We are merging bespoke, luxury Web2 user interfaces with the bulletproof Web3 financial security of the Stellar network to ensure family legacies are protected by code, not promises.

## Prerequisites
Ensure your local development environment is configured for Stellar smart contract compilation:
- Rust (Edition 2021) and Cargo installed.
- Soroban CLI v20.0.0+ (or Stellar CLI) installed globally.
- WebAssembly (Wasm) target installed via: `rustup target add wasm32-unknown-unknown`
- A Stellar Testnet funded account.

## How to Build
Compile the smart contract into a WebAssembly (Wasm) binary optimized for the Stellar network:

```bash
cd contracts/SA-Prime-Properties
stellar contract build
```

## How to Test
Run the comprehensive test suite to verify the state-machine logic and security boundaries:

```bash
cd contracts/SA-Prime-Properties
cargo test
```

## How to Deploy
Deploy the compiled Wasm binary to the Stellar Testnet. You will need a funded testnet identity (e.g., `alice`):

```bash
stellar contract deploy \
  --wasm ../../target/wasm32v1-none/release/SA_Prime_Properties.wasm \
  --source alice \
  --network testnet
```

## Sample CLI Invocation
Here is an example of locking funds (reserving a property) using the Soroban CLI:

```bash
stellar contract invoke \
  --id CBIER3WKTHQDBRRFQN6XPN76Q7GNUAFMX3YLJMK3X7BZ44EDNSRQCFX5 \
  --source alice \
  --network testnet \
  -- \
  lock_funds \
  --lot_id "LOT-07" \
  --buyer "G...BUYER_ADDRESS..." \
  --broker "GDMHW3FNKUHNVUMFZQZ325WRFYCRAR3CWYZ7BRGCN2U4L63VNDDOWNAW" \
  --token "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC" \
  --amount "5000000000"
```

## License
MIT License
