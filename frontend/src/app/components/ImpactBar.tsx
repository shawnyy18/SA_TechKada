/**
 * SA Prime Properties — OFW Impact Stats Bar
 *
 * Three-column static stat card with left gold border accent.
 * Numbers: Cormorant Garamond · Labels: Inter muted
 * No API calls — data is static for performance and reliability.
 */

interface StatColumn {
  value: string;
  valueColor: string;
  label: string;
  sublabel: string;
}

const STATS: StatColumn[] = [
  {
    value: "$36.1B",
    valueColor: "#E8D5A0",
    label: "OFW remittances in 2023",
    sublabel: "Bangko Sentral ng Pilipinas",
  },
  {
    value: "~₱10.8B",
    valueColor: "#EF4444",
    label: "Estimated lost to real estate fraud",
    sublabel: "annually · HLURB / BSP estimates",
  },
  {
    value: "< $0.01",
    valueColor: "#22C55E",
    label: "Cost per transaction",
    sublabel: "on Stellar Network",
  },
];

export function ImpactBar() {
  return (
    <>
      {/* Inject animation styles once */}
      <style>{`
        .impact-bar-col + .impact-bar-col {
          border-left: 1px solid rgba(184, 149, 42, 0.15);
        }
      `}</style>

      <div
        style={{
          background: "#111827",
          borderLeft: "3px solid #B8952A",
          borderRadius: "16px",
          overflow: "hidden",
        }}
        className="mx-6 mt-6 mb-2 shadow-[0_0_30px_rgba(184,149,42,0.06)]"
      >
        <div
          className="grid grid-cols-1 md:grid-cols-3"
          style={{ maxWidth: "none" }}
        >
          {STATS.map((stat, i) => (
            <div
              key={i}
              className="impact-bar-col flex flex-col items-center justify-center text-center px-8 py-7"
            >
              {/* Large number — Cormorant Garamond via inline style */}
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "2.25rem",
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: stat.valueColor,
                  letterSpacing: "-0.01em",
                }}
              >
                {stat.value}
              </span>

              {/* Primary label */}
              <span
                style={{
                  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                  fontSize: "0.8125rem",
                  color: "#F5F0E8",
                  marginTop: "6px",
                  fontWeight: 500,
                }}
              >
                {stat.label}
              </span>

              {/* Sub-label — muted */}
              <span
                style={{
                  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                  fontSize: "0.6875rem",
                  color: "#6B7280",
                  marginTop: "2px",
                }}
              >
                {stat.sublabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
