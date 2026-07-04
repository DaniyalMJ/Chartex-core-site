import { useEffect, useState, useRef } from "react";

// ── Design tokens ────────────────────────────────────────────────────
const C = {
  bg: "#0A0E14", panel: "#0D1219", panelBorder: "rgba(103,232,249,0.12)",
  cyan: "#22D3EE", green: "#34D399", amber: "#F59E0B", red: "#F87171",
  text: "#E2E8F0", textDim: "#64748B", textFaint: "#3F4A5A",
};

// ── REAL bot7 data source ────────────────────────────────────────────
// bot7 uploads to Supabase STORAGE (not a database table) -- a plain
// JSON file object, publicly readable. No auth needed for a GET.
const STATUS_URL = "https://wmrjaomsxqgmbbfevcgl.supabase.co/storage/v1/object/public/bot-status/live.json";
const STALE_THRESHOLD_MS = 3 * 60 * 1000; // bot7 writes ~every 60s; 3min silence = really offline

async function fetchLiveState() {
  const res = await fetch(`${STATUS_URL}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Maps bot7's real status JSON into what this UI displays. ONLY fields
// confirmed to exist in bot7's actual upload are used here -- nothing
// is invented to fill a prettier layout. If bot7's schema changes,
// only this function needs updating.
function mapBot7Status(raw) {
  return {
    balance: raw.balance ?? null,
    dayPnl: raw.daily_pnl ?? null,
    weeklyPnl: raw.weekly_pnl ?? null,
    tradesThisCycle: raw.entered_this_cycle ?? 0,
    btcBias: raw.btc_bias ?? "UNKNOWN",
    minConfluence: raw.min_confluence ?? null,
    botVersion: raw.bot_version ?? null,
    engines: raw.engines ?? [],
    openPositions: raw.open_positions ?? [],
    oracle: {
      totalTrades: raw.oracle_summary?.total_trades ?? 0,
      winRate: raw.oracle_summary?.win_rate ?? null,
      totalPnl: raw.oracle_summary?.total_pnl ?? null,
      wins: raw.oracle_summary?.wins ?? 0,
      losses: raw.oracle_summary?.losses ?? 0,
    },
    lastScan: raw.last_scan ?? null,
  };
}

function timeAgo(iso) {
  if (!iso) return "never";
  const diffSec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return `${Math.floor(diffSec)}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return `${Math.floor(diffSec / 3600)}h ago`;
}
function fmtTime(d) { return d.toLocaleTimeString("en-GB", { hour12: false }); }

export default function ChartexCoreDashboard() {
  const [state, setState] = useState(null);
  const [connStatus, setConnStatus] = useState("connecting"); // connecting | live | stale | error
  const [errorMsg, setErrorMsg] = useState(null);
  const [clock, setClock] = useState(new Date());
  const [syncLog, setSyncLog] = useState([]);
  const logEndRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const raw = await fetchLiveState();
        if (cancelled) return;
        const mapped = mapBot7Status(raw);
        setState(mapped);
        setErrorMsg(null);
        const ageMs = mapped.lastScan ? Date.now() - new Date(mapped.lastScan).getTime() : Infinity;
        setConnStatus(ageMs > STALE_THRESHOLD_MS ? "stale" : "live");
        setSyncLog((l) => [...l, {
          time: fmtTime(new Date()), ok: true,
          msg: `Synced -- last bot7 scan ${timeAgo(mapped.lastScan)}, balance $${mapped.balance?.toFixed(2) ?? "?"}`,
        }].slice(-30));
      } catch (err) {
        if (cancelled) return;
        setConnStatus("error");
        setErrorMsg(err.message);
        setSyncLog((l) => [...l, { time: fmtTime(new Date()), ok: false, msg: `Fetch failed -- ${err.message}` }].slice(-30));
      }
    }
    poll();
    const cycle = setInterval(poll, 15000);
    return () => { cancelled = true; clearInterval(cycle); };
  }, []);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [syncLog]);

  const offline = connStatus === "error" || connStatus === "stale";
  const statusColor = connStatus === "live" ? C.green : connStatus === "connecting" ? C.textDim : C.red;
  const statusLabel = { live: "LIVE", connecting: "CONNECTING...", stale: "STALE -- BOT7 NOT RESPONDING", error: "OFFLINE -- CANNOT REACH BOT7" }[connStatus];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'JetBrains Mono','Courier New',monospace", fontSize: 12 }}>
      <style>{`
        * { box-sizing: border-box; }
        .panel { background: ${C.panel}; border: 1px solid ${C.panelBorder}; border-radius: 6px; }
        .panel-title { color: ${C.cyan}; font-size: 11px; letter-spacing: 1px; font-weight: 600; padding: 10px 12px; border-bottom: 1px solid ${C.panelBorder}; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; color: ${C.textFaint}; font-size: 9px; letter-spacing: 0.5px; padding: 6px 10px; font-weight: 500; }
        td { padding: 6px 10px; font-size: 11px; border-top: 1px solid rgba(255,255,255,0.03); }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: ${C.panelBorder}; border-radius: 3px; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .live-dot { animation: pulse 1.6s infinite; }
      `}</style>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${C.panelBorder}`, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>CHARTEX CORE</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: statusColor }}>
            <span className="live-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor }} />
            BOT7 -- {statusLabel}
          </span>
          {state?.botVersion && <span style={{ color: C.textFaint }}>v{state.botVersion}</span>}
        </div>
        <div style={{ color: C.textDim }}>{fmtTime(clock)}</div>
      </div>

      {offline && (
        <div style={{ background: "rgba(248,113,113,0.08)", borderBottom: `1px solid ${C.red}`, padding: "8px 16px", color: C.red, fontSize: 11 }}>
          {connStatus === "error"
            ? `Cannot reach bot7's status feed (${errorMsg}). Showing last known data below, if any.`
            : `bot7 hasn't updated its status in over 3 minutes. It may have stopped, lost network, or hit an error. Showing last known data below.`}
        </div>
      )}

      {!state ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textDim }}>Connecting to bot7...</div>
      ) : (
        <>
          {/* Stat strip -- only real fields */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 1, background: C.panelBorder, borderBottom: `1px solid ${C.panelBorder}` }}>
            <Stat label="BALANCE" value={state.balance != null ? `$${state.balance.toFixed(2)}` : "--"} color={C.text} />
            <Stat label="DAILY P/L" value={state.dayPnl != null ? `$${state.dayPnl.toFixed(2)}` : "--"} color={state.dayPnl >= 0 ? C.green : C.red} />
            <Stat label="WEEKLY P/L" value={state.weeklyPnl != null ? `$${state.weeklyPnl.toFixed(2)}` : "--"} color={state.weeklyPnl >= 0 ? C.green : C.red} />
            <Stat label="OPEN POSITIONS" value={state.openPositions.length} color={C.cyan} />
            <Stat label="BTC BIAS" value={state.btcBias} color={state.btcBias === "LONG" ? C.green : state.btcBias === "SHORT" ? C.red : C.textDim} />
            <Stat label="MIN CONFLUENCE" value={state.minConfluence != null ? `${state.minConfluence}/13` : "--"} color={C.amber} />
            <Stat label="LAST SCAN" value={timeAgo(state.lastScan)} color={offline ? C.red : C.textDim} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 10 }}>
            {/* LEFT: Open Positions + Engines */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="panel">
                <div className="panel-title">OPEN POSITIONS</div>
                <table>
                  <thead><tr><th>SYMBOL</th><th>DIR</th><th>ENTRY</th><th>SL</th><th>TP</th><th>CONF</th><th>VOTES</th></tr></thead>
                  <tbody>
                    {state.openPositions.length === 0 && (
                      <tr><td colSpan={7} style={{ color: C.textFaint, textAlign: "center", padding: 16 }}>No open positions</td></tr>
                    )}
                    {state.openPositions.map((p, i) => (
                      <tr key={i}>
                        <td style={{ color: C.cyan }}>{p.symbol}</td>
                        <td style={{ color: p.direction === "LONG" ? C.green : C.red }}>{p.direction}</td>
                        <td>{p.entry}</td>
                        <td style={{ color: C.red }}>{p.sl}</td>
                        <td style={{ color: C.green }}>{p.tp}</td>
                        <td>{p.confidence}%</td>
                        <td>{p.vote_score}/13</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="panel" style={{ padding: 10 }}>
                <div style={{ color: C.cyan, fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>ENGINES</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {state.engines.map((e) => (
                    <span key={e} style={{ background: "rgba(34,211,238,0.08)", color: C.cyan, padding: "4px 10px", borderRadius: 4, fontSize: 10 }}>{e}</span>
                  ))}
                  {state.engines.length === 0 && <span style={{ color: C.textFaint }}>No engine data reported</span>}
                </div>
              </div>
            </div>

            {/* RIGHT: Oracle + Sync Log */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="panel" style={{ padding: 10 }}>
                <div style={{ color: C.cyan, fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>ORACLE -- REAL TRADE HISTORY</div>
                <RiskRow label="TOTAL TRADES JOURNALED" value={state.oracle.totalTrades} />
                <RiskRow label="WIN RATE" value={state.oracle.winRate != null ? `${state.oracle.winRate}%` : "Not enough data yet"} color={state.oracle.winRate != null ? C.green : C.textFaint} />
                <RiskRow label="WINS / LOSSES" value={`${state.oracle.wins} / ${state.oracle.losses}`} />
                <RiskRow label="TOTAL PNL" value={state.oracle.totalPnl != null ? `$${state.oracle.totalPnl.toFixed(2)}` : "--"} color={state.oracle.totalPnl >= 0 ? C.green : C.red} />
                {state.oracle.totalTrades < 10 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.panelBorder}`, color: C.textFaint, fontSize: 10 }}>
                    Below 10 trades -- Oracle itself won't speak with confidence yet, and neither should this dashboard.
                  </div>
                )}
              </div>

              <div className="panel" style={{ display: "flex", flexDirection: "column", height: 280 }}>
                <div className="panel-title">DASHBOARD SYNC LOG</div>
                <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px", fontSize: 10.5, lineHeight: 1.7 }}>
                  {syncLog.map((l, i) => (
                    <div key={i} style={{ color: l.ok ? C.textDim : C.red }}>
                      [{l.time}] {l.msg}
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ background: C.panel, padding: "8px 14px" }}>
      <div style={{ color: C.textFaint, fontSize: 9, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ color, fontWeight: 700, fontSize: 13 }}>{value}</div>
    </div>
  );
}

function RiskRow({ label, value, color = C.text }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11 }}>
      <span style={{ color: C.textDim }}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
