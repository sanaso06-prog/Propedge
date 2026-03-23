import { OPPONENTS, MATCHUPS, defLabel, posDefKey } from './opponents';

export function runAnalysis(p, propType, line) {
  const statMap = {
    Points: p.pts, Rebounds: p.reb, Assists: p.ast,
    "3-Pointers Made": p.threepm, Steals: p.stl, Blocks: p.blk,
    "PRA (Pts+Reb+Ast)": +(p.pts + p.reb + p.ast).toFixed(1)
  };
  const base = statMap[propType] || p.pts;
  const l10 = propType === "Points" ? p.last10 : +(base * (p.last10 / p.pts)).toFixed(1);
  const l5  = propType === "Points" ? p.last5  : +(base * (p.last5  / p.pts)).toFixed(1);
  const oppTeam = MATCHUPS[p.team];
  const opp = oppTeam ? OPPONENTS[oppTeam] : null;
  const posDef = opp ? opp[posDefKey(p.pos)] : 113;

  const F = [
    { cat:"Form & Momentum",     n:"Current Hot/Cold Streak",                 imp:950,  impact: +(((l5-base)/Math.max(base,1))*base*0.30).toFixed(2) },
    { cat:"Form & Momentum",     n:"Last 5 Games vs Line",                    imp:920,  impact: +(((l5-line)/Math.max(line,1))*base*0.18).toFixed(2) },
    { cat:"Form & Momentum",     n:"Last 10 Games vs Line",                   imp:880,  impact: +(((l10-line)/Math.max(line,1))*base*0.14).toFixed(2) },
    { cat:"Form & Momentum",     n:"Season Trend (improving/declining)",      imp:700,  impact: +((l5-base)*0.12).toFixed(2) },
    { cat:"Form & Momentum",     n:"Game-to-Game Variance",                   imp:760,  impact: +(Math.abs(l10-l5)>3?-0.8:0.4).toFixed(2) },
    { cat:"Form & Momentum",     n:"Late-Season Cumulative Fatigue",          imp:620,  impact: +(p.age>35?-1.2:p.age>32?-0.6:0.2).toFixed(2) },
    { cat:"Form & Momentum",     n:"First vs Second Half Season Split",       imp:580,  impact: 0.3 },
    { cat:"Shooting & Skill",    n:"Field Goal % (FG%)",                      imp:900,  impact: +(((p.fg-46)/46)*base*0.08).toFixed(2) },
    { cat:"Shooting & Skill",    n:"Effective FG% (eFG%)",                    imp:880,  impact: +(((p.fg-46)/46)*base*0.07).toFixed(2) },
    { cat:"Shooting & Skill",    n:"True Shooting % (TS%)",                   imp:850,  impact: +(p.ft>85?0.8:p.ft>75?0.2:-0.6).toFixed(2) },
    { cat:"Shooting & Skill",    n:"3-Point Percentage",                      imp:820,  impact: +(((p.threePct-35)/35)*p.threepm*0.4).toFixed(2) },
    { cat:"Shooting & Skill",    n:"3-Point Attempt Rate",                    imp:800,  impact: +(p.threepm*0.12).toFixed(2) },
    { cat:"Shooting & Skill",    n:"Free Throw % (FT%)",                      imp:780,  impact: +(p.ft>88?1.1:p.ft>78?0.4:-0.8).toFixed(2) },
    { cat:"Shooting & Skill",    n:"Free Throw Attempt Rate",                 imp:850,  impact: +(p.ftRate*0.14).toFixed(2) },
    { cat:"Shooting & Skill",    n:"Mid-Range Efficiency",                    imp:620,  impact: +(p.fg>50?0.4:-0.2).toFixed(2) },
    { cat:"Shooting & Skill",    n:"Rim Finishing Rate",                      imp:700,  impact: +(p.fg>55?0.8:0.2).toFixed(2) },
    { cat:"Shooting & Skill",    n:"Shot Quality Index",                      imp:760,  impact: +(((p.fg-44)/44)*1.2).toFixed(2) },
    { cat:"Shooting & Skill",    n:"Pull-Up vs Catch-and-Shoot",              imp:540,  impact: +(p.usage>30?0.5:-0.2).toFixed(2) },
    { cat:"Shooting & Skill",    n:"Assisted vs Unassisted FGM",              imp:490,  impact: 0.1 },
    { cat:"Usage & Role",        n:"Usage Rate (%)",                          imp:970,  impact: +(((p.usage-25)/25)*base*0.14).toFixed(2) },
    { cat:"Usage & Role",        n:"Minutes Per Game",                        imp:990,  impact: +(base*0.04).toFixed(2) },
    { cat:"Usage & Role",        n:"Starter vs Bench Role",                   imp:850,  impact: 0.9 },
    { cat:"Usage & Role",        n:"Plays Designed for Player",               imp:810,  impact: +(p.usage>30?1.1:0.4).toFixed(2) },
    { cat:"Usage & Role",        n:"Isolation Frequency",                     imp:700,  impact: +(p.usage>32?0.8:0.2).toFixed(2) },
    { cat:"Usage & Role",        n:"Pick-and-Roll Ball Handler Rate",         imp:720,  impact: +(p.usage>28?0.7:0.2).toFixed(2) },
    { cat:"Usage & Role",        n:"Post-Up Frequency",                       imp:600,  impact: +(["C","PF"].includes(p.pos)?0.6:0.1).toFixed(2) },
    { cat:"Usage & Role",        n:"Off-Ball Movement & Cuts",                imp:560,  impact: 0.3 },
    { cat:"Usage & Role",        n:"Touch Rate / Possessions Used",           imp:880,  impact: +(((p.usage-25)/25)*base*0.10).toFixed(2) },
    { cat:"Physical & Health",   n:"Injury Status (Official Report)",         imp:1000, impact: +(p.injSev>0?-(p.injSev*1.4):0.5).toFixed(2) },
    { cat:"Physical & Health",   n:"Specific Injury Severity",                imp:950,  impact: +(p.injSev>3?-(p.injSev*0.8):0).toFixed(2) },
    { cat:"Physical & Health",   n:"Cumulative Physical Fatigue",             imp:780,  impact: +(p.age>35?-1.4:p.age>30?-0.4:0.4).toFixed(2) },
    { cat:"Physical & Health",   n:"Age & Athletic Prime Window",             imp:620,  impact: +(p.prime?0.8:p.age>37?-1.8:-0.6).toFixed(2) },
    { cat:"Physical & Health",   n:"Speed & First-Step Explosiveness",        imp:680,  impact: +(p.age<28?0.9:p.age>35?-0.8:0.3).toFixed(2) },
    { cat:"Physical & Health",   n:"Vertical Jump / Athleticism",             imp:540,  impact: +(p.pos==="C"?0.4:0.6).toFixed(2) },
    { cat:"Physical & Health",   n:"Physical Contact Tolerance",              imp:460,  impact: +(p.ft>80?0.5:0.2).toFixed(2) },
    { cat:"Schedule & Rest",     n:"Back-to-Back Game",                       imp:880,  impact: +(p.b2b?-2.8:0.4).toFixed(2) },
    { cat:"Schedule & Rest",     n:"Days of Rest Since Last Game",            imp:840,  impact: +(p.daysRest>=3?1.2:p.daysRest===2?0.4:p.daysRest===1?-0.8:-2.1).toFixed(2) },
    { cat:"Schedule & Rest",     n:"Games Played Last 7 Days",                imp:800,  impact: +(p.b2b?-1.2:-0.3).toFixed(2) },
    { cat:"Schedule & Rest",     n:"Games Played Last 14 Days",               imp:740,  impact: -0.4 },
    { cat:"Schedule & Rest",     n:"Season Phase (Late Regular Season)",      imp:600,  impact: +(p.prime?0.6:0.2).toFixed(2) },
    { cat:"Schedule & Rest",     n:"Travel Distance / Time Zones Crossed",    imp:680,  impact: -0.3 },
    { cat:"Schedule & Rest",     n:"Sleep Quality (Travel Impact)",           imp:620,  impact: -0.2 },
    { cat:"Schedule & Rest",     n:"Circadian Rhythm Disruption",             imp:420,  impact: -0.1 },
    { cat:"Matchup & Defense",   n:`Matchup Difficulty (${defLabel(posDef)} Defense)`, imp:990, impact: +(((113-posDef)/113)*base*0.264).toFixed(2) },
    { cat:"Matchup & Defense",   n:"Opponent Overall Defensive Rating",       imp:940,  impact: +(((113-posDef)/113)*base*0.22).toFixed(2) },
    { cat:"Matchup & Defense",   n:`Opp PPG Allowed to ${p.pos}s`,           imp:960,  impact: +(((113-posDef)/113)*base*0.24).toFixed(2) },
    { cat:"Matchup & Defense",   n:"Opponent 3-Point Defense %",              imp:820,  impact: +(propType==="3-Pointers Made"&&opp?((36-opp.threeDef)/36)*p.threepm*0.3:((36-(opp?opp.threeDef:35))/36)*0.4).toFixed(2) },
    { cat:"Matchup & Defense",   n:"Primary Defender Matchup Quality",        imp:900,  impact: +(((113-posDef)/113)*base*0.20).toFixed(2) },
    { cat:"Matchup & Defense",   n:"Double-Team / Help Defense Risk",         imp:780,  impact: +(p.usage>32?-1.4:-0.4).toFixed(2) },
    { cat:"Matchup & Defense",   n:"Opponent Foul Rate (FT Opportunity)",     imp:720,  impact: +(opp?((opp.foulRate-20)/20)*p.ftRate*0.12:0.2).toFixed(2) },
    { cat:"Matchup & Defense",   n:"Opponent Pace of Play",                   imp:760,  impact: +(opp?((opp.pace-98)/98)*base*0.08:0).toFixed(2) },
    { cat:"Matchup & Defense",   n:"Historical Stats vs This Opponent",       imp:880,  impact: +(base*0.04).toFixed(2) },
    { cat:"Matchup & Defense",   n:"Rim Protection (Blocks/FG Allowed)",      imp:640,  impact: +(opp?(opp.rimFG>60?-0.6:0.4):0.1).toFixed(2) },
    { cat:"Matchup & Defense",   n:"Perimeter Closeout Speed",                imp:560,  impact: +(opp&&propType==="3-Pointers Made"?(opp.threeDef>36?-0.5:0.4):0.1).toFixed(2) },
    { cat:"Team & Tactical",     n:"Team Offensive Rating",                   imp:820,  impact: +(((p.pace-98)/98)*base*0.06).toFixed(2) },
    { cat:"Team & Tactical",     n:"Team Pace (Possessions/Game)",            imp:900,  impact: +(((p.pace-98)/98)*base*0.10).toFixed(2) },
    { cat:"Team & Tactical",     n:"Playmaking Teammates Available",          imp:780,  impact: 0.6 },
    { cat:"Team & Tactical",     n:"Key Teammates Out (Usage Boost)",         imp:860,  impact: 0.8 },
    { cat:"Team & Tactical",     n:"Offensive System / Scheme Fit",           imp:740,  impact: 0.5 },
    { cat:"Team & Tactical",     n:"Coaching Strategy Tonight",               imp:680,  impact: 0.3 },
    { cat:"Team & Tactical",     n:"Game Total (High/Low O/U)",               imp:720,  impact: +(opp?(opp.pace>100?0.8:-0.4):0.2).toFixed(2) },
    { cat:"Team & Tactical",     n:"Win/Loss Playoff Implications",           imp:640,  impact: 0.4 },
    { cat:"Team & Tactical",     n:"Garbage Time Risk",                       imp:700,  impact: -0.5 },
    { cat:"Team & Tactical",     n:"Team Assist Rate",                        imp:580,  impact: 0.2 },
    { cat:"Team & Tactical",     n:"Offensive Rebounding Rate",               imp:540,  impact: 0.2 },
    { cat:"Venue & Environment", n:"Home vs Away",                            imp:780,  impact: +((p.homeAvg-p.awayAvg)*0.5).toFixed(2) },
    { cat:"Venue & Environment", n:"Home Court Crowd Energy",                 imp:520,  impact: 0.4 },
    { cat:"Venue & Environment", n:"Arena Altitude Effect",                   imp:380,  impact: 0.0 },
    { cat:"Venue & Environment", n:"Court / Arena Familiarity",               imp:340,  impact: 0.1 },
    { cat:"Venue & Environment", n:"National TV Game Intensity",              imp:460,  impact: 0.3 },
    { cat:"Mental & Psychological", n:"Mental Toughness / Clutch History",    imp:700,  impact: +(p.prime?0.6:0.3).toFixed(2) },
    { cat:"Mental & Psychological", n:"Revenge Game / Extra Motivation",      imp:620,  impact: 0.2 },
    { cat:"Mental & Psychological", n:"Player Confidence (Recent Form)",      imp:560,  impact: +(l5>base?0.7:-0.4).toFixed(2) },
    { cat:"Mental & Psychological", n:"Contract Year Motivation",             imp:480,  impact: 0.1 },
    { cat:"Mental & Psychological", n:"Team Chemistry",                       imp:440,  impact: 0.2 },
    { cat:"Mental & Psychological", n:"Pre-Game Routine Disruption",          imp:380,  impact: 0.0 },
    { cat:"Mental & Psychological", n:"External Pressure / Media",            imp:300,  impact: 0.1 },
    { cat:"Historical & Situational", n:"Career Avg vs Tonight Opponent",     imp:860,  impact: +(base*0.04).toFixed(2) },
    { cat:"Historical & Situational", n:"Historical Prop Hit Rate vs Line",   imp:900,  impact: +(base>line?0.9:-0.7).toFixed(2) },
    { cat:"Historical & Situational", n:"Same Weekday Performance Pattern",   imp:320,  impact: 0.1 },
    { cat:"Historical & Situational", n:"Month-by-Month Consistency",         imp:560,  impact: 0.2 },
    { cat:"Historical & Situational", n:"Post-Win vs Post-Loss Pattern",      imp:480,  impact: 0.2 },
    { cat:"Historical & Situational", n:"Prime Time / Big Game Performance",  imp:620,  impact: +(p.prime?0.5:0.2).toFixed(2) },
    { cat:"Historical & Situational", n:"Performance vs Elite vs Weak Def",   imp:740,  impact: +(posDef<110?-0.8:posDef>116?1.4:0.3).toFixed(2) },
    { cat:"Historical & Situational", n:"Late-Season Playoff Push Pattern",   imp:660,  impact: +(p.prime?0.6:0.2).toFixed(2) },
  ];

  const totalDelta = F.reduce((s, f) => s + (parseFloat(f.impact) || 0), 0);
  const prediction = Math.max(0, +(base + totalDelta * 0.38).toFixed(1));
  const floor      = +(prediction * 0.70).toFixed(1);
  const ceiling    = +(prediction * 1.34).toFixed(1);
  const edge       = prediction - line;
  const sigma      = Math.max(1, (ceiling - floor) / 4);
  const overProb   = Math.round(Math.min(87, Math.max(13, 50 + (edge / sigma) * 28)));
  const rec        = p.injSev >= 5 ? "PASS" : edge > 1.8 ? "OVER" : edge < -1.8 ? "UNDER" : "PASS";
  const conf       = Math.round(Math.min(90, Math.max(44, 52 + Math.abs(edge) * 2.8)));

  const catOrder = ["Form & Momentum","Shooting & Skill","Usage & Role","Physical & Health",
    "Schedule & Rest","Matchup & Defense","Team & Tactical","Venue & Environment",
    "Mental & Psychological","Historical & Situational"];
  const catMap = {};
  for (const f of F) {
    if (!catMap[f.cat]) catMap[f.cat] = [];
    const ratio = f.impact > 0 ? Math.min(1, 0.5 + f.impact / 8) : Math.max(0, 0.5 + f.impact / 8);
    catMap[f.cat].push({ name: f.n, importance: f.imp, tonight: Math.round(ratio * 1000), impact: Math.round(f.impact * 10) / 10 });
  }
  const categories = catOrder.filter(c => catMap[c]).map(c => ({ name: c, factors: catMap[c] }));

  return {
    playerName: p.name, team: p.fullTeam, shortTeam: p.team, pos: p.pos,
    propType, propLine: line,
    seasonAvg: base, last10Avg: l10, last5Avg: l5,
    careerAvg: +(p.careerAvg * (propType === "Points" ? 1 : base / Math.max(p.pts, 1))).toFixed(1),
    prediction, floor, ceiling, overProb, rec, conf,
    totalFactors: F.length, opp, oppTeam, posDef,
    defLbl: defLabel(posDef), categories, injStatus: p.injStatus,
  };
}
