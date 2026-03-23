import React, { useState, useEffect } from 'react';

const STATUS_COLORS = { pending:"#ffd700", won:"#00c896", lost:"#ff4444", void:"#888" };

export default function BetTracker() {
  const [bets, setBets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('propedge_bets') || '[]'); } catch { return []; }
  });
  const [form, setForm] = useState({ player:'', prop:'', line:'', odds:'', stake:'', side:'OVER' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    localStorage.setItem('propedge_bets', JSON.stringify(bets));
  }, [bets]);

  const addBet = () => {
    if (!form.player || !form.prop || !form.line || !form.odds || !form.stake) return;
    const bet = {
      id: Date.now(),
      ...form,
      line: parseFloat(form.line),
      odds: parseFloat(form.odds),
      stake: parseFloat(form.stake),
      status: 'pending',
      actual: null,
      placedAt: new Date().toISOString(),
      pnl: null,
    };
    setBets(prev => [bet, ...prev]);
    setForm({ player:'', prop:'', line:'', odds:'', stake:'', side:'OVER' });
    setAdding(false);
  };

  const settleBet = (id, actual) => {
    setBets(prev => prev.map(b => {
      if (b.id !== id) return b;
      const hit = b.side === 'OVER' ? actual > b.line : actual < b.line;
      const pnl = hit ? +(b.stake * (b.odds - 1)).toFixed(2) : -b.stake;
      return { ...b, actual: parseFloat(actual), status: hit ? 'won' : 'lost', pnl };
    }));
  };

  const deleteBet = (id) => setBets(prev => prev.filter(b => b.id !== id));
  const voidBet   = (id) => setBets(prev => prev.map(b => b.id === id ? {...b, status:'void', pnl:0} : b));

  const settled = bets.filter(b => b.status !== 'pending');
  const totalPnl = settled.reduce((s, b) => s + (b.pnl || 0), 0);
  const wins = settled.filter(b => b.status === 'won').length;
  const hitRate = settled.length > 0 ? Math.round((wins / settled.length) * 100) : 0;
  const totalStaked = settled.reduce((s, b) => s + b.stake, 0);
  const roi = totalStaked > 0 ? +((totalPnl / totalStaked) * 100).toFixed(1) : 0;

  const s = { fontFamily:'monospace' };

  return (
    <div style={{ padding:'1.5rem 1rem', maxWidth:'660px', margin:'0 auto' }}>
      <style>{`
        .bet-card { background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:1rem; margin-bottom:0.7rem; }
        .inp { width:100%; padding:0.65rem 0.9rem; background:#0a0a18; border:1px solid #1a1a2e; border-radius:8px; color:#fff; font-size:0.88rem; font-family:Georgia,serif; box-sizing:border-box; }
        .inp:focus { outline:none; border-color:#4444ff; }
        .btn { padding:0.6rem 1.2rem; border:none; border-radius:8px; cursor:pointer; font-family:monospace; font-size:0.75rem; letter-spacing:0.1em; text-transform:uppercase; }
      `}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.2rem' }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.8rem', letterSpacing:'3px', color:'#fff' }}>BET TRACKER</div>
          <div style={{ ...s, fontSize:'0.6rem', color:'#444', textTransform:'uppercase', letterSpacing:'0.2em' }}>Track · Settle · Analyze</div>
        </div>
        <button className="btn" onClick={() => setAdding(!adding)}
          style={{ background: adding?'#222':'linear-gradient(135deg,#1818cc,#4444ff)', color:'#fff' }}>
          {adding ? '✕ Cancel' : '+ Add Bet'}
        </button>
      </div>

      {settled.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.5rem', marginBottom:'1rem' }}>
          {[
            { label:'Total P&L', val:`${totalPnl >= 0?'+':''}$${totalPnl.toFixed(2)}`, color: totalPnl>=0?'#00c896':'#ff4444' },
            { label:'Hit Rate',  val:`${hitRate}%`,  color: hitRate>=55?'#00c896':hitRate>=50?'#ffd700':'#ff4444' },
            { label:'ROI',       val:`${roi}%`,      color: roi>=0?'#00c896':'#ff4444' },
            { label:'Record',    val:`${wins}-${settled.length-wins}`, color:'#aaa' },
          ].map(({label,val,color}) => (
            <div key={label} style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'0.65rem', textAlign:'center' }}>
              <div style={{ ...s, fontSize:'0.52rem', color:'#444', textTransform:'uppercase', marginBottom:'0.2rem' }}>{label}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.2rem', color, letterSpacing:'1px' }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="bet-card" style={{ borderColor:'#4444ff33', background:'rgba(68,68,255,0.04)', marginBottom:'1rem' }}>
          <div style={{ ...s, fontSize:'0.6rem', color:'#4444ff', textTransform:'uppercase', letterSpacing:'0.2em', marginBottom:'0.8rem' }}>New Bet</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginBottom:'0.5rem' }}>
            <div>
              <div style={{ ...s, fontSize:'0.55rem', color:'#444', textTransform:'uppercase', marginBottom:'0.3rem' }}>Player</div>
              <input className="inp" value={form.player} onChange={e=>setForm(f=>({...f,player:e.target.value}))} placeholder="Devin Booker" />
            </div>
            <div>
              <div style={{ ...s, fontSize:'0.55rem', color:'#444', textTransform:'uppercase', marginBottom:'0.3rem' }}>Prop Type</div>
              <input className="inp" value={form.prop} onChange={e=>setForm(f=>({...f,prop:e.target.value}))} placeholder="Points" />
            </div>
            <div>
              <div style={{ ...s, fontSize:'0.55rem', color:'#444', textTransform:'uppercase', marginBottom:'0.3rem' }}>Line</div>
              <input className="inp" type="number" step="0.5" value={form.line} onChange={e=>setForm(f=>({...f,line:e.target.value}))} placeholder="27.5" />
            </div>
            <div>
              <div style={{ ...s, fontSize:'0.55rem', color:'#444', textTransform:'uppercase', marginBottom:'0.3rem' }}>Side</div>
              <div style={{ display:'flex', gap:'0.4rem' }}>
                {['OVER','UNDER'].map(side => (
                  <button key={side} onClick={() => setForm(f=>({...f,side}))}
                    style={{ flex:1, padding:'0.65rem', border:'none', borderRadius:'8px', cursor:'pointer', fontFamily:'monospace', fontSize:'0.75rem',
                      background: form.side===side?(side==='OVER'?'#00c896':'#ff4444'):'#0a0a18',
                      color: form.side===side?'#000':'#555' }}>
                    {side}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ ...s, fontSize:'0.55rem', color:'#444', textTransform:'uppercase', marginBottom:'0.3rem' }}>Decimal Odds</div>
              <input className="inp" type="number" step="0.01" value={form.odds} onChange={e=>setForm(f=>({...f,odds:e.target.value}))} placeholder="1.91" />
            </div>
            <div>
              <div style={{ ...s, fontSize:'0.55rem', color:'#444', textTransform:'uppercase', marginBottom:'0.3rem' }}>Stake ($)</div>
              <input className="inp" type="number" step="1" value={form.stake} onChange={e=>setForm(f=>({...f,stake:e.target.value}))} placeholder="10" />
            </div>
          </div>
          {form.odds && form.stake && (
            <div style={{ ...s, fontSize:'0.65rem', color:'#666', marginBottom:'0.6rem' }}>
              Potential win: <span style={{ color:'#00c896' }}>${((parseFloat(form.stake)||0)*((parseFloat(form.odds)||0)-1)).toFixed(2)}</span>
              {' '}· To return: <span style={{ color:'#aaa' }}>${((parseFloat(form.stake)||0)*(parseFloat(form.odds)||0)).toFixed(2)}</span>
            </div>
          )}
          <button className="btn" onClick={addBet} style={{ background:'linear-gradient(135deg,#1818cc,#4444ff)', color:'#fff', width:'100%', padding:'0.75rem' }}>
            ✓ Register Bet
          </button>
        </div>
      )}

      {bets.filter(b=>b.status==='pending').length > 0 && (
        <div style={{ ...s, fontSize:'0.58rem', color:'#ffd700', textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:'0.5rem' }}>
          ⏳ Active Bets ({bets.filter(b=>b.status==='pending').length})
        </div>
      )}
      {bets.filter(b=>b.status==='pending').map(bet => (
        <BetCard key={bet.id} bet={bet} onSettle={settleBet} onDelete={deleteBet} onVoid={voidBet} />
      ))}

      {settled.length > 0 && (
        <>
          <div style={{ ...s, fontSize:'0.58rem', color:'#555', textTransform:'uppercase', letterSpacing:'0.15em', margin:'1rem 0 0.5rem' }}>
            Settled ({settled.length})
          </div>
          {settled.map(bet => (
            <BetCard key={bet.id} bet={bet} onSettle={settleBet} onDelete={deleteBet} onVoid={voidBet} />
          ))}
        </>
      )}

      {bets.length === 0 && !adding && (
        <div style={{ textAlign:'center', padding:'3rem 1rem', color:'#222', fontFamily:'monospace', fontSize:'0.75rem' }}>
          No bets tracked yet. Hit + Add Bet to get started.
        </div>
      )}
    </div>
  );
}

function BetCard({ bet, onSettle, onDelete, onVoid }) {
  const [actualInput, setActualInput] = useState('');
  const [settling, setSettling] = useState(false);
  const sc = STATUS_COLORS[bet.status] || '#888';
  const sideColor = bet.side === 'OVER' ? '#00c896' : '#ff4444';

  return (
    <div className="bet-card" style={{ borderColor:`${sc}22` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.5rem' }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.1rem', color:'#fff', letterSpacing:'1px', lineHeight:1 }}>{bet.player}</div>
          <div style={{ fontFamily:'monospace', fontSize:'0.6rem', color:'#555', marginTop:'0.1rem' }}>
            {bet.prop} · <span style={{ color:sideColor, fontWeight:700 }}>{bet.side}</span> {bet.line}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'monospace', fontSize:'0.6rem', color:sc, textTransform:'uppercase', letterSpacing:'0.1em' }}>{bet.status}</div>
          {bet.pnl !== null && (
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'1rem', color:bet.pnl>=0?'#00c896':'#ff4444' }}>
              {bet.pnl>=0?'+':''}{bet.pnl}
            </div>
          )}
        </div>
      </div>
      <div style={{ display:'flex', gap:'1rem', fontFamily:'monospace', fontSize:'0.58rem', color:'#444', marginBottom:'0.5rem' }}>
        <span>Odds: <span style={{ color:'#aaa' }}>{bet.odds}x</span></span>
        <span>Stake: <span style={{ color:'#aaa' }}>${bet.stake}</span></span>
        <span>Win: <span style={{ color:'#00c896' }}>${(bet.stake*(bet.odds-1)).toFixed(2)}</span></span>
        {bet.actual !== null && <span>Actual: <span style={{ color:'#ffd700' }}>{bet.actual}</span></span>}
      </div>
      {bet.status === 'pending' && (
        <div>
          {settling ? (
            <div style={{ display:'flex', gap:'0.4rem', alignItems:'center' }}>
              <input value={actualInput} onChange={e=>setActualInput(e.target.value)}
                placeholder="Actual score" type="number" step="0.5"
                style={{ flex:1, padding:'0.5rem 0.75rem', background:'#0a0a18', border:'1px solid #1a1a2e', borderRadius:'6px', color:'#fff', fontFamily:'monospace', fontSize:'0.8rem' }}/>
              <button onClick={()=>{onSettle(bet.id,actualInput);setSettling(false);}}
                style={{ padding:'0.5rem 0.9rem', background:'#00c896', border:'none', borderRadius:'6px', color:'#000', fontFamily:'monospace', fontSize:'0.7rem', cursor:'pointer', textTransform:'uppercase' }}>
                Settle
              </button>
              <button onClick={()=>setSettling(false)}
                style={{ padding:'0.5rem 0.7rem', background:'#111', border:'1px solid #222', borderRadius:'6px', color:'#555', fontFamily:'monospace', fontSize:'0.7rem', cursor:'pointer' }}>
                ✕
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', gap:'0.4rem' }}>
              <button onClick={()=>setSettling(true)}
                style={{ flex:2, padding:'0.45rem', background:'rgba(68,68,255,0.15)', border:'1px solid #4444ff33', borderRadius:'6px', color:'#4444ff', fontFamily:'monospace', fontSize:'0.65rem', cursor:'pointer', textTransform:'uppercase' }}>
                Enter Result
              </button>
              <button onClick={()=>onVoid(bet.id)}
                style={{ flex:1, padding:'0.45rem', background:'rgba(255,255,255,0.04)', border:'1px solid #222', borderRadius:'6px', color:'#444', fontFamily:'monospace', fontSize:'0.65rem', cursor:'pointer', textTransform:'uppercase' }}>
                Void
              </button>
              <button onClick={()=>onDelete(bet.id)}
                style={{ padding:'0.45rem 0.7rem', background:'rgba(255,68,68,0.08)', border:'1px solid #ff444422', borderRadius:'6px', color:'#ff4444', fontFamily:'monospace', fontSize:'0.65rem', cursor:'pointer' }}>
                ✕
              </button>
            </div>
          )}
        </div>
      )}
      {bet.status !== 'pending' && (
        <button onClick={()=>onDelete(bet.id)}
          style={{ padding:'0.35rem 0.7rem', background:'rgba(255,68,68,0.06)', border:'1px solid #ff444418', borderRadius:'6px', color:'#ff4444', fontFamily:'monospace', fontSize:'0.6rem', cursor:'pointer', marginTop:'0.2rem' }}>
          Delete
        </button>
      )}
    </div>
  );
}
