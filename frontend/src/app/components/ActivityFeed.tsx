/**
 * SA Prime Properties — Live Activity Feed Ticker
 *
 * Polls Stellar Horizon Testnet every 20 seconds for recent contract
 * transactions and displays them in a horizontally scrolling ticker.
 *
 * CSS-only scrolling animation — no JS scroll loop.
 * Pause on hover via animation-play-state.
 * LIVE badge on left, gradient fade-out on right edge.
 */
import { useState, useEffect } from "react";
import { CONTRACT_ADDRESS, HORIZON_URL } from "@/lib/constants";

/* ─── Types ─────────────────────────────────────────────────────────── */

interface HorizonTransaction {
  id: string;
  hash: string;
  created_at: string;
  memo?: string;
  memo_type?: string;
  successful: boolean;
}

interface TickerItem {
  id: string;
  label: string;
  amount: string;
  timeAgo: string;
  hash: string;
}

/* ─── Relative Time (plain JS — no libraries) ───────────────────────── */

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

/* ─── Memo Parser ───────────────────────────────────────────────────── */

/**
 * Parses a Horizon transaction memo into a human-readable ticker event.
 * Soroban contract calls usually have empty or binary memos, so we
 * construct a label from available context and fall back gracefully.
 */
function parseTxToTickerItem(tx: HorizonTransaction): TickerItem {
  const time = relativeTime(tx.created_at);
  const shortHash = `${tx.hash.slice(0, 8)}...`;

  // Try to read a text memo
  let memo = "";
  if (tx.memo_type === "text" && tx.memo) {
    memo = tx.memo.trim();
  }

  // Attempt to parse structured memos like "LOCK:LOT42:500XLM"
  const lockMatch = memo.match(/LOCK[:\-]?LOT[:\-]?(\d+)[:\-]?(\d+(?:\.\d+)?)/i);
  const refundMatch = memo.match(/REFUND[:\-]?LOT[:\-]?(\d+)/i);
  const docsMatch = memo.match(/DOCS[:\-]?LOT[:\-]?(\d+)/i);
  const releaseMatch = memo.match(/RELEASE[:\-]?LOT[:\-]?(\d+)/i);

  if (lockMatch) {
    return {
      id: tx.id,
      hash: tx.hash,
      label: `LOT-${lockMatch[1]} · Escrow Locked`,
      amount: `${lockMatch[2]} XLM`,
      timeAgo: time,
    };
  }
  if (refundMatch) {
    return {
      id: tx.id,
      hash: tx.hash,
      label: `LOT-${refundMatch[1]} · Refund Issued`,
      amount: "XLM returned",
      timeAgo: time,
    };
  }
  if (releaseMatch) {
    return {
      id: tx.id,
      hash: tx.hash,
      label: `LOT-${releaseMatch[1]} · Funds Released`,
      amount: "—",
      timeAgo: time,
    };
  }
  if (docsMatch) {
    return {
      id: tx.id,
      hash: tx.hash,
      label: `LOT-${docsMatch[1]} · Credentials Anchored`,
      amount: "—",
      timeAgo: time,
    };
  }

  // Generic memo text if available
  if (memo && memo.length > 0 && memo.length < 60) {
    return {
      id: tx.id,
      hash: tx.hash,
      label: memo,
      amount: "—",
      timeAgo: time,
    };
  }

  // Final fallback
  return {
    id: tx.id,
    hash: tx.hash,
    label: "SA Prime Properties · Contract Event",
    amount: "—",
    timeAgo: time,
  };
}

/* ─── Demo fallback items (shown while loading or on API error) ──────── */

const DEMO_ITEMS: TickerItem[] = [
  {
    id: "demo-1",
    hash: "",
    label: "LOT-42 · Escrow Locked",
    amount: "500 XLM",
    timeAgo: "3 min ago",
  },
  {
    id: "demo-2",
    hash: "",
    label: "LOT-07 · Refund Issued",
    amount: "250 XLM",
    timeAgo: "1 hr ago",
  },
  {
    id: "demo-3",
    hash: "",
    label: "LOT-12 · Credentials Anchored",
    amount: "—",
    timeAgo: "2 hr ago",
  },
  {
    id: "demo-4",
    hash: "",
    label: "SA Prime Properties · Contract Event",
    amount: "—",
    timeAgo: "4 hr ago",
  },
  {
    id: "demo-5",
    hash: "",
    label: "LOT-42 · Escrow Initialized",
    amount: "500 XLM",
    timeAgo: "5 hr ago",
  },
];

/* ─── Component ─────────────────────────────────────────────────────── */

export function ActivityFeed() {
  const [items, setItems] = useState<TickerItem[]>(DEMO_ITEMS);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(false);

  const fetchTransactions = async () => {
    try {
      const url = `${HORIZON_URL}/accounts/${CONTRACT_ADDRESS}/transactions?order=desc&limit=5`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Horizon ${res.status}`);
      const data = await res.json();
      const records: HorizonTransaction[] =
        data?._embedded?.records ?? [];

      if (records.length === 0) {
        // No transactions yet — keep demo items but mark live
        setIsLive(true);
        return;
      }

      const parsed = records
        .filter((tx) => tx.successful)
        .map(parseTxToTickerItem);

      // Pad to at least 5 items so ticker always has content
      const padded =
        parsed.length < 5
          ? [...parsed, ...DEMO_ITEMS.slice(parsed.length)]
          : parsed;

      setItems(padded);
      setIsLive(true);
      setError(false);
    } catch (e) {
      console.warn("[ActivityFeed] Horizon fetch failed:", e);
      setError(true);
      setIsLive(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    const id = setInterval(fetchTransactions, 20_000);
    return () => clearInterval(id);
  }, []);

  // Duplicate items so the CSS ticker loops seamlessly at -50%
  const doubled = [...items, ...items];

  return (
    <>
      {/* Keyframe injection — self-contained, no external CSS file */}
      <style>{`
        @keyframes sa-ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .sa-ticker-track {
          animation: sa-ticker 30s linear infinite;
          display: flex;
          width: max-content;
        }
        .sa-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div
        className="relative mx-0 overflow-hidden"
        style={{
          background: "rgba(17, 24, 39, 0.85)",
          borderTop: "1px solid rgba(184, 149, 42, 0.12)",
          borderBottom: "1px solid rgba(184, 149, 42, 0.12)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* ── LIVE badge — left edge, absolute positioned ── */}
        <div
          className="absolute left-0 top-0 bottom-0 z-20 flex items-center pl-4 pr-6"
          style={{
            background:
              "linear-gradient(to right, #0A0E1A 60%, transparent)",
            minWidth: "100px",
          }}
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: error ? "#EF4444" : "#22C55E",
                boxShadow: error
                  ? "0 0 8px #EF444480"
                  : "0 0 8px #22C55E80",
                animation: "pulse 2s ease-in-out infinite",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontFamily: "DM Mono, ui-monospace, monospace",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: error ? "#EF4444" : isLive ? "#22C55E" : "#F59E0B",
              }}
            >
              {error ? "OFFLINE" : isLive ? "LIVE" : "DEMO"}
            </span>
          </div>
        </div>

        {/* ── Ticker track ── */}
        <div className="py-2.5 pl-[108px] pr-0">
          <div className="sa-ticker-track gap-0">
            {doubled.map((item, i) => (
              <div
                key={`${item.id}-${i}`}
                className="flex items-center shrink-0"
                style={{
                  paddingLeft: "32px",
                  paddingRight: "32px",
                  borderRight: "1px solid rgba(184, 149, 42, 0.08)",
                }}
              >
                {/* Diamond bullet */}
                <span
                  style={{
                    color: "#B8952A",
                    fontSize: "8px",
                    marginRight: "10px",
                    flexShrink: 0,
                  }}
                >
                  ◆
                </span>

                {/* Event label */}
                <span
                  style={{
                    fontFamily: "Inter, ui-sans-serif, sans-serif",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#F5F0E8",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>

                {/* Amount (if any) */}
                {item.amount !== "—" && (
                  <span
                    style={{
                      fontFamily: "DM Mono, ui-monospace, monospace",
                      fontSize: "11px",
                      color: "#B8952A",
                      marginLeft: "8px",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    · {item.amount}
                  </span>
                )}

                {/* Time */}
                <span
                  style={{
                    fontFamily: "DM Mono, ui-monospace, monospace",
                    fontSize: "10px",
                    color: "#6B7280",
                    marginLeft: "8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  · {item.timeAgo}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right edge gradient fade-out mask ── */}
        <div
          className="absolute right-0 top-0 bottom-0 pointer-events-none z-10"
          style={{
            width: "80px",
            background:
              "linear-gradient(to left, #0A0E1A 30%, transparent)",
          }}
        />
      </div>
    </>
  );
}
