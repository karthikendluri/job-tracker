'use client';

import React, { useState, useEffect, useCallback } from 'react';

const STATUS: any = {
  saved:        { label:'Saved',        color:'#64748B', bg:'#F1F5F9', bd:'#E2E8F0', dot:'#94A3B8' },
  applied:      { label:'Applied',      color:'#2563EB', bg:'#EFF6FF', bd:'#BFDBFE', dot:'#2563EB' },
  interviewing: { label:'Interviewing', color:'#7C3AED', bg:'#F5F3FF', bd:'#C4B5FD', dot:'#7C3AED' },
  rejected:     { label:'Rejected',     color:'#DC2626', bg:'#FEF2F2', bd:'#FCA5A5', dot:'#DC2626' },
  offer:        { label:'🎉 Offer',     color:'#059669', bg:'#ECFDF5', bd:'#6EE7B7', dot:'#059669' },
};

const scoreColor = (s: number) => s >= 80 ? '#059669' : s >= 60 ? '#D97706' : '#DC2626';
const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '';

export default function Page() {
  const [tab, setTab]         = useState('search');
  const [resume, setResume]   = useState('');
  const [kw, setKw]           = useState('');
  const [loc, setLoc]         = useState('');
  const [src, setSrc]         = useState('all');
  const [auto, setAuto]       = useState(false);
  const [busy, setBusy]       = useState(false);
  const [results, setResults] = useState([]);
  const [query, setQuery]     = useState('');
  const [jobs, setJobs]       = useState([]);
  const [stats, setStats]     = useState({ total:0, saved:0, applied:0, interviewing:0, rejected:0, offer:0 });
  const [filter, setFilter]   = useState('all');
  const [modal, setModal]     = useState<any>(null);
  const [notes, setNotes]     = useState('');
  const [toast, setToast]     = useState('');
  const [saving, setSaving]   = useState('');

  const ping = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadJobs = useCallback(async () => {
    const r = await fetch('/api/jobs');
    const d = await r.json();
    setJobs(d.jobs || []);
    setStats(d.stats || {});
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const doSearch = async () => {
    if (!auto && !kw.trim()) return;
    setBusy(true); setResults([]);
    try {
      const r = await fetch('/api/search', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ resume, keywords:kw, location:loc, source:src, autoFromResume:auto }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setResults(d.jobs || []);
      setQuery(d.query || kw);
    } catch(e: any) {
      ping('Error: ' + e.message);
    } finally { setBusy(false); }
  };

  const saveJob = async (job: any) => {
    setSaving(job.id);
    try {
      await fetch('/api/jobs', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(job) });
      await loadJobs();
      ping(`Saved "${job.title}" to tracker`);
    } finally { setSaving(''); }
  };

  const updateStatus = async (id: string, status: string) => {
    setSaving(id);
    try {
      await fetch('/api/jobs', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id, status }) });
      await loadJobs();
      ping(`Moved to ${STATUS[status].label}`);
    } finally { setSaving(''); }
  };

  const saveNotes = async () => {
    if (!modal) return;
    await fetch('/api/jobs', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:modal.id, notes }) });
    await loadJobs(); setModal(null); ping('Notes saved');
  };

  const removeJob = async (id: string) => {
    await fetch('/api/jobs', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id }) });
    await loadJobs(); ping('Removed');
  };

  const isSaved = (id: string) => (jobs as any[]).some((j:any) => j.id === id);
  const filtered = filter === 'all' ? jobs : (jobs as any[]).filter((j:any) => j.status === filter);

  /* ── styles ── */
  const card  = { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--rl)', padding:'20px' } as React.CSSProperties;
  const btn   = (active: boolean, col?: string) => ({ padding:'7px 16px', borderRadius:'var(--r)', border:'none', cursor:'pointer', fontWeight:600, fontSize:13, background: active ? (col||'var(--blue)') : 'transparent', color: active ? '#fff' : 'var(--muted)', transition:'all .15s' }) as React.CSSProperties;
  const input = { width:'100%', padding:'10px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--r)', fontSize:13, color:'var(--text)', outline:'none' } as React.CSSProperties;
  const tag   = (c: string, bg: string, bd: string) => ({ fontSize:11, fontWeight:700, color:c, background:bg, border:`1px solid ${bd}`, padding:'2px 9px', borderRadius:20 }) as React.CSSProperties;

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

      {/* NAV */}
      <nav style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'0 28px', height:58, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'var(--blue)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:17 }}>J</div>
          <span style={{ fontWeight:800, fontSize:18, letterSpacing:'-0.02em' }}>JobTracker</span>
          <span style={{ fontSize:11, fontFamily:'var(--mono)', background:'var(--blue-bg)', color:'var(--blue)', border:'1px solid var(--blue-bd)', padding:'2px 8px', borderRadius:4 }}>AI</span>
        </div>
        <div style={{ display:'flex', gap:4, background:'var(--surface2)', padding:4, borderRadius:'var(--rl)', border:'1px solid var(--border)' }}>
          <button onClick={() => setTab('search')} style={btn(tab==='search')}>🔍 Find Jobs</button>
          <button onClick={() => setTab('tracker')} style={btn(tab==='tracker')}>📋 Tracker {stats.total > 0 ? `(${stats.total})` : ''}</button>
        </div>
      </nav>

      <main style={{ maxWidth:1060, margin:'0 auto', padding:'32px 24px 80px' }}>

        {/* ═══ SEARCH TAB ═══ */}
        {tab === 'search' && <>
          <div className="fadeUp" style={{ ...card, marginBottom:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>

              {/* Resume */}
              <div>
                <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>Resume <span style={{ color:'var(--dim)', fontWeight:400 }}>(for AI match scores)</span></div>
                <textarea value={resume} onChange={e => setResume(e.target.value)} placeholder="Paste your resume for AI-powered job matching and auto-search..." rows={8} style={{ ...input, resize:'vertical', fontFamily:'var(--mono)', fontSize:11 }} />
              </div>

              {/* Controls */}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>Job Title / Keywords</div>
                  <input value={kw} onChange={e => setKw(e.target.value)} onKeyDown={e => e.key==='Enter' && doSearch()} placeholder="React developer, Data engineer, Product manager..." disabled={auto} style={{ ...input, opacity: auto ? .5 : 1 }} />
                </div>
                <div>
                  <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>Location</div>
                  <input value={loc} onChange={e => setLoc(e.target.value)} placeholder="Remote, New York, London, San Francisco..." style={input} />
                </div>
                <div style={{ display:'flex', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:6 }}>Source</div>
                    <select value={src} onChange={e => setSrc(e.target.value)} style={{ ...input }}>
                      <option value="all">All Sources</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="indeed">Indeed</option>
                    </select>
                  </div>
                  <label style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end', paddingBottom:10, gap:4, cursor:'pointer', fontSize:13, color:'var(--text2)', fontWeight:500 }}>
                    <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} style={{ width:15, height:15, accentColor:'var(--blue)' }} />
                    Auto from resume
                  </label>
                </div>
                <button onClick={doSearch} disabled={busy || (!kw.trim() && !auto)} style={{ padding:'13px', background: busy || (!kw.trim() && !auto) ? 'var(--surface2)' : 'var(--blue)', color: busy || (!kw.trim() && !auto) ? 'var(--muted)' : '#fff', border:'1px solid var(--border)', borderRadius:'var(--r)', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .15s' }}>
                  {busy ? <><div className="spin" style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%' }}/>Searching...</> : '🔍  Search Jobs'}
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontWeight:700, fontSize:18 }}>{results.length} jobs found {query && <span style={{ fontSize:14, color:'var(--muted)', fontWeight:400 }}>for "{query}"</span>}</div>
              {resume && <span style={tag('var(--green)','var(--green-bg)','var(--green-bd)')}>✓ AI match scores active</span>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {(results as any[]).map((job: any, i: number) => (
                <div key={job.id} className={`fadeUp d${Math.min(i+1,6)}`} style={{ ...card, padding:'16px 20px', display:'flex', gap:16 }}>
                  {/* Score */}
                  <div style={{ flexShrink:0, textAlign:'center', width:56 }}>
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="20" fill="none" stroke="var(--surface2)" strokeWidth="5"/>
                      <circle cx="26" cy="26" r="20" fill="none" stroke={scoreColor(job.matchScore)} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(job.matchScore/100)*125.6} 125.6`} transform="rotate(-90 26 26)"/>
                      <text x="26" y="31" textAnchor="middle" style={{ fontSize:12, fontWeight:700, fill:scoreColor(job.matchScore), fontFamily:'var(--mono)' }}>{job.matchScore}</text>
                    </svg>
                    <div style={{ fontSize:9, color:'var(--dim)', fontFamily:'var(--mono)', marginTop:1 }}>MATCH</div>
                  </div>
                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:4 }}>
                      <div>
                        <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>{job.title}</a>
                        <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>{job.company} · {job.location}</div>
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        {job.salary && <span style={{ ...tag('var(--green)','var(--green-bg)','var(--green-bd)'), fontFamily:'var(--mono)' }}>{job.salary}</span>}
                        <span style={{ fontSize:10, fontFamily:'var(--mono)', padding:'2px 8px', borderRadius:4, background: job.source==='linkedin'?'#0A66C2':job.source==='indeed'?'#2164F3':'var(--surface2)', color: job.source==='manual'?'var(--muted)':'#fff' }}>{job.source==='linkedin'?'LinkedIn':job.source==='indeed'?'Indeed':'Web'}</span>
                      </div>
                    </div>
                    {job.description && <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5, marginBottom:8, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' } as React.CSSProperties}>{job.description}</p>}
                    {job.matchReasons?.length > 0 && (
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
                        {job.matchReasons.slice(0,3).map((r: string, i: number) => <span key={i} style={tag('var(--blue)','var(--blue-bg)','var(--blue-bd)')}>✓ {r}</span>)}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                      <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'var(--blue)', fontWeight:600 }}>View Job ↗</a>
                      {isSaved(job.id)
                        ? <span style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>✓ In tracker</span>
                        : <button onClick={() => saveJob(job)} disabled={saving===job.id} style={{ fontSize:12, color:'var(--blue)', fontWeight:600, background:'none', border:'none', padding:0 }}>{saving===job.id ? 'Saving...' : '+ Save to Tracker'}</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>}

          {!busy && results.length === 0 && (
            <div style={{ textAlign:'center', padding:'64px 20px', color:'var(--dim)' }}>
              <div style={{ fontSize:52, marginBottom:14 }}>🔍</div>
              <div style={{ fontSize:17, fontWeight:700, color:'var(--text2)', marginBottom:6 }}>Find your next role</div>
              <div style={{ fontSize:13 }}>Paste your resume for AI matching · enter keywords · hit Search</div>
            </div>
          )}
        </>}

        {/* ═══ TRACKER TAB ═══ */}
        {tab === 'tracker' && <>

          {/* Stats */}
          <div className="fadeUp" style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:22 }}>
            {Object.entries(STATUS).map(([s, cfg]: any) => (
              <div key={s} onClick={() => setFilter(filter===s?'all':s)} style={{ ...card, padding:'14px 16px', cursor:'pointer', border:`1px solid ${filter===s ? cfg.bd : 'var(--border)'}`, background: filter===s ? cfg.bg : 'var(--surface)', transition:'all .15s' }}>
                <div style={{ fontSize:26, fontWeight:800, color:cfg.color, fontFamily:'var(--mono)', lineHeight:1 }}>{(stats as any)[s]||0}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:4, fontWeight:500 }}>{cfg.label}</div>
              </div>
            ))}
          </div>

          {/* Filter pills */}
          <div style={{ display:'flex', gap:7, marginBottom:18, flexWrap:'wrap' }}>
            {['all', ...Object.keys(STATUS)].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{ padding:'5px 14px', borderRadius:20, border:`1px solid ${filter===s?'var(--blue-bd)':'var(--border)'}`, background: filter===s?'var(--blue-bg)':'var(--surface)', color: filter===s?'var(--blue)':'var(--muted)', fontSize:12, fontWeight:600, transition:'all .15s' }}>
                {s==='all' ? `All (${stats.total})` : `${STATUS[s].label} (${(stats as any)[s]||0})`}
              </button>
            ))}
          </div>

          {/* Job cards */}
          {(filtered as any[]).length === 0
            ? <div style={{ textAlign:'center', padding:'64px 20px', color:'var(--dim)' }}>
                <div style={{ fontSize:52, marginBottom:14 }}>📋</div>
                <div style={{ fontSize:17, fontWeight:700, color:'var(--text2)', marginBottom:6 }}>No applications yet</div>
                <div style={{ fontSize:13, marginBottom:18 }}>Search for jobs and save them here</div>
                <button onClick={() => setTab('search')} style={{ padding:'10px 24px', background:'var(--blue)', color:'#fff', border:'none', borderRadius:'var(--r)', fontSize:13, fontWeight:700 }}>Find Jobs →</button>
              </div>
            : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {(filtered as any[]).map((job: any, i: number) => {
                  const cfg = STATUS[job.status];
                  return (
                    <div key={job.id} className={`fadeUp d${Math.min(i+1,6)}`} style={{ ...card, padding:'16px 20px', display:'flex', gap:14, alignItems:'flex-start' }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:cfg.dot, marginTop:5, flexShrink:0 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                          <div>
                            <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>{job.title}</a>
                            <div style={{ fontSize:13, color:'var(--text2)', marginTop:2 }}>{job.company} · {job.location}</div>
                            {job.salary && <div style={{ fontSize:11, color:'var(--green)', marginTop:2, fontFamily:'var(--mono)' }}>{job.salary}</div>}
                          </div>
                          <span style={{ fontSize:11, fontFamily:'var(--mono)', color:scoreColor(job.matchScore), fontWeight:700, flexShrink:0 }}>{job.matchScore}% match</span>
                        </div>

                        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10, flexWrap:'wrap' }}>
                          <span style={tag(cfg.color, cfg.bg, cfg.bd)}>{cfg.label}</span>
                          <span style={{ fontSize:11, color:'var(--dim)', fontFamily:'var(--mono)' }}>Found {fmt(job.dateFound)}</span>
                          {job.dateApplied && <span style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)' }}>Applied {fmt(job.dateApplied)}</span>}
                        </div>

                        {job.notes && <p style={{ fontSize:12, color:'var(--muted)', background:'var(--surface2)', borderRadius:6, padding:'7px 10px', marginBottom:10, fontStyle:'italic', borderLeft:'3px solid var(--blue-bd)' }}>{job.notes}</p>}

                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {Object.keys(STATUS).filter(s => s !== job.status).map(s => (
                            <button key={s} onClick={() => updateStatus(job.id, s)} disabled={saving===job.id} style={{ fontSize:11, padding:'3px 10px', borderRadius:5, border:`1px solid ${STATUS[s].bd}`, background:STATUS[s].bg, color:STATUS[s].color, fontWeight:600, transition:'all .1s' }}>
                              → {STATUS[s].label}
                            </button>
                          ))}
                          <button onClick={() => { setModal(job); setNotes(job.notes||''); }} style={{ fontSize:11, padding:'3px 10px', borderRadius:5, border:'1px solid var(--border)', background:'none', color:'var(--muted)' }}>✎ Notes</button>
                          <button onClick={() => removeJob(job.id)} style={{ fontSize:11, padding:'3px 10px', borderRadius:5, border:'1px solid var(--red-bd)', background:'var(--red-bg)', color:'var(--red)', marginLeft:'auto' }}>✕ Remove</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </>}
      </main>

      {/* NOTES MODAL */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }} onClick={() => setModal(null)}>
          <div className="popIn" style={{ ...card, width:480, maxWidth:'90vw' }} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div style={{ fontWeight:700, fontSize:16, marginBottom:3 }}>{modal.title}</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginBottom:16 }}>{modal.company} · {modal.location}</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes: interview dates, recruiter name, follow-up tasks, impressions..." rows={5} style={{ ...input, resize:'vertical', fontFamily:'var(--mono)', fontSize:12, marginBottom:14 }} />
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding:'8px 18px', border:'1px solid var(--border)', background:'none', borderRadius:'var(--r)', fontSize:13, color:'var(--muted)' }}>Cancel</button>
              <button onClick={saveNotes} style={{ padding:'8px 18px', background:'var(--blue)', color:'#fff', border:'none', borderRadius:'var(--r)', fontSize:13, fontWeight:700 }}>Save Notes</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div className="popIn" style={{ position:'fixed', bottom:24, right:24, background:'var(--text)', color:'#fff', padding:'10px 18px', borderRadius:10, fontSize:13, fontWeight:500, zIndex:200, maxWidth:320, boxShadow:'0 4px 20px rgba(0,0,0,.2)' }}>{toast}</div>}
    </div>
  );
}
