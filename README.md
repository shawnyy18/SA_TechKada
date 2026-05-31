# SA Prime Properties
Uncompromising Trust. Cryptographic Escrow for Premium Real Estate.

## Problem
International buyers and Overseas Filipino Workers (OFWs) remit billions annually to acquire premium real estate in the Philippines, yet face massive counterparty risk. The current friction involves wiring hundreds of thousands of pesos in initial reservation fees via unregulated OTC transfers or direct bank deposits to unverified brokers. This relies entirely on blind faith, resulting in high rates of capital loss, agent fraud, and zero financial recourse for the buyer when a transaction fails.

## Solution
SA Prime Properties eliminates human vulnerability by deploying a decentralized, private escrow vault directly on the Stellar network. The user connects their Freighter wallet via our bespoke luxury Web3 interface, locking their deposit in a Soroban smart contract. The capital is mathematically untouchable by the broker until legal transfer documents are verified. Stellar is essential here: it provides 5-second settlement, native token integration, and fractional-cent fees, making institutional-grade cross-border escrow accessible and viable for retail buyers.

## Timeline
Developed, tested, and deployed as an enterprise-grade MVP within a 24-hour hackathon sprint.
- **Hours 1-4:** Soroban architecture design, state-machine mapping, and test-driven development (TDD).
- **Hours 5-12:** Smart contract deployment to the Stellar Testnet and Freighter API bridging.
- **Hours 13-24:** UI/UX frontend execution (Vite/React/Tailwind), prioritizing an ultra-minimalist, monochromatic private banking aesthetic.

## Stellar Features Used
- **Native XLM / Stellar Assets:** Insulates the buyer from cross-border FX volatility and ensures zero-friction settlement without expensive gas fees.
- **Soroban Smart Contracts:** Replaces the traditional, expensive corporate escrow agent with a trustless, decentralized state machine.
- **Stellar Authentication (`require_auth`):** Ensures cryptographic proof that only the authorized buyer can lock, release, or refund the capital, preventing third-party interception.

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
soroban contract build
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
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/SA_Prime_Properties.wasm \
  --source alice \
  --network testnet
```

## Sample CLI Invocation
Here is an example of locking funds (reserving a property) using the Soroban CLI:

```bash
soroban contract invoke \
  --id CCUQYF3N3BTSCCJKAW7NRYKZINZLOYVQDL7JZHCXMXJYILGWCZLQ55HD \
  --source alice \
  --network testnet \
  -- \
  lock_funds \
  --lot_id "LOT-07" \
  --buyer "G...BUYER_ADDRESS..." \
  --broker "GDMHW3FNKUHNVUMFZQZ325WRFYCRAR3CWYZ7BRGCN2U4L63VNDDOWNAW" \
  --token "C...TOKEN_ADDRESS..." \
  --amount "5000000000"
```

## License
MIT License
