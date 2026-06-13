import { BROKER_ADDRESS } from "./constants";
import type { WalletProof } from "./freighter";

export type AccountRole = "client" | "broker";
export type BrokerStatus = "not_applicable" | "pending" | "verified";

export interface AccountProfile {
  address: string;
  role: AccountRole;
  displayName: string;
  email?: string;
  prcLicense?: string;
  agencyName?: string;
  brokerStatus: BrokerStatus;
  createdAt: number;
  updatedAt: number;
}

const PROFILE_PREFIX = "sa_prime_profile_";
const SESSION_PREFIX = "sa_prime_session_";

export function getAccountProfile(address: string): AccountProfile | null {
  try {
    const raw = localStorage.getItem(`${PROFILE_PREFIX}${address}`);
    return raw ? (JSON.parse(raw) as AccountProfile) : null;
  } catch {
    return null;
  }
}

export function saveAccountProfile(
  address: string,
  input: Omit<AccountProfile, "address" | "brokerStatus" | "createdAt" | "updatedAt">
): AccountProfile {
  const existing = getAccountProfile(address);
  const now = Date.now();
  const profile: AccountProfile = {
    ...input,
    address,
    brokerStatus:
      input.role === "broker"
        ? address === BROKER_ADDRESS
          ? "verified"
          : "pending"
        : "not_applicable",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  localStorage.setItem(`${PROFILE_PREFIX}${address}`, JSON.stringify(profile));
  return profile;
}

export function saveWalletSession(proof: WalletProof): void {
  sessionStorage.setItem(`${SESSION_PREFIX}${proof.address}`, JSON.stringify(proof));
}

export function hasValidWalletSession(address: string): boolean {
  try {
    const raw = sessionStorage.getItem(`${SESSION_PREFIX}${address}`);
    if (!raw) return false;
    const proof = JSON.parse(raw) as WalletProof;
    return proof.address === address && proof.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function clearWalletSession(address: string): void {
  sessionStorage.removeItem(`${SESSION_PREFIX}${address}`);
}
