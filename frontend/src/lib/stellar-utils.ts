import { PHP_CONVERSION_RATE } from "./constants";

export const xlmToStroops = (xlm: number): bigint =>
  BigInt(Math.round(xlm * 10_000_000));

export const stroopsToXlm = (stroops: bigint | number): number =>
  Number(stroops) / 10_000_000;

export const xlmToPhp = (xlm: number): string =>
  (xlm * PHP_CONVERSION_RATE).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatStroopsAsXlm = (stroops: number | null): string => {
  if (stroops === null || stroops === undefined) return "0";
  return (Number(stroops) / 1e7).toLocaleString("en-US", {
    maximumFractionDigits: 4,
  });
};

export async function generateCredentialHash(
  prc: string,
  tct: string,
  zoning: string
): Promise<string> {
  const combined = `${prc}|${tct}|${zoning}`;
  const data = new TextEncoder().encode(combined);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
