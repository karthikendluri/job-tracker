'use client';

import { useState, useEffect, useCallback } from 'react';
import { Job, JobStatus, Stats } from '@/lib/types';

/* ── Status config ── */
const STATUS: Record<JobStatus, { label: string; dot: string; text: string; bg: string; border: string }> = {
  saved:        { label: 'Saved',        dot: '#94A3B8', text: '#64748B',  bg: '#F8FAFC', border: '#E2E8F0' },
  applied:      { label: 'Applied',      dot: '#2563EB', text: '#2563EB',  bg: '#EFF6FF', border: '#BFDBFE' },
  interviewing: { label: 'Interviewing', dot: '#7C3AED', text: '#7C3AED',  bg: '#F5F3FF', border: '#DDD6FE' },
  rejected:     { label: 'Rejected',     dot: '#DC2626', text: '#DC2626',  bg: '#FEF2F2', border: '#FECACA' },
  offer:        { label: 'Offer!',       dot: '#059669', text: '#059669',  bg: '#ECFDF5', border: '#A7F3D0' },
};

const ALL_STATUSES: JobStatus[] = ['saved', 'applied', 'interviewing', 'rejected', 'offer'];

function scoreColor(n: number): string {
  if (n >= 80) return '#059669';
  if (n >= 60) return '#D97706';
  return '#DC2626';
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── Reusable btn styles ── */
const btnPrimary: React.CSSProperties = {
  padding: '11px 20px', background: '#2563EB', color: '#fff',
  border: 'none', borderRadius: '8px', fontWeight: 600,
  fontSize: 13, cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
};
const btnGhost: React.CSSProperties = {
  padding: '5px 12px', background: 'none', border: '1px solid #E2E8F0',
  borderRadius: '6px', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#64748B',
};

export default function Page() {
  const [tab, setTab]           = useState<'search' | 'tracker'>('search');
  const [resume, setResume]     = useState('');
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [source, setSource]     = useState('all');
  const [autoSearch, setAutoSearch] = useState(false);
  const [searching, setSearching]   = useState(false);
  const [results, setResults]       = useState<Job[]>([]);
  const [query, setQuery]           = useState('');
  const [tracked, setTracked]       = useState<Job[]>([]);
  const [stats, setStats]           = useState<Stats>({ total:0, saved:0, applied:0, interviewing:0, rejected:0, offer:0 });
  const [filter, setFilter]         = useState<JobStatus | 'all'>('all');
  const [editJob, setEditJob]       = useState<Job | null>(null);
  const [editNotes, setEditNotes]   = useState('');
  const [toast, setToast]           = useState('');
  const [busyId, setBusyId]         = useState('');

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadTracked = useCallback(async () => {
    const r = await fetch('/api/jobs');
    const d = await r.json();
    setTracked(d.jobs ?? []);
    setStats(d.stats ?? { total:0, saved:0, applied:0, interviewing:0, rejected:0, offer:0 });
  }, []);

  useEffect(() => { loadTracked(); }, [loadTracked]);

  /* ── Search ── */
  async function doSearch() {
    if (!autoSearch && !keywords.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const r = await fetch('/api/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, keywords, location, source, autoFromResume: autoSearch }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setResults(d.jobs ?? []);
      setQuery(d.query ?? keywords);
    } catch (e) {
      notify('Search failed: ' + (e instanceof Error ? e.message : 'Unknown'));
    } finally { setSearching(false); }
  }

  /* ── Save ── */
  async function doSave(job: Job) {
    setBusyId(job.id);
    await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(job) });
    await loadTracked();
    notify(`Saved "${job.title}"`);
    setBusyId('');
  }

  /* ── Status ── */
  async function doStatus(id: string, status: JobStatus) {
    setBusyId(id);
    await fetch('/api/jobs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    await loadTracked();
    notify(`→ ${STATUS[status].label}`);
    setBusyId('');
  }

  /* ── Notes ── */
  async function doNotes() {
    if (!editJob) return;
    await fetch('/api/jobs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editJob.id, notes: editNotes }) });
    await loadTracked();
    setEditJob(null);
    notify('Notes saved');
  }

  /* ── Delete ── */
  async function doDelete(id: string) {
    await fetch('/api/jobs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    await loadTracked();
    notify('Removed');
  }

  const isSaved  = (id: string) => tracked.some(j => j.id === id);
  const filtered = filter === 'all' ? tracked : tracked.filter(j => j.status === filter);

  /* ══════════ RENDER ══════════ */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* NAV */}
      <nav style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>J</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#0F172A', letterSpacing: '-0.02em' }}>JobTracker</span>
          <span style={{ fontSize: 10, fontFamily: 'var(--mono)', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 20 }}>AI</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['search', 'tracker'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: tab === t ? '#2563EB' : 'transparent', color: tab === t ? '#fff' : '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .15s' }}>
              {t === 'search' ? '🔍 Find Jobs' : `📋 Tracker${stats.total > 0 ? ` (${stats.total})` : ''}`}
            </button>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: 1060, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* ══ SEARCH TAB ══ */}
        {tab === 'search' && (
          <div>
            {/* Input card */}
            <div className="fade-up" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 4, letterSpacing: '-0.01em' }}>Find matching jobs</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Paste your resume for AI-powered match scoring, or search by keywords</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Resume */}
                <div>
                  <label style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '.1em', display: 'block', marginBottom: 6 }}>Resume (for AI match scores)</label>
                  <textarea value={resume} onChange={e => setResume(e.target.value)} rows={8} placeholder="Paste your resume here to get AI match scores for every job..." style={{ width: '100%', padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--mono)', resize: 'vertical', outline: 'none', lineHeight: 1.6 }} />
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '.1em', display: 'block', marginBottom: 6 }}>Keywords</label>
                    <input value={keywords} onChange={e => setKeywords(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="React developer, Data Engineer, Product Manager..." disabled={autoSearch} style={{ width: '100%', padding: '10px 12px', background: autoSearch ? 'var(--surface2)' : '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontSize: 13, outline: 'none', opacity: autoSearch ? .5 : 1 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '.1em', display: 'block', marginBottom: 6 }}>Location</label>
                    <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Remote, New York, San Francisco..." style={{ width: '100%', padding: '10px 12px', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '.1em', display: 'block', marginBottom: 6 }}>Source</label>
                      <select value={source} onChange={e => setSource(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontSize: 13, outline: 'none' }}>
                        <option value="all">All Sources</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="indeed">Indeed</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
                        <input type="checkbox" checked={autoSearch} onChange={e => setAutoSearch(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#2563EB' }} />
                        Auto from resume
                      </label>
                    </div>
                  </div>
                  <button onClick={doSearch} disabled={searching || (!keywords.trim() && !autoSearch)} style={{ ...btnPrimary, opacity: searching || (!keywords.trim() && !autoSearch) ? .5 : 1, cursor: searching || (!keywords.trim() && !autoSearch) ? 'not-allowed' : 'pointer', marginTop: 'auto' }}>
                    {searching
                      ? <><div className="spinner" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%' }} />Searching...</>
                      : '🔍 Search Jobs'}
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
                    {results.length} jobs found {query && <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 14 }}>for &quot;{query}&quot;</span>}
                  </div>
                  {resume && <span style={{ fontSize: 12, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '3px 10px', borderRadius: 20 }}>✓ AI match scores active</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {results.map((job, i) => (
                    <div key={job.id} className={`fade-up d${Math.min(i + 1, 5)}`} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '18px 20px', display: 'flex', gap: 16 }}>
                      {/* Score */}
                      <div style={{ flexShrink: 0, textAlign: 'center', width: 56 }}>
                        <svg width="52" height="52" viewBox="0 0 52 52">
                          <circle cx="26" cy="26" r="20" fill="none" stroke="#F1F5F9" strokeWidth="5"/>
                          <circle cx="26" cy="26" r="20" fill="none" stroke={scoreColor(job.matchScore)} strokeWidth="5" strokeLinecap="round"
                            strokeDasharray={`${(job.matchScore / 100) * 125.6} 125.6`} transform="rotate(-90 26 26)"/>
                          <text x="26" y="30" textAnchor="middle" fill={scoreColor(job.matchScore)} style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)' }}>{job.matchScore}</text>
                        </svg>
                        <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: 'var(--mono)', marginTop: 2, letterSpacing: '.05em' }}>MATCH</div>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
                          <div>
                            <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', textDecoration: 'none', letterSpacing: '-0.01em' }}>{job.title}</a>
                            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{job.company} · {job.location}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {job.salary && <span style={{ fontSize: 11, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--mono)' }}>{job.salary}</span>}
                            <span style={{ fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 4, background: job.source === 'linkedin' ? '#0A66C2' : job.source === 'indeed' ? '#2164F3' : '#F1F5F9', color: job.source === 'manual' ? '#64748B' : '#fff' }}>
                              {job.source === 'linkedin' ? 'LinkedIn' : job.source === 'indeed' ? 'Indeed' : 'Manual'}
                            </span>
                          </div>
                        </div>

                        {job.description && (
                          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 10, display: '-webkit-box', overflow: 'hidden' } as React.CSSProperties}>{job.description.slice(0, 160)}...</p>
                        )}

                        {job.matchReasons.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                            {job.matchReasons.slice(0, 3).map((r, ri) => (
                              <span key={ri} style={{ fontSize: 11, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: 20 }}>✓ {r}</span>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>View Job ↗</a>
                          {isSaved(job.id)
                            ? <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>✓ Saved</span>
                            : <button onClick={() => doSave(job)} disabled={busyId === job.id} style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                {busyId === job.id ? 'Saving...' : '+ Save to Tracker'}
                              </button>
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!searching && results.length === 0 && (
              <div style={{ textAlign: 'center', padding: '64px 20px' }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>🎯</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Find your next role</div>
                <div style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>Paste your resume above for AI-powered match scores, then search by keyword or enable auto-search</div>
              </div>
            )}
          </div>
        )}

        {/* ══ TRACKER TAB ══ */}
        {tab === 'tracker' && (
          <div>
            {/* Stats */}
            <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
              {ALL_STATUSES.map(s => {
                const cfg = STATUS[s];
                const count = stats[s] ?? 0;
                const active = filter === s;
                return (
                  <div key={s} onClick={() => setFilter(active ? 'all' : s)} style={{ background: active ? cfg.bg : '#fff', border: `1px solid ${active ? cfg.border : 'var(--border)'}`, borderRadius: 'var(--rl)', padding: '14px 16px', cursor: 'pointer', transition: 'all .15s' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: cfg.text, fontFamily: 'var(--mono)', lineHeight: 1, marginBottom: 4 }}>{count}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{cfg.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {(['all', ...ALL_STATUSES] as (JobStatus | 'all')[]).map(s => (
                <button key={s} onClick={() => setFilter(s)} style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${filter === s ? '#BFDBFE' : 'var(--border)'}`, background: filter === s ? '#EFF6FF' : '#fff', color: filter === s ? '#2563EB' : 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {s === 'all' ? `All (${stats.total})` : `${STATUS[s as JobStatus].label} (${stats[s as JobStatus] ?? 0})`}
                </button>
              ))}
            </div>

            {/* List */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 20px' }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>📋</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>No applications tracked yet</div>
                <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>Search for jobs and save them to start tracking</div>
                <button onClick={() => setTab('search')} style={{ padding: '10px 24px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Find Jobs →</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.map((job, i) => {
                  const cfg = STATUS[job.status];
                  return (
                    <div key={job.id} className={`fade-up d${Math.min(i + 1, 5)}`} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '16px 20px', display: 'flex', gap: 14 }}>
                      {/* Dot */}
                      <div style={{ paddingTop: 5, flexShrink: 0 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.dot }} />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                          <div>
                            <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', textDecoration: 'none' }}>{job.title}</a>
                            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 1 }}>{job.company} · {job.location}</div>
                            {job.salary && <div style={{ fontSize: 11, color: '#059669', fontFamily: 'var(--mono)', marginTop: 2 }}>{job.salary}</div>}
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', color: scoreColor(job.matchScore), flexShrink: 0 }}>{job.matchScore}%</span>
                        </div>

                        {/* Meta */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.text, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: '2px 9px', borderRadius: 20 }}>{cfg.label}</span>
                          <span style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--mono)' }}>Found {fmtDate(job.dateFound)}</span>
                          {job.dateApplied && <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Applied {fmtDate(job.dateApplied)}</span>}
                          <span style={{ fontSize: 10, background: 'var(--surface2)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 4, fontFamily: 'var(--mono)', color: 'var(--dim)' }}>{job.source}</span>
                        </div>

                        {/* Notes */}
                        {job.notes && (
                          <div style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--surface2)', borderRadius: 6, padding: '7px 11px', marginBottom: 10, borderLeft: '3px solid #BFDBFE', fontStyle: 'italic' }}>{job.notes}</div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {ALL_STATUSES.filter(s => s !== job.status).map(s => (
                            <button key={s} onClick={() => doStatus(job.id, s)} disabled={busyId === job.id} style={{ ...btnGhost, color: STATUS[s].text, background: STATUS[s].bg, borderColor: STATUS[s].border }}>
                              → {STATUS[s].label}
                            </button>
                          ))}
                          <button onClick={() => { setEditJob(job); setEditNotes(job.notes || ''); }} style={{ ...btnGhost }}>✎ Notes</button>
                          <div style={{ marginLeft: 'auto' }}>
                            <button onClick={() => doDelete(job.id)} style={{ ...btnGhost, color: '#DC2626', background: '#FEF2F2', borderColor: '#FECACA' }}>✕</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Notes modal */}
      {editJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditJob(null)}>
          <div className="pop-in" style={{ background: '#fff', borderRadius: 'var(--rxl)', padding: 24, width: 460, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,.15)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A', marginBottom: 2 }}>{editJob.title}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>{editJob.company}</div>
            <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={5} placeholder="Add notes — interview date, recruiter name, follow-up actions..." style={{ width: '100%', padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--text)', outline: 'none', resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button onClick={() => setEditJob(null)} style={{ padding: '9px 18px', border: '1px solid var(--border)', background: 'none', borderRadius: 'var(--r)', fontSize: 13, cursor: 'pointer', color: 'var(--muted)' }}>Cancel</button>
              <button onClick={doNotes} style={{ padding: '9px 18px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Notes</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="pop-in" style={{ position: 'fixed', bottom: 24, right: 24, background: '#0F172A', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 200, maxWidth: 300 }}>{toast}</div>
      )}
    </div>
  );
}
