/**
 * SA Prime Properties — Escrow Receipt PDF Generator
 *
 * Loads jsPDF 2.5.1 via CDN (no npm install required).
 * Generates a formatted A4 PDF receipt after lock_funds succeeds.
 *
 * CDN: https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
 * Global: window.jspdf.jsPDF
 */
import { useState, useEffect, useRef } from "react";
import {
  CONTRACT_ADDRESS,
  BROKER_ADDRESS,
  PHP_CONVERSION_RATE,
  EXPLORER_BASE,
  ESCROW_EXPIRY_MS,
} from "@/lib/constants";
import { FileDown, Loader2 } from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────────── */

export interface ReceiptData {
  /** Display name, e.g. "San Fernando Heritage Estates" */
  propertyName: string;
  /** Lot identifier, e.g. "42" */
  lotId: string;
  /** Buyer's Stellar G... address */
  buyerAddress: string;
  /** Amount in XLM (human-readable) */
  amountXlm: number;
  /** Full Soroban transaction hash */
  txHash: string;
  /** Timestamp of lock — defaults to Date.now() */
  lockDate?: number;
}

/* ─── Constants ─────────────────────────────────────────────────────── */

const JSPDF_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

/** Gold color: RGB(184, 149, 42) */
const GOLD = { r: 184, g: 149, b: 42 };
/** Dark navy for body text: RGB(10, 14, 26) */
const NAVY = { r: 10, g: 14, b: 26 };
/** Muted: RGB(100, 116, 139) */
const MUTED = { r: 100, g: 116, b: 139 };

/* ─── CDN Loader ────────────────────────────────────────────────────── */

function loadJsPDF(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).jspdf?.jsPDF) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${JSPDF_CDN}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("jsPDF CDN load failed"))
      );
      return;
    }
    const script = document.createElement("script");
    script.src = JSPDF_CDN;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("jsPDF CDN load failed"));
    document.head.appendChild(script);
  });
}

/* ─── PDF Generator ─────────────────────────────────────────────────── */

/**
 * Generates and downloads the escrow receipt PDF.
 * Requires jsPDF to be loaded via CDN first.
 */
export function generateReceipt(data: ReceiptData): void {
  const jsPDF = (window as any).jspdf?.jsPDF;
  if (!jsPDF) {
    console.error("[EscrowReceipt] jsPDF not loaded yet");
    return;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const lockTs = data.lockDate ?? Date.now();
  const lockDate = new Date(lockTs);
  const expiryDate = new Date(lockTs + ESCROW_EXPIRY_MS);
  const phpAmount = (data.amountXlm * PHP_CONVERSION_RATE).toLocaleString(
    "en-PH",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  );
  const receiptNo = `SAPR-${lockTs}`;
  const buyerShort = `${data.buyerAddress.slice(0, 6)}...${data.buyerAddress.slice(-6)}`;
  const brokerShort = `${BROKER_ADDRESS.slice(0, 6)}...${BROKER_ADDRESS.slice(-6)}`;
  const contractShort = `${CONTRACT_ADDRESS.slice(0, 8)}...${CONTRACT_ADDRESS.slice(-8)}`;
  const lotLabel = `${data.propertyName} · LOT-${data.lotId.padStart(2, "0")}`;

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 20;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  /* ── WATERMARK (drawn first so it's behind everything) ── */
  doc.saveGraphicsState();
  // Light gray watermark text
  doc.setTextColor(220, 220, 220);
  doc.setFontSize(52);
  doc.setFont("helvetica", "bold");
  // Draw rotated 45° diagonal across the page center
  doc.text("TESTNET DEMO", PAGE_W / 2, PAGE_H / 2, {
    angle: 45,
    align: "center",
  });
  doc.restoreGraphicsState();

  /* ── HEADER ── */
  let y = 22;

  // Brand name — large serif style (jsPDF built-in: times = serif)
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(GOLD.r, GOLD.g, GOLD.b);
  doc.text("SA PRIME PROPERTIES", PAGE_W / 2, y, { align: "center" });

  y += 8;

  // Subtitle — italic
  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(
    "Uncompromising Trust. Cryptographic Escrow Receipt.",
    PAGE_W / 2,
    y,
    { align: "center" }
  );

  y += 6;

  // Gold horizontal rule
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);

  y += 3;

  // "OFFICIAL RECEIPT" sub-label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("STELLAR SOROBAN SMART CONTRACT · TESTNET · OFFICIAL RECEIPT", PAGE_W / 2, y + 2, {
    align: "center",
  });

  y += 10;

  /* ── BODY TABLE ── */
  const ROW_H = 9;
  const LABEL_X = MARGIN;
  const VALUE_X = MARGIN + 55;

  /**
   * Draws a single label-value row.
   * Long values (like tx hash) are word-wrapped.
   */
  const drawRow = (
    label: string,
    value: string,
    opts: {
      valueColor?: { r: number; g: number; b: number };
      valueFontStyle?: string;
      valueFontSize?: number;
      isWrapped?: boolean;
    } = {}
  ): number => {
    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(label, LABEL_X, y);

    // Value
    const vc = opts.valueColor ?? NAVY;
    doc.setTextColor(vc.r, vc.g, vc.b);
    doc.setFont("helvetica", opts.valueFontStyle ?? "bold");
    doc.setFontSize(opts.valueFontSize ?? 9);

    if (opts.isWrapped) {
      const lines = doc.splitTextToSize(value, CONTENT_W - 58);
      doc.text(lines, VALUE_X, y);
      const extraRows = lines.length - 1;
      y += ROW_H + extraRows * 5;
    } else {
      doc.text(value, VALUE_X, y);
      y += ROW_H;
    }

    // Subtle separator line
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.1);
    doc.line(MARGIN, y - 1.5, PAGE_W - MARGIN, y - 1.5);

    return y;
  };

  // Receipt number — gold
  drawRow("Receipt No:", receiptNo, {
    valueColor: GOLD,
    valueFontStyle: "bold",
  });

  // Property
  drawRow("Property:", lotLabel);

  // Buyer address
  drawRow("Buyer Address:", buyerShort, {
    valueFontStyle: "normal",
    valueColor: { r: 30, g: 80, b: 160 }, // blue for addresses
  });

  // Broker address
  drawRow("Broker Address:", brokerShort, {
    valueFontStyle: "normal",
    valueColor: { r: 30, g: 80, b: 160 },
  });

  // Amount — gold
  drawRow("Amount Locked:", `${data.amountXlm.toLocaleString()} XLM  (₱${phpAmount} PHP)`, {
    valueColor: GOLD,
    valueFontStyle: "bold",
  });

  // Network
  drawRow("Network:", "Stellar Testnet", {
    valueColor: { r: 245, g: 158, b: 11 }, // amber
    valueFontStyle: "bold",
  });

  // Lock Date
  drawRow("Lock Date:", lockDate.toISOString(), {
    valueFontStyle: "normal",
    valueFontSize: 8.5,
  });

  // Escrow Expiry
  drawRow("Escrow Expiry:", expiryDate.toISOString(), {
    valueFontStyle: "normal",
    valueFontSize: 8.5,
    valueColor: MUTED,
  });

  y += 2;

  // Transaction Hash — DM Mono equivalent (courier in jsPDF), smaller, line-wrapped
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("Transaction Hash:", LABEL_X, y);
  y += 5.5;

  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  const hashLines = doc.splitTextToSize(data.txHash, CONTENT_W);
  doc.text(hashLines, LABEL_X + 4, y);
  y += hashLines.length * 5 + 3;

  // Thin gold separator before footer
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);

  /* ── FOOTER ── */
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);

  const footerLines = [
    "Funds are cryptographically locked in a Soroban smart contract.",
    `Contract: ${contractShort}`,
    `Verify at: stellar.expert/explorer/testnet/tx/${data.txHash.slice(0, 20)}...`,
    "This receipt is for reference only. The on-chain record is authoritative.",
  ];

  footerLines.forEach((line, i) => {
    doc.text(line, PAGE_W / 2, y + i * 6, { align: "center" });
  });

  /* ── Bottom rule ── */
  const bottomY = PAGE_H - 15;
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, bottomY, PAGE_W - MARGIN, bottomY);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(
    `SA Prime Properties · Stellar Testnet · ${new Date().getFullYear()}`,
    PAGE_W / 2,
    bottomY + 5,
    { align: "center" }
  );

  /* ── Save ── */
  const filename = `SAPR-Receipt-LOT${data.lotId}-${lockTs}.pdf`;
  doc.save(filename);
}

/* ─── Download Button Component ─────────────────────────────────────── */

interface DownloadReceiptButtonProps {
  data: ReceiptData;
  /** Optional custom label — defaults to "Download Receipt (PDF)" */
  label?: string;
  className?: string;
  id?: string;
}

/**
 * Gold gradient "Download Receipt (PDF)" button.
 *
 * Handles:
 *  - Loading jsPDF from CDN on mount (one-time, cached in window)
 *  - Generating and triggering PDF download on click
 *  - Loading state while CDN script is fetching
 */
export function DownloadReceiptButton({
  data,
  label = "Download Receipt (PDF)",
  className = "",
  id = "download-receipt-btn",
}: DownloadReceiptButtonProps) {
  const [jsPdfReady, setJsPdfReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadAttempted = useRef(false);

  useEffect(() => {
    if (loadAttempted.current) return;
    loadAttempted.current = true;

    loadJsPDF()
      .then(() => setJsPdfReady(true))
      .catch((err) => {
        setLoadError("PDF library unavailable");
        console.error("[EscrowReceipt] CDN load:", err);
      });
  }, []);

  const handleDownload = async () => {
    if (!jsPdfReady) return;
    setIsGenerating(true);
    try {
      generateReceipt(data);
    } catch (err) {
      console.error("[EscrowReceipt] generate:", err);
    } finally {
      // Brief delay so button doesn't flash
      setTimeout(() => setIsGenerating(false), 600);
    }
  };

  if (loadError) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl border border-muted/20 text-muted/40 cursor-not-allowed"
      >
        <FileDown className="w-4 h-4" />
        PDF Unavailable
      </button>
    );
  }

  return (
    <button
      id={id}
      onClick={handleDownload}
      disabled={!jsPdfReady || isGenerating}
      className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-widest rounded-xl transition-all
        ${
          jsPdfReady && !isGenerating
            ? "bg-gradient-to-r from-gold to-[#8A6D1F] text-navy shadow-[0_4px_15px_rgba(184,149,42,0.3)] hover:shadow-[0_6px_22px_rgba(184,149,42,0.5)] hover:scale-[1.02] active:scale-[0.99]"
            : "bg-gold/10 text-gold/40 border border-gold/20 cursor-not-allowed"
        }
        ${className}`}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating PDF...
        </>
      ) : !jsPdfReady ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading PDF library...
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4" />
          {label}
        </>
      )}
    </button>
  );
}
