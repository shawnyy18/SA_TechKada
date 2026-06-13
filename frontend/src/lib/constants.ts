/**
 * SA Prime Properties — Application Constants
 *
 * Configured for Stellar TESTNET with native XLM.
 * All prices match the hackathon spec.
 */

export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS?.trim() ||
  "CBOLG3UAH6JRTZ45CHKGTUMNUKZUFK67XDBZ4FCC7O4WXIOG4YYMQG4J";

export const DOCUMENT_VERIFIER_ADDRESS =
  import.meta.env.VITE_DOCUMENT_VERIFIER_ADDRESS?.trim() ||
  "CB3BDB54S7RDYO5L4XZOM4QSRRFB37GNCDPT5EB3WEXSFYZ3UOZG7YJU";

export const STELLAR_NETWORK =
  import.meta.env.VITE_STELLAR_NETWORK?.trim() || "TESTNET";

export const HORIZON_URL =
  import.meta.env.VITE_HORIZON_URL?.trim() || "https://horizon-testnet.stellar.org";

export const SOROBAN_URL =
  import.meta.env.VITE_SOROBAN_URL?.trim() || "https://soroban-testnet.stellar.org";

export const BROKER_ADDRESS =
  import.meta.env.VITE_BROKER_ADDRESS?.trim() ||
  "GDMHW3FNKUHNVUMFZQZ325WRFYCRAR3CWYZ7BRGCN2U4L63VNDDOWNAW";

/** XLM → PHP conversion rate (hardcoded for demo, matches spec) */
export const PHP_CONVERSION_RATE = 8.5;

/** Stellar Expert explorer base URL for testnet transactions */
export const EXPLORER_BASE = "https://stellar.expert/explorer/testnet/tx";

/**
 * 7-day escrow expiry window in milliseconds.
 * Used to compute the auto-refund countdown.
 */
export const ESCROW_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 48-hour broker document submission window in milliseconds.
 */
export const BROKER_DOC_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Demo property lots — prices match the hackathon spec exactly.
 * Lot 7 starts "locked" in the demo to showcase the padlock UI.
 * Status: 0 = Available, 1 = Escrow Locked
 */
export const SAMPLE_LOTS = [
  {
    id: "42",
    name: "San Fernando Heritage Estates",
    location: "Pampanga",
    priceXLM: 500,
    status: 0,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800&h=400",
  },
  {
    id: "7",
    name: "Angeles City Premium Residences",
    location: "Angeles City, Pampanga",
    priceXLM: 250,
    status: 1, // Pre-locked for demo
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=800&h=400",
  },
  {
    id: "12",
    name: "Clark Global City Tower Unit 4B",
    location: "Clark Freeport Zone",
    priceXLM: 1000,
    status: 0,
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800&h=400",
  },
];

/** Pre-filled demo credentials for the broker portal */
export const DEMO_CREDENTIALS = {
  prcBrokerId: "PRC-2024-007821",
  tctReference: "TCT-N-452871",
  zoningPermit: "SFO-ZP-2024-0391",
};
