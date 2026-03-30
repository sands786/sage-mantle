import { useState, useEffect, useRef, useCallback } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;600;700;800&display=swap');`;

const PORTFOLIO = {
  wallet: "0x4f3B...d9A2",
  netWorth: 24830.17,
  healthScore: 67,
  positions: [
    { protocol: "Mantle LSP",     asset: "mETH",   amount: 3.42,    value: 12304.80, apy: 4.2,  risk: "low",    type: "stake",  utilization: null },
    { protocol: "Lendle",         asset: "MNT",    amount: 4200,    value: 5712.00,  apy: 8.7,  risk: "medium", type: "lend",   utilization: 0.71 },
    { protocol: "Agni Finance",   asset: "USDT",   amount: 3800,    value: 3800.00,  apy: 12.4, risk: "medium", type: "lp",     utilization: null },
    { protocol: "Lendle",         asset: "WBTC",   amount: 0.041,   value: 2813.37,  apy: null, risk: "high",   type: "borrow", utilization: 0.82 },
    { protocol: "FusionX",        asset: "MNT/ETH",amount: null,    value: 200.00,   apy: 31.2, risk: "high",   type: "lp",     utilization: null },
  ],
  alerts: [
    { level: "critical", msg: "Lendle WBTC borrow at 82% utilization — liquidation risk if MNT drops 12%" },
    { level: "warn",     msg: "mETH LSP rewards unclaimed for 14 days — compounding opportunity missed" },
    { level: "info",     msg: "Agni USDT pool fee tier suboptimal vs current volatility regime" },
  ],
  opportunities: [
    { name: "mETH/USDT Stable LP", protocol: "Agni Finance", apy: "18.3%", tvl: "$4.2M",  risk: "low",    match: 94 },
    { name: "MNT Lending Boost",   protocol: "Lendle",       apy: "11.2%", tvl: "$12.1M", risk: "low",    match: 88 },
    { name: "ETH-BTC Perp Hedge",  protocol: "Vertex",       apy: "—",     tvl: "—",      risk: "medium", match: 76 },
  ]
};

const SYSTEM_PROMPT = `You are SAGE — a sharp, data-literate AI co-pilot embedded inside a DeFi dashboard on Mantle Network (Ethereum L2). You specialize in on-chain risk analysis, yield optimization, and DeFi strategy.

User's current Mantle portfolio:
${JSON.stringify(PORTFOLIO.positions, null, 2)}

Key alerts:
${PORTFOLIO.alerts.map(a => `[${a.level.toUpperCase()}] ${a.msg}`).join('\n')}

Portfolio health score: ${PORTFOLIO.healthScore}/100
Net worth: $${PORTFOLIO.netWorth.toLocaleString()}

Mantle ecosystem context: Mantle is an EVM-compatible L2 with MNT as native gas token, Mantle LSP for ETH staking (mETH), and a growing DeFi ecosystem including Lendle (lending), Agni Finance (DEX/LP), FusionX (DEX), and Vertex Protocol (perps). Mantle Network has very low gas fees (~$0.001/tx).

Your role:
- Analyze the user's positions with precise numbers
- Flag real risks (liquidations, IL, depegs, concentration)
- Suggest concrete yield optimizations with APY/risk tradeoffs
- Answer DeFi strategy questions directly and concisely
- Be direct. No fluff. Use numbers. Max 3-4 sentences unless asked for detail.
- You may use markdown for structure when helpful.`;

const css = `
${FONTS}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#080B0D;color:#C8D0D8;font-family:'DM Mono',monospace;overflow:hidden}
:root{
  --teal:#00C896;--teal-dim:#00785A;--teal-bg:#001F18;
  --amber:#F0A030;--amber-bg:#1A1000;
  --red:#E84040;--red-bg:#1A0808;
  --blue:#4A9EFF;
  --bg0:#080B0D;--bg1:#0D1215;--bg2:#111820;--bg3:#172028;
  --border:#1E2A32;--border2:#263442;
  --text0:#E8F0F8;--text1:#A0B0BC;--text2:#5A7080;
}

.root{display:grid;grid-template-rows:52px 1fr;grid-template-columns:1fr 380px;height:100vh;gap:0;background:var(--bg0)}

/* HEADER */
.hdr{grid-column:1/-1;display:flex;align-items:center;padding:0 20px;background:var(--bg1);border-bottom:1px solid var(--border);gap:20px;position:relative;z-index:10}
.logo{font-family:'Syne',sans-serif;font-weight:800;font-size:20px;letter-spacing:0.08em;color:var(--teal);margin-right:8px}
.logo-sub{font-size:10px;color:var(--text2);letter-spacing:0.15em;text-transform:uppercase;margin-top:2px}
.hdr-divider{width:1px;height:28px;background:var(--border2);margin:0 4px}
.hdr-stat{display:flex;flex-direction:column;gap:1px}
.hdr-stat-label{font-size:9px;letter-spacing:0.15em;color:var(--text2);text-transform:uppercase}
.hdr-stat-val{font-size:13px;font-weight:500;color:var(--text0)}
.hdr-stat-val.green{color:var(--teal)}
.hdr-right{margin-left:auto;display:flex;align-items:center;gap:12px}
.wallet-badge{display:flex;align-items:center;gap:8px;background:var(--bg2);border:1px solid var(--border2);border-radius:6px;padding:6px 12px;font-size:11px;color:var(--text1);cursor:pointer;transition:border-color .2s}
.wallet-badge:hover{border-color:var(--teal-dim)}
.wallet-dot{width:7px;height:7px;border-radius:50%;background:var(--teal);box-shadow:0 0 6px var(--teal);flex-shrink:0}
.network-badge{background:var(--teal-bg);border:1px solid var(--teal-dim);border-radius:4px;padding:4px 10px;font-size:10px;color:var(--teal);letter-spacing:0.1em}

/* MAIN LEFT */
.main{overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px;background:var(--bg0)}
.main::-webkit-scrollbar{width:4px}
.main::-webkit-scrollbar-track{background:transparent}
.main::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

/* PANEL */
.panel{background:var(--bg1);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.panel-hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg2)}
.panel-title{font-family:'Syne',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:var(--text1)}
.panel-badge{font-size:9px;padding:2px 8px;border-radius:3px;letter-spacing:0.1em;text-transform:uppercase}
.badge-green{background:var(--teal-bg);border:1px solid var(--teal-dim);color:var(--teal)}
.badge-amber{background:var(--amber-bg);border:1px solid #5A3800;color:var(--amber)}
.badge-red{background:var(--red-bg);border:1px solid #5A1A1A;color:var(--red)}
.badge-gray{background:var(--bg3);border:1px solid var(--border2);color:var(--text2)}

/* SCORE GRID */
.score-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-bottom:1px solid var(--border)}
.score-cell{padding:14px 16px;border-right:1px solid var(--border);position:relative;overflow:hidden}
.score-cell:last-child{border-right:none}
.score-label{font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:var(--text2);margin-bottom:6px}
.score-val{font-size:22px;font-weight:500;font-family:'Syne',sans-serif;color:var(--text0)}
.score-val.red{color:var(--red)}
.score-val.amber{color:var(--amber)}
.score-val.green{color:var(--teal)}
.score-sub{font-size:10px;color:var(--text2);margin-top:3px}
.score-bar-track{height:2px;background:var(--border2);border-radius:1px;margin-top:8px;overflow:hidden}
.score-bar-fill{height:100%;border-radius:1px;transition:width 1.2s cubic-bezier(.4,0,.2,1)}

/* HEALTH RING */
.health-cell{display:flex;align-items:center;gap:14px;padding:14px 16px;border-right:1px solid var(--border)}
.ring-wrap{position:relative;width:52px;height:52px;flex-shrink:0}
.ring-wrap svg{transform:rotate(-90deg)}
.ring-label{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(0)}
.ring-score{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:var(--amber);line-height:1}
.ring-max{font-size:8px;color:var(--text2)}

/* TABLE */
.pos-table{width:100%;border-collapse:collapse;font-size:11px}
.pos-table th{padding:7px 14px;text-align:left;font-size:9px;letter-spacing:0.15em;text-transform:uppercase;color:var(--text2);border-bottom:1px solid var(--border);font-weight:400}
.pos-table td{padding:9px 14px;border-bottom:1px solid var(--border);color:var(--text1);vertical-align:middle}
.pos-table tr:last-child td{border-bottom:none}
.pos-table tr:hover td{background:var(--bg2)}
.protocol-name{color:var(--text0);font-weight:500}
.asset-tag{background:var(--bg3);border:1px solid var(--border2);padding:2px 7px;border-radius:3px;font-size:10px;color:var(--text1);display:inline-block}
.type-tag{font-size:9px;padding:2px 7px;border-radius:3px;text-transform:uppercase;letter-spacing:0.08em;display:inline-block}
.type-stake{background:rgba(0,200,150,0.08);border:1px solid rgba(0,200,150,0.2);color:var(--teal)}
.type-lend{background:rgba(74,158,255,0.08);border:1px solid rgba(74,158,255,0.2);color:var(--blue)}
.type-borrow{background:rgba(232,64,64,0.08);border:1px solid rgba(232,64,64,0.2);color:var(--red)}
.type-lp{background:rgba(240,160,48,0.08);border:1px solid rgba(240,160,48,0.2);color:var(--amber)}
.util-bar{height:3px;border-radius:2px;margin-top:3px;overflow:hidden;background:var(--border2)}
.util-fill{height:100%;border-radius:2px}
.util-low{background:var(--teal)}
.util-mid{background:var(--amber)}
.util-high{background:var(--red)}

/* ALERTS */
.alerts{display:flex;flex-direction:column;gap:0}
.alert-row{display:flex;align-items:flex-start;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border)}
.alert-row:last-child{border-bottom:none}
.alert-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:4px}
.dot-red{background:var(--red);box-shadow:0 0 5px var(--red)}
.dot-amber{background:var(--amber);box-shadow:0 0 5px var(--amber)}
.dot-blue{background:var(--blue)}
.alert-msg{font-size:11px;color:var(--text1);line-height:1.55}

/* OPPORTUNITIES */
.opp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0}
.opp-card{padding:14px 16px;border-right:1px solid var(--border);cursor:pointer;transition:background .15s;position:relative}
.opp-card:last-child{border-right:none}
.opp-card:hover{background:var(--bg2)}
.opp-name{font-size:12px;font-weight:500;color:var(--text0);margin-bottom:3px;font-family:'Syne',sans-serif}
.opp-protocol{font-size:10px;color:var(--text2);margin-bottom:10px}
.opp-apy{font-size:20px;font-family:'Syne',sans-serif;font-weight:700;color:var(--teal)}
.opp-apy-label{font-size:9px;color:var(--text2);letter-spacing:0.1em;text-transform:uppercase}
.opp-match{position:absolute;top:14px;right:14px;font-size:10px;color:var(--teal);background:var(--teal-bg);border:1px solid var(--teal-dim);padding:2px 7px;border-radius:3px}

/* CHAT SIDEBAR */
.chat{grid-row:2;display:flex;flex-direction:column;background:var(--bg1);border-left:1px solid var(--border);overflow:hidden}
.chat-hdr{padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;gap:10px;flex-shrink:0}
.sage-avatar{width:28px;height:28px;border-radius:6px;background:var(--teal-bg);border:1px solid var(--teal-dim);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:11px;color:var(--teal);flex-shrink:0}
.sage-name{font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:var(--text0)}
.sage-status{font-size:9px;color:var(--teal);display:flex;align-items:center;gap:4px}
.status-dot{width:5px;height:5px;border-radius:50%;background:var(--teal);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

.chat-msgs{flex:1;overflow-y:auto;padding:14px 14px 6px;display:flex;flex-direction:column;gap:10px}
.chat-msgs::-webkit-scrollbar{width:3px}
.chat-msgs::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

.msg{display:flex;gap:8px;align-items:flex-start}
.msg.user{flex-direction:row-reverse}
.msg-bubble{max-width:260px;padding:9px 12px;border-radius:10px;font-size:11.5px;line-height:1.6;border:1px solid var(--border2)}
.msg.ai .msg-bubble{background:var(--bg2);color:var(--text1);border-color:var(--border);border-radius:10px 10px 10px 2px}
.msg.user .msg-bubble{background:rgba(0,200,150,0.08);border-color:var(--teal-dim);color:var(--text0);border-radius:10px 10px 2px 10px}
.msg-bubble p{margin-bottom:6px}
.msg-bubble p:last-child{margin-bottom:0}
.msg-bubble strong{color:var(--text0);font-weight:500}
.msg-bubble code{background:var(--bg0);border:1px solid var(--border2);border-radius:3px;padding:1px 5px;font-size:10.5px;color:var(--teal);font-family:'DM Mono',monospace}
.msg-bubble ul{padding-left:14px;margin:4px 0}
.msg-bubble li{margin-bottom:3px}
.msg-avatar{width:22px;height:22px;border-radius:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;font-family:'Syne',sans-serif;font-weight:700;margin-top:1px}
.ai-av{background:var(--teal-bg);border:1px solid var(--teal-dim);color:var(--teal)}
.user-av{background:var(--bg3);border:1px solid var(--border2);color:var(--text2)}

.typing{display:flex;align-items:center;gap:3px;padding:10px 12px}
.typing span{width:5px;height:5px;border-radius:50%;background:var(--text2);animation:blink 1.2s ease-in-out infinite}
.typing span:nth-child(2){animation-delay:.2s}
.typing span:nth-child(3){animation-delay:.4s}
@keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}

.quick-btns{display:flex;flex-wrap:wrap;gap:5px;padding:8px 14px 4px;flex-shrink:0}
.quick-btn{font-size:10px;font-family:'DM Mono',monospace;padding:4px 9px;border-radius:4px;border:1px solid var(--border2);background:var(--bg2);color:var(--text2);cursor:pointer;transition:all .15s;white-space:nowrap}
.quick-btn:hover{border-color:var(--teal-dim);color:var(--teal);background:var(--teal-bg)}

.chat-input-wrap{padding:10px 14px 14px;flex-shrink:0;border-top:1px solid var(--border)}
.chat-input-row{display:flex;gap:8px;align-items:flex-end}
.chat-textarea{flex:1;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-family:'DM Mono',monospace;font-size:11.5px;color:var(--text0);resize:none;min-height:38px;max-height:100px;line-height:1.5;transition:border-color .2s;outline:none}
.chat-textarea::placeholder{color:var(--text2)}
.chat-textarea:focus{border-color:var(--teal-dim)}
.send-btn{width:36px;height:36px;border-radius:7px;background:var(--teal);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .2s;margin-bottom:1px}
.send-btn:hover{opacity:0.85}
.send-btn:disabled{opacity:0.3;cursor:not-allowed}
.send-icon{width:14px;height:14px;fill:none;stroke:#000;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}

/* ENTRY SCREEN */
.entry{position:fixed;inset:0;background:var(--bg0);display:flex;align-items:center;justify-content:center;z-index:100;flex-direction:column;gap:32px}
.entry-logo{font-family:'Syne',sans-serif;font-weight:800;font-size:48px;letter-spacing:0.06em;color:var(--teal);text-shadow:0 0 40px rgba(0,200,150,0.3)}
.entry-sub{font-size:13px;color:var(--text2);letter-spacing:0.2em;text-transform:uppercase;margin-top:-20px}
.entry-desc{font-size:13px;color:var(--text1);max-width:380px;text-align:center;line-height:1.7}
.connect-btn{background:var(--teal);color:#000;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;padding:12px 32px;border-radius:8px;border:none;cursor:pointer;transition:opacity .2s}
.connect-btn:hover{opacity:0.85}
.entry-network{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text2)}
.entry-dot{width:8px;height:8px;border-radius:50%;background:var(--teal);box-shadow:0 0 8px var(--teal)}
@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.entry>*{animation:fadeIn .5s ease both}
.entry>*:nth-child(1){animation-delay:.1s}
.entry>*:nth-child(2){animation-delay:.2s}
.entry>*:nth-child(3){animation-delay:.3s}
.entry>*:nth-child(4){animation-delay:.4s}
.entry>*:nth-child(5){animation-delay:.5s}
@keyframes dashIn{from{stroke-dashoffset:320}to{stroke-dashoffset:0}}
`;

function parseSimpleMarkdown(text) {
  const lines = text.split('\n');
  const elements = [];
  let key = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const parsed = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
    if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(<li key={key++} dangerouslySetInnerHTML={{ __html: parsed.slice(2) }} />);
    } else {
      elements.push(<p key={key++} dangerouslySetInnerHTML={{ __html: parsed }} />);
    }
  }
  const result = [];
  let listItems = [];
  for (let el of elements) {
    if (el.type === 'li') { listItems.push(el); }
    else {
      if (listItems.length) { result.push(<ul key={key++}>{listItems}</ul>); listItems = []; }
      result.push(el);
    }
  }
  if (listItems.length) result.push(<ul key={key++}>{listItems}</ul>);
  return result;
}

const QUICK_PROMPTS = [
  "What's my biggest risk?",
  "Optimize my yield",
  "Is my WBTC borrow safe?",
  "Best Mantle LP now?",
];

const INIT_MSGS = [
  {
    role: "ai",
    text: "Portfolio loaded. Health score **67/100** — your Lendle WBTC borrow at 82% utilization is the critical risk. One bad candle and you're in liquidation territory.\n\nWhat do you want to tackle first?"
  }
];

export default function App() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState(INIT_MSGS);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const msgsEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: trimmed }]);
    const newHistory = [...history, { role: "user", content: trimmed }];
    setHistory(newHistory);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newHistory,
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Something went wrong.";
      setMessages(prev => [...prev, { role: "ai", text: reply }]);
      setHistory(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "ai", text: "Network error — check API connection." }]);
    }
    setLoading(false);
  }, [loading, history]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const riskColor = (r) => r === 'low' ? 'green' : r === 'medium' ? 'amber' : 'red';
  const riskBadge = (r) => r === 'low' ? 'badge-green' : r === 'medium' ? 'badge-amber' : 'badge-red';

  if (!connected) {
    return (
      <>
        <style>{css}</style>
        <div className="entry">
          <div className="entry-logo">SAGE</div>
          <div className="entry-sub">Smart AI Guardian Engine · Mantle Network</div>
          <div className="entry-desc">
            AI-powered DeFi co-pilot for Mantle. Real-time risk scoring, yield optimization, and on-chain intelligence — all in one terminal.
          </div>
          <button className="connect-btn" onClick={() => setConnected(true)}>
            Connect Wallet
          </button>
          <div className="entry-network">
            <div className="entry-dot" />
            Mantle Mainnet · Chain ID 5000
          </div>
        </div>
      </>
    );
  }

  const ringR = 22;
  const ringCirc = 2 * Math.PI * ringR;
  const ringDash = (PORTFOLIO.healthScore / 100) * ringCirc;

  return (
    <>
      <style>{css}</style>
      <div className="root">

        {/* HEADER */}
        <header className="hdr">
          <div>
            <div className="logo">SAGE</div>
            <div className="logo-sub">DeFi Co-Pilot</div>
          </div>
          <div className="hdr-divider" />
          <div className="hdr-stat">
            <span className="hdr-stat-label">Net Worth</span>
            <span className="hdr-stat-val green">${PORTFOLIO.netWorth.toLocaleString()}</span>
          </div>
          <div className="hdr-divider" />
          <div className="hdr-stat">
            <span className="hdr-stat-label">Positions</span>
            <span className="hdr-stat-val">{PORTFOLIO.positions.length}</span>
          </div>
          <div className="hdr-divider" />
          <div className="hdr-stat">
            <span className="hdr-stat-label">Alerts</span>
            <span className="hdr-stat-val" style={{color:'var(--red)'}}>1 Critical</span>
          </div>
          <div className="hdr-right">
            <div className="network-badge">MANTLE</div>
            <div className="wallet-badge">
              <div className="wallet-dot" />
              {PORTFOLIO.wallet}
            </div>
          </div>
        </header>

        {/* MAIN LEFT */}
        <main className="main">

          {/* Health + Stats */}
          <div className="panel">
            <div className="score-grid">
              <div className="health-cell">
                <div className="ring-wrap">
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r={ringR} fill="none" stroke="var(--border2)" strokeWidth="3"/>
                    <circle cx="26" cy="26" r={ringR} fill="none" stroke="var(--amber)" strokeWidth="3"
                      strokeDasharray={`${ringDash} ${ringCirc}`} strokeLinecap="round"
                      style={{transition:'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)'}}/>
                  </svg>
                  <div className="ring-label">
                    <span className="ring-score">{PORTFOLIO.healthScore}</span>
                    <span className="ring-max">/100</span>
                  </div>
                </div>
                <div>
                  <div className="score-label">Health Score</div>
                  <span className="panel-badge badge-amber">AT RISK</span>
                </div>
              </div>
              {[
                { label:"Total Supplied", val:"$22,017", sub:"+4.2% today", color:"green" },
                { label:"Total Borrowed", val:"$2,813",  sub:"WBTC · 82% util",  color:"red" },
                { label:"Blended APY",    val:"7.4%",   sub:"net yield",  color:"green" },
              ].map(s => (
                <div className="score-cell" key={s.label}>
                  <div className="score-label">{s.label}</div>
                  <div className={`score-val ${s.color}`}>{s.val}</div>
                  <div className="score-sub">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Positions Table */}
          <div className="panel">
            <div className="panel-hdr">
              <span className="panel-title">Open Positions</span>
              <span className="panel-badge badge-gray">Mantle Mainnet</span>
            </div>
            <table className="pos-table">
              <thead>
                <tr>
                  <th>Protocol</th>
                  <th>Asset</th>
                  <th>Type</th>
                  <th style={{textAlign:'right'}}>Value</th>
                  <th style={{textAlign:'right'}}>APY</th>
                  <th>Utilization</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {PORTFOLIO.positions.map((p, i) => (
                  <tr key={i}>
                    <td className="protocol-name">{p.protocol}</td>
                    <td><span className="asset-tag">{p.asset}</span></td>
                    <td><span className={`type-tag type-${p.type}`}>{p.type}</span></td>
                    <td style={{textAlign:'right',color:'var(--text0)'}}>${p.value.toLocaleString()}</td>
                    <td style={{textAlign:'right',color: p.apy ? 'var(--teal)' : 'var(--red)'}}>
                      {p.apy ? `${p.apy}%` : `−${Math.abs(p.apy||0)}%`}
                    </td>
                    <td style={{minWidth:80}}>
                      {p.utilization != null ? (
                        <>
                          <span style={{fontSize:10,color:'var(--text2)'}}>{Math.round(p.utilization*100)}%</span>
                          <div className="util-bar">
                            <div className={`util-fill ${p.utilization>0.75?'util-high':p.utilization>0.5?'util-mid':'util-low'}`}
                              style={{width:`${p.utilization*100}%`}}/>
                          </div>
                        </>
                      ) : <span style={{fontSize:10,color:'var(--text2)'}}>—</span>}
                    </td>
                    <td><span className={`panel-badge ${riskBadge(p.risk)}`}>{p.risk}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Alerts */}
          <div className="panel">
            <div className="panel-hdr">
              <span className="panel-title">Active Alerts</span>
              <span className="panel-badge badge-red">1 Critical</span>
            </div>
            <div className="alerts">
              {PORTFOLIO.alerts.map((a, i) => (
                <div className="alert-row" key={i}>
                  <div className={`alert-dot ${a.level==='critical'?'dot-red':a.level==='warn'?'dot-amber':'dot-blue'}`}/>
                  <span className="alert-msg">{a.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Opportunities */}
          <div className="panel">
            <div className="panel-hdr">
              <span className="panel-title">AI-Matched Opportunities</span>
              <span className="panel-badge badge-green">Live</span>
            </div>
            <div className="opp-grid">
              {PORTFOLIO.opportunities.map((o, i) => (
                <div className="opp-card" key={i} onClick={() => sendMessage(`Tell me more about the ${o.name} opportunity on ${o.protocol}`)}>
                  <div className="opp-match">{o.match}% match</div>
                  <div className="opp-name">{o.name}</div>
                  <div className="opp-protocol">{o.protocol} · TVL {o.tvl}</div>
                  <div className="opp-apy">{o.apy}</div>
                  <div className="opp-apy-label">APY · <span className={`${riskBadge(o.risk)}`} style={{fontSize:9,padding:'1px 5px',borderRadius:2}}>{o.risk} risk</span></div>
                </div>
              ))}
            </div>
          </div>

        </main>

        {/* CHAT SIDEBAR */}
        <aside className="chat">
          <div className="chat-hdr">
            <div className="sage-avatar">S</div>
            <div>
              <div className="sage-name">SAGE AI</div>
              <div className="sage-status"><span className="status-dot"/>Portfolio loaded</div>
            </div>
          </div>

          <div className="chat-msgs">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className={`msg-avatar ${m.role === 'ai' ? 'ai-av' : 'user-av'}`}>
                  {m.role === 'ai' ? 'S' : 'U'}
                </div>
                <div className="msg-bubble">
                  {parseSimpleMarkdown(m.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="msg ai">
                <div className="msg-avatar ai-av">S</div>
                <div className="msg-bubble">
                  <div className="typing">
                    <span/><span/><span/>
                  </div>
                </div>
              </div>
            )}
            <div ref={msgsEndRef}/>
          </div>

          <div className="quick-btns">
            {QUICK_PROMPTS.map((q, i) => (
              <button key={i} className="quick-btn" onClick={() => sendMessage(q)}>{q}</button>
            ))}
          </div>

          <div className="chat-input-wrap">
            <div className="chat-input-row">
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                placeholder="Ask about your portfolio..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button className="send-btn" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
                <svg className="send-icon" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </aside>

      </div>
    </>
  );
}
