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
    { cat:"Physical & Health",   n:"Age & Athletic Prime Window",             imp:620,  impact: +(p​​​​​​​​​​​​​​​​
