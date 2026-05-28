/**
 * SA Prime Properties — Application Constants
 * 
 * Configured for Stellar TESTNET with native XLM.
 * Prices are set low for demo/testing with a 10,000 XLM testnet wallet.
 */

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "CDKUIVWPVLL5MYZXJWVQONH4XR4KAKJYONQTUN77TP2FCTOPSKJLQ6V7";
export const STELLAR_NETWORK = import.meta.env.VITE_STELLAR_NETWORK || "TESTNET";
export const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || "https://horizon-testnet.stellar.org";
export const SOROBAN_URL = import.meta.env.VITE_SOROBAN_URL || "https://soroban-testnet.stellar.org";
export const BROKER_ADDRESS = import.meta.env.VITE_BROKER_ADDRESS || "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

/** XLM → PHP conversion rate (approximate, for demo display only) */
export const PHP_CONVERSION_RATE = 7.50;

/**
 * Sample property lots for demo.
 * Prices in XLM — kept intentionally low for testnet testing.
 * Total across all lots: 450 XLM (well within the 10,000 XLM testnet balance).
 */
export const SAMPLE_LOTS = [
  {
    id: "42",
    name: "San Fernando Heritage Estates, Pampanga",
    priceXLM: 100,
    status: 0, // 0 = Available, 1 = Escrow Locked
  },
  {
    id: "7",
    name: "Angeles City Premium Residences",
    priceXLM: 50,
    status: 0,
  },
  {
    id: "12",
    name: "Clark Global City Tower Unit 4B",
    priceXLM: 250,
    status: 0,
  }
];
