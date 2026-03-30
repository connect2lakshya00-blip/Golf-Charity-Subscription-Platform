'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function DashboardPage() {
  const router = useRouter();
  const { user, fetchMe, logout } = useAuthStore();
  const [scores, setScores] = useState([]);
  const [sub, setSub] = useState(null);
  const [draws, setDraws] = useState([]);
  const [winnings, setWinnings] = useState([]);
  const [newScore, setNewScore] = useState({ score: '', played_at: '' });
  const [loading, setLoading] = useState(true);
  const [addingScore, setAddingScore] = useState(false);
  const [tab, setTab] = useState('overview');
  const [proofUrl, setProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [subRes, drawRes] = await Promise.all([
        api.get('/subscriptions/status'),
        api.get('/draws'),
      ]);
      setSub(subRes.data);
      setDraws(drawRes.data);
      if (subRes.data?.status === 'active') {
        const [scoreRes, winRes] = await Promise.all([
          api.get('/scores'),
          api.get('/draws/my-winnings'),
        ]);
        setScores(scoreRes.data);
        setWinnings(winRes.data);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    fetchMe();
    loadData();
  }, [fetchMe, loadData, router]);

  const addScore = async (e) => {
    e.preventDefault();
    setAddingScore(true);
    try {
      await api.post('/scores', { score: parseInt(newScore.score), played_at: newScore.played_at });
      toast.success('Score added');
      setNewScore({ score: '', played_at: '' });
      const r = await api.get('/scores');
      setScores(r.data);
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed');
    } finally { setAddingScore(false); }
  };

  const deleteScore = async (id) => {
    try {
      await api.delete(`/scores/${id}`);
      setScores(scores.filter(s => s.id !== id));
      toast.success('Score removed');
    } catch { toast.error('Failed'); }
  };

  const handleSubscribe = async (plan) => {
    try {
      const { data } = await api.post('/subscriptions/create-checkout', { plan });
      window.location.href = data.url;
    } catch { toast.error('Failed to start checkout'); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel subscription at end of billing period?')) return;
    try {
      await api.post('/subscriptions/cancel');
      toast.success('Subscription will cancel at period end');
      loadData();
    } catch { toast.error('Failed'); }
  };

  const handleBillingPortal = async () => {
    try {
      const { data } = await api.get('/subscriptions/portal');
      window.location.href = data.url;
    } catch { toast.error('Failed'); }
  };

  const submitProof = async (e, drawId) => {
    e.preventDefault();
    if (!proofUrl) { toast.error('Enter a proof URL'); return; }
    setUploadingProof(drawId);
    try {
      await api.post(`/draws/${drawId}/proof`, { proof_url: proofUrl });
      toast.success('Proof submitted for review');
      setProofUrl('');
      setUploadingProof(null);
      const r = await api.get('/draws/my-winnings');
      setWinnings(r.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit proof');
      setUploadingProof(null);
    }
  };

  const isActive = sub?.status === 'active';
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : null;
  const totalWon = winnings.reduce((a, w) => a + parseFloat(w.prize_amount || 0), 0);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '◈' },
    { id: 'scores', label: 'Scores', icon: '⛳' },
    { id: 'draws', label: 'Draws', icon: '🎯' },
    { id: 'winnings', label: 'Winnings', icon: '🏆', badge: winnings.filter(w => w.payment_status === 'pending').length },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex w-60 flex-col bg-gray-900/50 border-r border-gray-800/60 px-4 py-6 fixed h-full">
          <Link href="/" className="text-brand-400 font-bold text-lg tracking-tight px-2 mb-8 block">GP MEMBERSHIP OS</Link>
          <nav className="flex-1 space-y-1">
            {tabs.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === item.id ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20' : 'text-gray-400 hover:text-white hover:bg-gray-800/60'}`}>
                <span className="flex items-center gap-2.5"><span>{item.icon}</span>{item.label}</span>
                {item.badge > 0 && <span className="bg-brand-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{item.badge}</span>}
              </button>
            ))}
            <Link href="/charities" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all">
              <span>❤️</span>Charities
            </Link>
            {user?.role === 'admin' && (
              <Link href="/admin" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-yellow-400 hover:bg-yellow-500/10 transition-all">
                <span>⚙️</span>Admin Panel
              </Link>
            )}
          </nav>
          <div className="border-t border-gray-800 pt-4 mt-4">
            <div className="px-3 mb-3">
              <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-gray-500 text-xs truncate">{user?.email}</p>
            </div>
            <button onClick={() => { logout(); router.push('/'); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <span>→</span>Sign out
            </button>
          </div>
        </aside>

        {/* Mobile nav */}
        <div className="md:hidden border-b border-gray-800 px-4 py-3 flex items-center justify-between w-full fixed top-0 bg-gray-950 z-10">
          <Link href="/" className="text-brand-400 font-bold tracking-tight">GP MEMBERSHIP OS</Link>
          <button onClick={() => { logout(); router.push('/'); }} className="text-gray-500 text-sm">Sign out</button>
        </div>

        {/* Content */}
        <div className="flex-1 md:ml-60 px-6 py-8 pt-20 md:pt-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold">
                {tab === 'overview' ? `Welcome back, ${user?.full_name?.split(' ')[0]}` :
                 tab === 'scores' ? 'My Scores' :
                 tab === 'draws' ? 'Draw History' : 'My Winnings'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {tab === 'overview' ? 'Your platform summary' :
                 tab === 'scores' ? 'Manage your Stableford scores' :
                 tab === 'draws' ? 'Published monthly draws' : 'Your prize winnings and payment status'}
              </p>
            </div>

            {/* Mobile tabs */}
            <div className="md:hidden flex gap-1 bg-gray-900 rounded-xl p-1 mb-6 overflow-x-auto">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-gray-800 text-white' : 'text-gray-500'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div className="space-y-5">
                {!isActive && (
                  <div className="bg-gradient-to-r from-brand-500/10 to-transparent border border-brand-500/20 rounded-2xl p-6">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div>
                        <p className="text-brand-400 font-semibold mb-1">No active subscription</p>
                        <p className="text-gray-400 text-sm">Subscribe to enter draws and track your scores.</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleSubscribe('monthly')} className="btn-secondary text-sm px-4 py-2">$29.99/mo</button>
                        <button onClick={() => handleSubscribe('yearly')} className="btn-primary text-sm px-4 py-2">$299.99/yr</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="stat-card"><div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isActive ? 'text-brand-400' : 'text-gray-500'}`}>Subscription</div><div className="text-xl font-bold capitalize">{sub?.status || 'None'}</div><div className="text-gray-500 text-xs mt-1 capitalize">{sub?.plan || '—'}</div></div>
                  <div className="stat-card"><div className="text-xs font-semibold uppercase tracking-wider mb-2 text-gray-500">Scores</div><div className="text-xl font-bold">{scores.length}<span className="text-gray-600 text-sm">/5</span></div><div className="text-gray-500 text-xs mt-1">Logged</div></div>
                  <div className="stat-card"><div className="text-xs font-semibold uppercase tracking-wider mb-2 text-gray-500">Avg Score</div><div className="text-xl font-bold text-brand-400">{avgScore ?? '—'}</div><div className="text-gray-500 text-xs mt-1">Stableford</div></div>
                  <div className="stat-card"><div className="text-xs font-semibold uppercase tracking-wider mb-2 text-gray-500">Total Won</div><div className="text-xl font-bold text-brand-400">{totalWon > 0 ? `$${totalWon.toFixed(2)}` : '—'}</div><div className="text-gray-500 text-xs mt-1">{winnings.length} prizes</div></div>
                </div>

                {isActive && (
                  <div className="card">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Subscription</p>
                        <div className="flex items-center gap-2">
                          <span className="badge-active">Active</span>
                          <span className="text-gray-300 text-sm capitalize">{sub?.plan} plan</span>
                        </div>
                        {sub?.current_period_end && <p className="text-gray-500 text-xs mt-1.5">Renews {new Date(sub.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleBillingPortal} className="btn-secondary text-sm px-4 py-2">Manage billing</button>
                        <button onClick={handleCancel} className="text-sm px-4 py-2 border border-red-900/60 text-red-400 hover:bg-red-900/20 rounded-xl transition-all">Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="card">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Your charity</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{user?.charity_name || 'Not selected'}</p>
                      <p className="text-gray-400 text-sm mt-1">Contributing <span className="text-brand-400 font-semibold">{user?.charity_contribution_percent}%</span> of your subscription</p>
                    </div>
                    <Link href="/charities" className="text-brand-400 text-sm hover:underline">Browse charities →</Link>
                  </div>
                </div>

                {draws[0] && (
                  <div className="card">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Latest draw</p>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <p className="font-semibold">{new Date(draws[0].draw_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
                        <p className="text-gray-500 text-sm mt-0.5">Prize pool: ${draws[0].prize_pool?.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-2">
                        {draws[0].winning_numbers?.map(n => (
                          <div key={n} className="w-9 h-9 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-sm">{n}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SCORES */}
            {tab === 'scores' && (
              <div className="space-y-5">
                {!isActive ? (
                  <div className="card text-center py-12">
                    <div className="text-4xl mb-4">⛳</div>
                    <p className="text-white font-semibold mb-2">Subscription required</p>
                    <p className="text-gray-400 text-sm mb-6">Subscribe to log scores and enter draws.</p>
                    <div className="flex gap-3 justify-center">
                      <button onClick={() => handleSubscribe('monthly')} className="btn-secondary">Monthly $29.99</button>
                      <button onClick={() => handleSubscribe('yearly')} className="btn-primary">Yearly $299.99</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="card">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Add a score</p>
                      <form onSubmit={addScore} className="flex gap-3 flex-wrap items-end">
                        <div className="flex-1 min-w-28">
                          <label className="block text-xs font-medium text-gray-400 mb-2">Score (1-45)</label>
                          <input type="number" min={1} max={45} className="input" placeholder="e.g. 32" value={newScore.score} onChange={e => setNewScore({...newScore, score: e.target.value})} required />
                        </div>
                        <div className="flex-1 min-w-36">
                          <label className="block text-xs font-medium text-gray-400 mb-2">Date played</label>
                          <input type="date" className="input" value={newScore.played_at} onChange={e => setNewScore({...newScore, played_at: e.target.value})} required />
                        </div>
                        <button type="submit" className="btn-primary px-6" disabled={addingScore}>{addingScore ? '...' : 'Add score'}</button>
                      </form>
                      <p className="text-gray-600 text-xs mt-3">Up to 5 scores. Adding a 6th replaces the oldest.</p>
                    </div>
                    <div className="card">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Your scores</p>
                        <span className="badge-inactive">{scores.length} / 5</span>
                      </div>
                      {scores.length === 0 ? (
                        <div className="text-center py-10"><div className="text-3xl mb-3">⛳</div><p className="text-gray-400 text-sm">No scores yet.</p></div>
                      ) : (
                        <div className="space-y-2">
                          {scores.map((s, i) => (
                            <div key={s.id} className="flex items-center justify-between bg-gray-800/60 hover:bg-gray-800 rounded-xl px-4 py-3.5 transition-all group">
                              <div className="flex items-center gap-4">
                                <span className="text-gray-600 text-xs w-4 text-center">{i + 1}</span>
                                <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center">
                                  <span className="text-brand-400 font-bold">{s.score}</span>
                                </div>
                                <div>
                                  <p className="text-white font-medium text-sm">{s.score} pts</p>
                                  <p className="text-gray-500 text-xs">{new Date(s.played_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                </div>
                              </div>
                              <button onClick={() => deleteScore(s.id)} className="text-gray-700 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all px-2 py-1 rounded-lg hover:bg-red-500/10">Remove</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* DRAWS */}
            {tab === 'draws' && (
              <div className="space-y-4">
                {draws.length === 0 ? (
                  <div className="card text-center py-12"><div className="text-3xl mb-3">🎯</div><p className="text-gray-400 text-sm">No draws published yet.</p></div>
                ) : draws.map(d => (
                  <div key={d.id} className="card hover:border-gray-700 transition-all">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div>
                        <p className="font-semibold text-white">{new Date(d.draw_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} Draw</p>
                        <p className="text-gray-500 text-sm mt-0.5">Prize pool: <span className="text-white font-medium">${d.prize_pool?.toFixed(2)}</span></p>
                      </div>
                      <span className="badge-active">Published</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {d.winning_numbers?.map(n => (
                        <div key={n} className="w-10 h-10 rounded-full bg-brand-500/15 border border-brand-500/25 flex items-center justify-center text-brand-400 font-bold text-sm">{n}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* WINNINGS */}
            {tab === 'winnings' && (
              <div className="space-y-4">
                {winnings.length === 0 ? (
                  <div className="card text-center py-12">
                    <div className="text-3xl mb-3">🏆</div>
                    <p className="text-white font-semibold mb-2">No winnings yet</p>
                    <p className="text-gray-400 text-sm">Keep entering draws — your time will come!</p>
                  </div>
                ) : (
                  <>
                    <div className="card">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total won</p>
                      <p className="text-3xl font-bold text-brand-400">${totalWon.toFixed(2)}</p>
                    </div>
                    {winnings.map(w => (
                      <div key={w.id} className="card">
                        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="badge-active">{w.match_count}-Number Match</span>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                w.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                w.payment_status === 'approved' ? 'badge-warning' :
                                w.payment_status === 'rejected' ? 'badge-danger' : 'badge-inactive'
                              }`}>{w.payment_status}</span>
                            </div>
                            <p className="text-2xl font-bold text-brand-400">${parseFloat(w.prize_amount).toFixed(2)}</p>
                            <p className="text-gray-500 text-xs mt-1">{new Date(w.draw_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {w.winning_numbers?.map(n => (
                              <div key={n} className="w-8 h-8 rounded-full bg-brand-500/15 border border-brand-500/25 flex items-center justify-center text-brand-400 font-bold text-xs">{n}</div>
                            ))}
                          </div>
                        </div>

                        {w.payment_status === 'rejected' && w.rejection_reason && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                            <p className="text-red-400 text-sm">Rejected: {w.rejection_reason}</p>
                          </div>
                        )}

                        {(w.payment_status === 'pending' || w.payment_status === 'rejected') && !w.proof_url && (
                          <div className="border-t border-gray-800 pt-4">
                            <p className="text-sm font-medium text-white mb-2">Upload proof of scores</p>
                            <p className="text-gray-500 text-xs mb-3">Submit a screenshot URL from your golf platform to verify your win.</p>
                            <form onSubmit={e => submitProof(e, w.draw_id || w.id)} className="flex gap-2">
                              <input
                                className="input flex-1 text-sm py-2"
                                placeholder="https://... (screenshot URL)"
                                value={uploadingProof === (w.draw_id || w.id) ? proofUrl : ''}
                                onChange={e => { setProofUrl(e.target.value); setUploadingProof(w.draw_id || w.id); }}
                                required
                              />
                              <button type="submit" className="btn-primary px-4 py-2 text-sm" disabled={uploadingProof === (w.draw_id || w.id) && !proofUrl}>
                                Submit
                              </button>
                            </form>
                          </div>
                        )}

                        {w.proof_url && (
                          <div className="border-t border-gray-800 pt-4 flex items-center justify-between">
                            <p className="text-gray-500 text-sm">Proof submitted</p>
                            <a href={w.proof_url} target="_blank" rel="noreferrer" className="text-brand-400 text-sm hover:underline">View proof →</a>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
