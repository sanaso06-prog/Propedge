import React, { useState } from ‘react’;
import { PLAYERS } from ‘./players’;
import { OPPONENTS, MATCHUPS, defLabel, posDefKey } from ‘./opponents’;
import { runAnalysis } from ‘./analysis’;
import BetTracker from ‘./BetTracker’;

const PROP_TYPES = [“Points”,“Rebounds”,“Assists”,“3-Pointers Made”,“Steals”,“Blocks”,“PRA (Pts+Reb+Ast)”];
const POS_COLORS = { PG:”#4444ff”, SG:”#00c896”, SF:”#ffd700”, PF:”#ff8844”, C:”#ff4444” };
const API_KEY = process.env.REACT_APP_ANTHROPIC_KEY;

function findPlayer(q) {
const s = q.toLowerCase().trim();
if (PLAYERS[s]) return PLAYERS[s];
for (const k of Object.keys(PLAYERS)) {
if (k.includes(s) || s.includes((k.split(” “)[1]) || “”)) return PLAYERS[k];
}
return null;
}

async function fetchLiveStats(playerName, propType) {
if (!API_KEY) return null;
try {
const res = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: {
“Content-Type”: “application/json”,
“anthropic-version”: “2023-06-01”,
“x-api-key”: API_KEY,
},
body: JSON.stringify({
model: “claude-opus-4-6”,
max_tokens: 1000,
tools: [{ type: “web_search_20250305”, name: “web_search” }],
messages: [{
role: “user”,
content: `Search for ${playerName} NBA 2025-26 season stats. Find: current season ${propType} average, last 5 games ${propType} stats, last 10 games ${propType} average, injury report today, and tonight's opponent. Return ONLY a JSON object like this with real numbers you found: {"seasonAvg":25.5,"last5Avg":28.1,"last10Avg":27.4,"last5Games":[31,28,25,29,27],"injuryStatus":"Healthy","injurySeverity":0,"opponent":"Toronto Raptors","opponentTeam":"TOR","isBackToBack":false,"daysRest":2}`
}]
})
});
if (!res.ok) return null;
const data = await res.json();
const text = data.content?.map(b => b.type === “text” ? b.text : “”).join(””) || “”;
const match = text.match(/{[\s\S]*}/);
if (!match) return null;
return JSON.parse(match[0]);
} catch (e) {
return null;
}
}

function Gauge({ value, min, max, label, color }) {
const pct = Math.min(Math.max((value - min) / (max - min), 0), 1);
const angle = -140 + pct * 280, r = 46, cx = 60, cy = 60;
const rad = d => d * Math.PI / 180;
const ax = cx + r * Math.cos(rad(angle - 90)), ay = cy + r * Math.sin(rad(angle - 90));
const sx = cx + r * Math.cos(rad(-140 - 90)), sy = cy + r * Math.sin(rad(-140 - 90));
return (
<div style={{ textAlign: “center” }}>
<svg width="120" height="78" viewBox="0 0 120 80">
<path d={`M ${sx} ${sy} A ${r} ${r} 0 1 1 ${cx + r * Math.cos(rad(140 - 90))} ${cy + r * Math.sin(rad(140 - 90))}`} fill=“none” stroke=”#0d0d1a” strokeWidth=“8” strokeLinecap=“round” />
{pct > 0 && <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${ax} ${ay}`} fill=“none” stroke={color} strokeWidth=“8” strokeLinecap=“round” />}
<text x={cx} y={cy + 7} textAnchor=“middle” fill=”#fff” fontSize=“14” fontWeight=“900” fontFamily=“Georgia,serif”>{value}</text>
<text x={cx} y={cy + 20} textAnchor=“middle” fill=”#555” fontSize=“6” fontFamily=“monospace”>{label}</text>
</svg>
</div>
);
}

function FactorRow({ name, importance, tonight, impact }) {
const ic = impact > 0 ? “#00c896” : impact < 0 ? “#ff4444” : “#555”;
return (
<div style={{ padding: “0.35rem 0”, borderBottom: “1px solid #08080f” }}>
<div style={{ display: “flex”, justifyContent: “space-between”, marginBottom: “0.15rem” }}>
<div style={{ fontSize: “0.67rem”, color: “#bbb”, fontFamily: “Georgia,serif”, flex: 1, paddingRight: “0.5rem” }}>{name}</div>
<div style={{ display: “flex”, gap: “0.5rem”, alignItems: “center”, flexShrink: 0 }}>
<div style={{ fontSize: “0.54rem”, color: “#1e1e36”, fontFamily: “monospace” }}>{importance}/1k</div>
<div style={{ fontSize: “0.63rem”, color: ic, fontFamily: “monospace”, fontWeight: 700, minWidth: “32px”, textAlign: “right” }}>{impact > 0 ? `+${impact}` : impact}</div>
</div>
</div>
<div style={{ display: “flex”, gap: “2px” }}>
<div style={{ flex: 1, height: “2px”, background: “#0d0d1a”, borderRadius: “1px” }}><div style={{ width: `${(importance / 1000) * 100}%`, height: “100%”, background: “#4444ff”, borderRadius: “1px” }} /></div>
<div style={{ flex: 1, height: “2px”, background: “#0d0d1a”, borderRadius: “1px” }}><div style={{ width: `${(tonight / 1000) * 100}%`, height: “100%”, background: “#00c896”, borderRadius: “1px” }} /></div>
<div style={{ width: “28px”, height: “2px”, background: “#0d0d1a”, borderRadius: “1px” }}><div style={{ width: `${Math.min(Math.abs(impact) / 12, 1) * 100}%`, height: “100%”, background: ic, borderRadius: “1px” }} /></div>
</div>
</div>
);
}

function MatchupCard({ r }) {
if (!r.opp) return (
<div className=“section” style={{ borderColor: “#ff444422”, background: “rgba(255,68,68,0.03)” }}>
<div style={{ fontSize: “0.6rem”, color: “#ff4444”, fontFamily: “monospace”, textTransform: “uppercase”, marginBottom: “0.4rem” }}>Matchup</div>
<div style={{ fontSize: “0.8rem”, color: “#888” }}>No game scheduled tonight for {r.shortTeam}.</div>
</div>
);
const dc = r.posDef <= 107 ? “#00c896” : r.posDef <= 110 ? “#88ff88” : r.posDef <= 113 ? “#ffd700” : r.posDef <= 116 ? “#ff8844” : “#ff4444”;
const diffPct = Math.round(((r.posDef - 107) / (120 - 107)) * 100);
const matchupImpact = +(((113 - r.posDef) / 113) * r.seasonAvg * 0.24).toFixed(1);
return (
<div className=“section” style={{ borderColor: `${dc}33`, background: `${dc}05` }}>
<div style={{ fontSize: “0.6rem”, color: dc, fontFamily: “monospace”, textTransform: “uppercase”, letterSpacing: “0.15em”, marginBottom: “0.75rem” }}>
Tonight: {r.shortTeam} vs {r.oppTeam}
{r.liveData && <span style={{ marginLeft: “0.5rem”, color: “#00c896”, fontSize: “0.52rem” }}>● LIVE DATA</span>}
</div>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “flex-start”, marginBottom: “0.75rem”, gap: “0.5rem” }}>
<div>
<div style={{ fontFamily: “‘Bebas Neue’,sans-serif”, fontSize: “1.5rem”, color: “#fff”, letterSpacing: “1px”, lineHeight: 1 }}>{r.opp.name}</div>
<div style={{ fontFamily: “monospace”, fontSize: “0.58rem”, color: “#555”, marginTop: “0.15rem” }}>Facing {r.pos}s tonight</div>
</div>
<div style={{ textAlign: “right”, flexShrink: 0 }}>
<div style={{ fontFamily: “‘Bebas Neue’,sans-serif”, fontSize: “1.3rem”, color: dc, letterSpacing: “1px” }}>{r.defLbl.toUpperCase()}</div>
<div style={{ fontFamily: “monospace”, fontSize: “0.55rem”, color: dc, opacity: 0.7 }}>{r.posDef} Def Rtg vs {r.pos}</div>
<div style={{ fontFamily: “monospace”, fontSize: “0.6rem”, color: matchupImpact > 0 ? “#00c896” : “#ff4444”, fontWeight: 700, marginTop: “0.1rem” }}>
{matchupImpact > 0 ? `+${matchupImpact}` : matchupImpact} pts impact
</div>
</div>
</div>
<div style={{ marginBottom: “0.75rem” }}>
<div style={{ display: “flex”, justifyContent: “space-between”, fontSize: “0.54rem”, color: “#444”, fontFamily: “monospace”, marginBottom: “0.2rem” }}>
<span style={{ color: “#00c896” }}>EASY FOR SCORER</span><span style={{ color: “#ff4444” }}>HARD FOR SCORER</span>
</div>
<div style={{ height: “8px”, background: “linear-gradient(90deg,#00c896,#ffd700,#ff4444)”, borderRadius: “4px”, position: “relative” }}>
<div style={{ position: “absolute”, top: “-3px”, width: “14px”, height: “14px”, borderRadius: “50%”, background: “#fff”, border: `3px solid ${dc}`, left: `calc(${Math.min(diffPct, 95)}% - 7px)` }} />
</div>
</div>
<div style={{ display: “grid”, gridTemplateColumns: “repeat(3,1fr)”, gap: “0.4rem”, marginBottom: “0.65rem” }}>
{[
{ label: `${r.pos} Def Rtg`, val: r.posDef, color: dc },
{ label: “PPG Allowed”, val: r.opp.ptsAllowed, color: “#aaa” },
{ label: “Opp Pace”, val: r.opp.pace, color: r.opp.pace > 100 ? “#ff8844” : “#88aaff” },
{ label: “3PT Def %”, val: r.opp.threeDef + “%”, color: r.opp.threeDef < 34 ? “#ff4444” : r.opp.threeDef > 36 ? “#00c896” : “#ffd700” },
{ label: “Foul Rate”, val: r.opp.foulRate, color: r.opp.foulRate > 22 ? “#00c896” : “#888” },
{ label: “Rim FG%”, val: r.opp.rimFG + “%”, color: r.opp.rimFG > 61 ? “#ff4444” : “#888” },
].map(({ label, val, color }) => (
<div key={label} style={{ background: “rgba(0,0,0,0.3)”, borderRadius: “6px”, padding: “0.38rem 0.4rem”, textAlign: “center” }}>
<div style={{ fontSize: “0.5rem”, color: “#333”, fontFamily: “monospace”, textTransform: “uppercase”, marginBottom: “0.1rem” }}>{label}</div>
<div style={{ fontSize: “0.88rem”, fontFamily: “‘Bebas Neue’,sans-serif”, color, letterSpacing: “0.5px” }}>{val}</div>
</div>
))}
</div>
<div style={{ padding: “0.55rem 0.7rem”, background: “rgba(0,0,0,0.25)”, borderRadius: “7px”, borderLeft: `3px solid ${dc}` }}>
<div style={{ fontSize: “0.74rem”, color: “#ccc”, lineHeight: 1.65, fontFamily: “Georgia,serif” }}>
{r.opp.name} rank as a <strong style={{ color: dc }}>{r.defLbl}</strong> defense against {r.pos}s ({r.posDef} Def Rtg).
{” “}{r.opp.pace > 100 ? “Fast pace creates extra possessions” : “Slower pace limits total volume”} ({r.opp.pace}).
{” “}They allow {r.opp.threeDef}% from three.
{” “}{r.opp.foulRate > 22 ? “High foul rate = extra FT opportunities.” : “Low foul rate = limited FT chances.”}
{” “}Net matchup impact: <strong style={{ color: matchupImpact > 0 ? “#00c896” : “#ff4444” }}>{matchupImpact > 0 ? “+” : “”}{matchupImpact} pts</strong> vs league avg.
</div>
</div>
</div>
);
}

function ProbSection({ r }) {
const overP = Math.max(1, Math.min(99, r.overProb));
const underP = 100 - overP;
const minOver = (1 / (overP / 100)).toFixed(2);
const minUnder = (1 / (underP / 100)).toFixed(2);
const rc = r.rec === “OVER” ? “#00c896” : r.rec === “UNDER” ? “#ff4444” : “#ffd700”;
const verdict = r.rec === “OVER”
? `At ${r.propLine}, this line is set ${Math.abs(r.prediction - r.propLine).toFixed(1)} pts below our projection of ${r.prediction}. Recent form (${r.last5Avg} last 5) and ${r.defLbl.toLowerCase()} matchup defense support the OVER. Value exists above ${minOver}x.`
: r.rec === “UNDER”
? `At ${r.propLine}, our model projects ${r.prediction} — ${Math.abs(r.prediction - r.propLine).toFixed(1)} pts below the line. ${r.injStatus !== "Healthy" ? "Injury concerns compound the downside." : "Tough matchup and regression in form point UNDER."} Only bet if odds exceed ${minUnder}x.`
: `Our projection (${r.prediction}) lands within 1.8 pts of the line — too close to call confidently. PASS and look for better lines.`;
return (
<div className=“section” style={{ borderColor: “#ffd70022”, background: “rgba(255,215,0,0.025)” }}>
<div style={{ fontSize: “0.6rem”, color: “#ffd700”, letterSpacing: “0.2em”, fontFamily: “monospace”, textTransform: “uppercase”, marginBottom: “0.85rem” }}>Probability & Minimum Odds</div>
<div style={{ marginBottom: “0.8rem” }}>
<div style={{ display: “flex”, height: “26px”, borderRadius: “7px”, overflow: “hidden”, marginBottom: “0.28rem” }}>
<div style={{ width: `${overP}%`, background: “linear-gradient(90deg,#007755,#00c896)”, display: “flex”, alignItems: “center”, justifyContent: “center”, fontSize: “0.62rem”, fontFamily: “monospace”, fontWeight: 700, color: “#000” }}>{overP >= 15 ? `OVER ${overP}%` : “”}</div>
<div style={{ width: `${underP}%`, background: “linear-gradient(90deg,#cc2222,#ff4444)”, display: “flex”, alignItems: “center”, justifyContent: “center”, fontSize: “0.62rem”, fontFamily: “monospace”, fontWeight: 700, color: “#fff” }}>{underP >= 15 ? `UNDER ${underP}%` : “”}</div>
</div>
<div style={{ display: “flex”, justifyContent: “space-between”, fontSize: “0.55rem”, color: “#444”, fontFamily: “monospace” }}>
<span style={{ color: “#00c896” }}>Over: {overP}%</span><span style={{ color: “#ff4444” }}>Under: {underP}%</span>
</div>
</div>
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr”, gap: “0.5rem”, marginBottom: “0.65rem” }}>
{[{ label: “Min Odds OVER”, odds: minOver, prob: overP, color: “#00c896” }, { label: “Min Odds UNDER”, odds: minUnder, prob: underP, color: “#ff4444” }].map(({ label, odds, prob, color }) => (
<div key={label} style={{ background: `${color}0a`, border: `1px solid ${color}22`, borderRadius: “8px”, padding: “0.7rem”, textAlign: “center” }}>
<div style={{ fontSize: “0.54rem”, color: “#555”, fontFamily: “monospace”, textTransform: “uppercase”, marginBottom: “0.2rem” }}>{label}</div>
<div style={{ fontSize: “1.55rem”, fontFamily: “‘Bebas Neue’,sans-serif”, color, letterSpacing: “1px”, lineHeight: 1 }}>{odds}x</div>
<div style={{ fontSize: “0.53rem”, color: “#333”, fontFamily: “monospace”, marginTop: “0.12rem” }}>break-even @ {prob}%</div>
</div>
))}
</div>
<div style={{ background: `${rc}0c`, border: `1px solid ${rc}2a`, borderRadius: “8px”, padding: “0.75rem” }}>
<div style={{ fontSize: “0.54rem”, color: rc, fontFamily: “monospace”, textTransform: “uppercase”, marginBottom: “0.3rem” }}>Sharp Verdict · {r.rec}</div>
<div style={{ fontSize: “0.8rem”, color: “#ccc”, lineHeight: 1.68 }}>{verdict}</div>
</div>
</div>
);
}

function PropAnalyzer() {
const [player, setPlayer] = useState(””);
const [propType, setPropType] = useState(“Points”);
const [propLine, setPropLine] = useState(””);
const [result, setResult] = useState(null);
const [error, setError] = useState(””);
const [loading, setLoading] = useState(false);
const [loadingStep, setLoadingStep] = useState(””);
const [expandedCat, setExpandedCat] = useState(null);
const [suggestions, setSuggestions] = useState([]);
const [focused, setFocused] = useState(false);

const getSuggestions = (val) => {
if (!val) return Object.values(PLAYERS).map(p => p.name);
const q = val.toLowerCase();
return Object.values(PLAYERS).filter(p =>
p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q) ||
p.fullTeam.toLowerCase().includes(q) || p.pos.toLowerCase() === q
).map(p => p.name);
};

const analyze = async () => {
if (!player.trim() || !propLine.trim()) { setError(“Please fill in both fields.”); return; }
const found = findPlayer(player);
if (!found) { setError(“Player not found. Click search to browse all players.”); return; }
setError(””); setExpandedCat(null); setLoading(true); setResult(null);

```
let liveData = null;
if (API_KEY) {
  setLoadingStep("🔍 Fetching live stats & injury report...");
  liveData = await fetchLiveStats(found.name, propType);
}

setLoadingStep("⚙️ Running 82-factor analysis...");

// Merge live data into player object if available
const playerData = { ...found };
if (liveData) {
  if (liveData.seasonAvg) playerData[propType === "Points" ? "pts" : propType === "Rebounds" ? "reb" : propType === "Assists" ? "ast" : "pts"] = liveData.seasonAvg;
  if (liveData.last5Avg) playerData.last5 = liveData.last5Avg;
  if (liveData.last10Avg) playerData.last10 = liveData.last10Avg;
  if (liveData.injuryStatus) playerData.injStatus = liveData.injuryStatus;
  if (liveData.injurySeverity !== undefined) playerData.injSev = liveData.injurySeverity;
  if (liveData.isBackToBack !== undefined) playerData.b2b = liveData.isBackToBack;
  if (liveData.daysRest !== undefined) playerData.daysRest = liveData.daysRest;
}

const analysis = runAnalysis(playerData, propType, parseFloat(propLine));
analysis.liveData = !!liveData;
if (liveData?.last5Games) analysis.last5Games = liveData.last5Games;

setResult(analysis);
setLoading(false);
setLoadingStep("");
```

};

const rc = result?.rec === “OVER” ? “#00c896” : result?.rec === “UNDER” ? “#ff4444” : “#ffd700”;

return (
<div>
<div className="section">
<div style={{ marginBottom: “0.8rem”, position: “relative” }}>
<label style={{ display: “block”, fontSize: “0.6rem”, color: “#444”, letterSpacing: “0.2em”, textTransform: “uppercase”, fontFamily: “monospace”, marginBottom: “0.4rem” }}>Player Name</label>
<div style={{ position: “relative” }}>
<span style={{ position: “absolute”, left: “0.85rem”, top: “50%”, transform: “translateY(-50%)”, color: “#2a2a4a”, fontSize: “0.9rem”, pointerEvents: “none” }}>🔍</span>
<input value={player}
onChange={e => { setPlayer(e.target.value); setSuggestions(getSuggestions(e.target.value)); }}
onFocus={() => { setFocused(true); setSuggestions(getSuggestions(player)); }}
onBlur={() => setTimeout(() => { setFocused(false); setSuggestions([]); }, 180)}
onKeyDown={e => { if (e.key === “Enter”) { setSuggestions([]); analyze(); } }}
placeholder=“Search any player…”
style={{ width: “100%”, padding: “0.78rem 2.2rem 0.78rem 2.3rem”, background: “#0a0a18”, border: `1px solid ${focused ? "#4444ff" : "#1a1a2e"}`, borderRadius: suggestions.length > 0 ? “8px 8px 0 0” : “8px”, color: “#fff”, fontSize: “0.93rem”, fontFamily: “Georgia,serif”, boxSizing: “border-box” }} />
{player && <button onClick={() => { setPlayer(””); setSuggestions(getSuggestions(””)); }} style={{ position: “absolute”, right: “0.7rem”, top: “50%”, transform: “translateY(-50%)”, background: “none”, border: “none”, color: “#333”, cursor: “pointer”, fontSize: “1rem” }}>✕</button>}
</div>
{suggestions.length > 0 && (
<div style={{ position: “absolute”, left: 0, right: 0, background: “#0b0b1a”, border: “1px solid #1a1a2e”, borderTop: “none”, borderRadius: “0 0 10px 10px”, zIndex: 50, boxShadow: “0 12px 40px rgba(0,0,0,0.7)”, maxHeight: “300px”, overflowY: “auto” }}>
<div style={{ padding: “0.32rem 0.88rem”, fontSize: “0.53rem”, color: “#2a2a4a”, fontFamily: “monospace”, textTransform: “uppercase”, borderBottom: “1px solid #0d0d1a” }}>
{player ? `${suggestions.length} result${suggestions.length !== 1 ? "s" : ""}` : “All Players”}
</div>
{suggestions.map(name => {
const p = Object.values(PLAYERS).find(pl => pl.name === name);
if (!p) return null;
const oppT = MATCHUPS[p.team];
const opp = oppT ? OPPONENTS[oppT] : null;
const pd = opp ? opp[posDefKey(p.pos)] : null;
const dc = pd ? pd <= 107 ? “#00c896” : pd <= 110 ? “#88ff88” : pd <= 113 ? “#ffd700” : pd <= 116 ? “#ff8844” : “#ff4444” : “#555”;
const trend = p.last5 > p.pts ? “↑” : p.last5 < p.pts ? “↓” : “→”;
const tc = p.last5 > p.pts ? “#00c896” : p.last5 < p.pts ? “#ff4444” : “#888”;
const posC = POS_COLORS[p.pos] || “#888”;
return (
<div key={name} onMouseDown={() => { setPlayer(name); setSuggestions([]); }}
style={{ padding: “0.52rem 0.88rem”, cursor: “pointer”, borderBottom: “1px solid #0a0a14”, display: “flex”, alignItems: “center”, justifyContent: “space-between” }}
onMouseEnter={e => e.currentTarget.style.background = “#12121e”}
onMouseLeave={e => e.currentTarget.style.background = “transparent”}>
<div style={{ display: “flex”, alignItems: “center”, gap: “0.6rem” }}>
<div style={{ width: “30px”, height: “30px”, borderRadius: “50%”, background: `${posC}15`, border: `1px solid ${posC}44`, display: “flex”, alignItems: “center”, justifyContent: “center”, fontSize: “0.58rem”, color: posC, fontFamily: “monospace”, fontWeight: 700, flexShrink: 0 }}>{p.pos}</div>
<div>
<div style={{ fontSize: “0.82rem”, color: “#e8e8f0”, fontFamily: “Georgia,serif” }}>{p.name}</div>
<div style={{ fontSize: “0.56rem”, color: “#3a3a5a”, fontFamily: “monospace” }}>{p.fullTeam}</div>
</div>
</div>
<div style={{ display: “flex”, alignItems: “center”, gap: “0.65rem”, flexShrink: 0 }}>
<div style={{ textAlign: “right” }}>
<div style={{ fontSize: “0.76rem”, fontFamily: “‘Bebas Neue’,sans-serif”, color: “#00c896” }}>{p.pts} <span style={{ fontSize: “0.5rem”, color: “#444” }}>PPG</span></div>
<div style={{ fontSize: “0.54rem”, fontFamily: “monospace”, color: “#333” }}>L5:<span style={{ color: tc }}>{p.last5}{trend}</span></div>
</div>
{opp && pd && <div style={{ fontSize: “0.55rem”, color: dc, fontFamily: “monospace”, textAlign: “center” }}><div style={{ fontSize: “0.65rem”, fontWeight: 700 }}>{defLabel(pd)}</div><div style={{ color: “#333” }}>{opp.name.split(” “).slice(-1)[0]}</div></div>}
{p.injStatus !== “Healthy” && <div style={{ background: “rgba(255,68,68,0.12)”, border: “1px solid #ff444430”, borderRadius: “4px”, padding: “0.1rem 0.32rem”, fontSize: “0.49rem”, color: “#ff6666”, fontFamily: “monospace” }}>{p.injStatus}</div>}
</div>
</div>
);
})}
</div>
)}
</div>
<div style={{ display: “flex”, gap: “0.8rem” }}>
<div style={{ flex: 2 }}>
<label style={{ display: “block”, fontSize: “0.6rem”, color: “#444”, letterSpacing: “0.2em”, textTransform: “uppercase”, fontFamily: “monospace”, marginBottom: “0.4rem” }}>Prop Type</label>
<select value={propType} onChange={e => setPropType(e.target.value)} style={{ width: “100%”, padding: “0.75rem 1rem”, background: “#0a0a18”, border: “1px solid #1a1a2e”, borderRadius: “8px”, color: “#fff”, fontSize: “0.87rem”, fontFamily: “Georgia,serif” }}>
{PROP_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
</select>
</div>
<div style={{ flex: 1 }}>
<label style={{ display: “block”, fontSize: “0.6rem”, color: “#444”, letterSpacing: “0.2em”, textTransform: “uppercase”, fontFamily: “monospace”, marginBottom: “0.4rem” }}>Vegas Line</label>
<input value={propLine} onChange={e => setPropLine(e.target.value)} onKeyDown={e => e.key === “Enter” && analyze()}
placeholder=“27.5” type=“number” step=“0.5”
style={{ width: “100%”, padding: “0.75rem 1rem”, background: “#0a0a18”, border: “1px solid #1a1a2e”, borderRadius: “8px”, color: “#fff”, fontSize: “1rem”, fontFamily: “Georgia,serif” }} />
</div>
</div>
{error && <div style={{ color: “#ff5555”, fontSize: “0.72rem”, fontFamily: “monospace”, marginTop: “0.6rem”, background: “rgba(255,50,50,0.06)”, padding: “0.5rem 0.7rem”, borderRadius: “6px”, border: “1px solid #ff444422” }}>⚠ {error}</div>}
<button onClick={analyze} disabled={loading} style={{ width: “100%”, marginTop: “1rem”, padding: “0.9rem”, background: loading ? “#0a0a18” : “linear-gradient(135deg,#1818cc,#4444ff)”, color: loading ? “#333” : “#fff”, border: loading ? “1px solid #1a1a2e” : “none”, borderRadius: “9px”, fontSize: “0.8rem”, fontFamily: “monospace”, letterSpacing: “0.25em”, textTransform: “uppercase”, cursor: loading ? “not-allowed” : “pointer”, boxShadow: loading ? “none” : “0 4px 28px #4444ff33” }}>
{loading ? “⚡ Analyzing…” : “⚡ Analyze Prop”}
</button>
{loading && (
<div style={{ textAlign: “center”, marginTop: “0.8rem”, fontSize: “0.7rem”, color: “#4444ff”, fontFamily: “monospace”, letterSpacing: “0.05em” }}>
{loadingStep}
</div>
)}
{API_KEY && <div style={{ marginTop: “0.5rem”, fontSize: “0.56rem”, color: “#1e3a1e”, fontFamily: “monospace”, textAlign: “center” }}>● Live data enabled via Opus 4.6</div>}
</div>

```
  {result && !loading && (
    <div className="fade-up">
      <div className="section" style={{ background: "rgba(68,68,255,0.04)", borderColor: "#4444ff1a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "2rem", letterSpacing: "2px", lineHeight: 1 }}>{result.playerName}</div>
              <div style={{ background: `${POS_COLORS[result.pos] || "#888"}18`, border: `1px solid ${POS_COLORS[result.pos] || "#888"}44`, borderRadius: "4px", padding: "0.1rem 0.38rem", fontSize: "0.57rem", color: POS_COLORS[result.pos] || "#888", fontFamily: "monospace" }}>{result.pos}</div>
              {result.injStatus !== "Healthy" && <div style={{ background: "rgba(255,68,68,0.12)", border: "1px solid #ff444430", borderRadius: "4px", padding: "0.1rem 0.35rem", fontSize: "0.52rem", color: "#ff6666", fontFamily: "monospace" }}>{result.injStatus}</div>}
              {result.liveData && <div style={{ background: "rgba(0,200,150,0.12)", border: "1px solid #00c89630", borderRadius: "4px", padding: "0.1rem 0.35rem", fontSize: "0.52rem", color: "#00c896", fontFamily: "monospace" }}>● LIVE</div>}
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "0.62rem", color: "#555", marginTop: "0.25rem" }}>{result.team}</div>
            <div style={{ fontFamily: "monospace", fontSize: "0.55rem", color: "#2a2a4a", marginTop: "0.1rem" }}>{result.totalFactors} factors · all mathematically weighted</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.8rem", color: rc, textShadow: `0 0 24px ${rc}44` }}>{result.rec}</div>
            <div style={{ fontFamily: "monospace", fontSize: "0.55rem", color: "#444" }}>Confidence</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.1rem", color: rc }}>{result.conf}%</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div style={{ fontSize: "0.57rem", color: "#444", letterSpacing: "0.2em", fontFamily: "monospace", textTransform: "uppercase", marginBottom: "0.6rem" }}>Statistical Context {result.liveData && <span style={{ color: "#00c896" }}>· Live</span>}</div>
        <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap" }}>
          <Gauge value={result.seasonAvg} min={0} max={50} label="Season Avg" color="#4444ff" />
          <Gauge value={result.last10Avg} min={0} max={50} label="Last 10" color="#8888ff" />
          <Gauge value={result.last5Avg} min={0} max={50} label="Last 5" color="#00c896" />
          <Gauge value={result.prediction} min={0} max={50} label="Prediction" color={rc} />
        </div>
        {result.last5Games && (
          <div style={{ marginTop: "0.7rem", paddingTop: "0.7rem", borderTop: "1px solid #0d0d1a" }}>
            <div style={{ fontSize: "0.54rem", color: "#444", fontFamily: "monospace", textTransform: "uppercase", marginBottom: "0.4rem" }}>Last 5 Games</div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {result.last5Games.map((pts, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center", background: pts > parseFloat(propLine) ? "rgba(0,200,150,0.1)" : "rgba(255,68,68,0.1)", borderRadius: "6px", padding: "0.4rem 0.2rem", border: `1px solid ${pts > parseFloat(propLine) ? "#00c89633" : "#ff444433"}` }}>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1rem", color: pts > parseFloat(propLine) ? "#00c896" : "#ff4444" }}>{pts}</div>
                  <div style={{ fontSize: "0.48rem", color: "#444", fontFamily: "monospace" }}>G{5-i}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: "0.7rem", paddingTop: "0.7rem", borderTop: "1px solid #0d0d1a" }}>
          {[{ label: "Prop Line", val: result.propLine, color: "#ffd700" }, { label: "Prediction", val: result.prediction, color: rc }, { label: "Edge", val: `${result.prediction > result.propLine ? "+" : ""}${(result.prediction - result.propLine).toFixed(1)}`, color: result.prediction > result.propLine ? "#00c896" : "#ff4444" }, { label: "Career Avg", val: result.careerAvg, color: "#888" }].map(({ label, val, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.51rem", color: "#444", fontFamily: "monospace", textTransform: "uppercase" }}>{label}</div>
              <div style={{ fontSize: "1.1rem", fontFamily: "'Bebas Neue',sans-serif", color }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      <MatchupCard r={result} />
      <ProbSection r={result} />

      <div className="section">
        <div style={{ fontSize: "0.57rem", color: "#444", letterSpacing: "0.2em", fontFamily: "monospace", textTransform: "uppercase", marginBottom: "0.75rem" }}>Outcome Range</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ textAlign: "center", minWidth: "40px" }}>
            <div style={{ fontSize: "0.5rem", color: "#444", fontFamily: "monospace" }}>FLOOR</div>
            <div style={{ fontSize: "1.1rem", fontFamily: "'Bebas Neue',sans-serif", color: "#ff4444" }}>{result.floor}</div>
          </div>
          <div style={{ flex: 1, position: "relative", height: "10px" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#ff4444,#ffd700,#00c896)", borderRadius: "5px", opacity: 0.2 }} />
            <div style={{ position: "absolute", top: "-5px", bottom: "-5px", width: "3px", background: "#ffd700", borderRadius: "2px", boxShadow: "0 0 8px #ffd70099", left: `${Math.min(100, Math.max(0, ((result.propLine - result.floor) / Math.max(result.ceiling - result.floor, 1)) * 100))}%` }} />
            <div style={{ position: "absolute", top: "-6px", bottom: "-6px", width: "3px", background: rc, borderRadius: "2px", boxShadow: `0 0 10px ${rc}99`, left: `${Math.min(100, Math.max(0, ((result.prediction - result.floor) / Math.max(result.ceiling - result.floor, 1)) * 100))}%` }} />
          </div>
          <div style={{ textAlign: "center", minWidth: "40px" }}>
            <div style={{ fontSize: "0.5rem", color: "#444", fontFamily: "monospace" }}>CEILING</div>
            <div style={{ fontSize: "1.1rem", fontFamily: "'Bebas Neue',sans-serif", color: "#00c896" }}>{result.ceiling}</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.72rem" }}>
          <div style={{ fontSize: "0.57rem", color: "#444", letterSpacing: "0.15em", fontFamily: "monospace", textTransform: "uppercase" }}>{result.totalFactors}-Factor Analysis · Click to Expand</div>
          <div style={{ display: "flex", gap: "0.65rem", fontSize: "0.52rem", color: "#333", fontFamily: "monospace" }}>
            <span style={{ color: "#4444ff" }}>■ Wt</span><span style={{ color: "#00c896" }}>■ Tnt</span><span style={{ color: "#888" }}>■ Imp</span>
          </div>
        </div>
        {result.categories?.map((cat, ci) => {
          const isOpen = expandedCat === ci;
          const catImpact = cat.factors.reduce((s, f) => s + (f.impact || 0), 0);
          const cc = catImpact > 0 ? "#00c896" : catImpact < 0 ? "#ff4444" : "#555";
          const isMatchup = cat.name.includes("Matchup");
          return (
            <div key={ci} style={{ marginBottom: "0.28rem", border: `1px solid ${isMatchup ? "#ff444422" : "#0d0d1a"}`, borderRadius: "8px", overflow: "hidden" }}>
              <div style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.52rem 0.72rem", background: "rgba(255,255,255,0.02)" }}
                onClick={() => setExpandedCat(isOpen ? null : ci)}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.65rem", color: isMatchup ? "#ff8844" : "#999" }}>{cat.name}</span>
                  <span style={{ fontFamily: "monospace", fontSize: "0.52rem", color: "#2a2a4a" }}>{cat.factors.length}f</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.62rem", color: cc, fontWeight: 700 }}>{catImpact > 0 ? `+${catImpact.toFixed(1)}` : catImpact.toFixed(1)}</span>
                  <span style={{ color: "#2a2a4a", fontSize: "0.57rem" }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>
              {isOpen && <div style={{ padding: "0 0.72rem", background: "rgba(0,0,0,0.2)" }}>{cat.factors.map((f, fi) => <FactorRow key={fi} {...f} />)}</div>}
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center", fontSize: "0.5rem", color: "#1a1a2e", fontFamily: "monospace", padding: "0.5rem", lineHeight: 1.8 }}>
        FOR ENTERTAINMENT PURPOSES ONLY · NOT FINANCIAL ADVICE · PLEASE GAMBLE RESPONSIBLY
      </div>
    </div>
  )}
</div>
```

);
}

export default function App() {
const [tab, setTab] = useState(‘analyze’);
return (
<div style={{ minHeight: “100vh”, background: “#060610”, color: “#e0e0f0”, fontFamily: “Georgia,serif”, backgroundImage: “radial-gradient(ellipse at 15% 40%,#08082a 0%,transparent 55%),radial-gradient(ellipse at 85% 10%,#0a1a08 0%,transparent 55%)” }}>
<style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Serif+Display:ital@0;1&display=swap'); * { box-sizing: border-box; } input, select { transition: border-color 0.2s; } input:focus, select:focus { outline: none; border-color: #4444ff !important; } @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} } .fade-up { animation: fadeUp 0.5s ease forwards; } .section { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.055); border-radius: 14px; padding: 1.2rem; margin-bottom: 0.9rem; }`}</style>
<div style={{ background: “rgba(0,0,0,0.4)”, borderBottom: “1px solid rgba(255,255,255,0.06)”, padding: “0.8rem 1rem”, position: “sticky”, top: 0, zIndex: 100, backdropFilter: “blur(12px)” }}>
<div style={{ maxWidth: “660px”, margin: “0 auto”, display: “flex”, justifyContent: “space-between”, alignItems: “center” }}>
<div style={{ fontFamily: “‘Bebas Neue’,sans-serif”, fontSize: “1.6rem”, letterSpacing: “4px”, color: “#fff” }}>PROP EDGE</div>
<div style={{ display: “flex”, gap: “0.4rem” }}>
{[{ id:‘analyze’, label:‘⚡ Analyze’ }, { id:‘tracker’, label:‘📋 My Bets’ }].map(t => (
<button key={t.id} onClick={() => setTab(t.id)} style={{
padding: “0.45rem 0.9rem”, border: “none”, borderRadius: “7px”, cursor: “pointer”,
fontFamily: “monospace”, fontSize: “0.72rem”, letterSpacing: “0.05em”,
background: tab === t.id ? “linear-gradient(135deg,#1818cc,#4444ff)” : “rgba(255,255,255,0.05)”,
color: tab === t.id ? “#fff” : “#555”,
}}>{t.label}</button>
))}
</div>
</div>
</div>
<div style={{ maxWidth: “660px”, margin: “0 auto”, padding: “1.2rem 1rem” }}>
{tab === ‘analyze’ && <PropAnalyzer />}
{tab === ‘tracker’ && <BetTracker />}
</div>
</div>
);
}