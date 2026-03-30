'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface Analytics { users: any; subscriptions: any; draws: any; revenue: any; }
interface User { id: string; email: string; full_name: string; role: string; is_active: boolean; subscription_status: string; subscription_plan: string; charity_name: string; }
interface Winner { id: string; full_name: string; email: string; match_count: number; prize_amount: number; payment_status: string; draw_date: string; proof_url: string; }
interface Charity { id: string; name: string; description: string; website: string; is_active: boolean; }

export default function AdminPage() {
  const router = useRouter();
  const { user, fetchMe, logout } = useAuthStore();
  const [tab, setTab] = useState<'analytics' | 'users' | 'draws' | 'winners' | 'charities'>('analytics');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [search, setSearch] = useState('');
  const [drawLoading, setDrawLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [newCharity, setNewCharity] = useState({ name: '', description: '', website: '' });
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [aRes, uRes, wRes, cRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/users'),
        api.get('/admin/winners'),
        api.get('/charities'),
      ]);
      setAnalytics(aRes.data);
      setUsers(uRes.data.users);
      setWinners(wRes.data);
      setCharities(cRes.data);
    } catch { toast.error('Failed to load admin data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    fetchMe().then(() => {
      const u = useAuthStore.getState().user;
      if (u && u.role !== 'admin') { router.push('/dashboard'); return; }
      loadAll();
    });
  }, [fetchMe, loadAll, router]);

  const loadUsers = useCallback(async () => {
    const r = await api.get(`/admin/users?search=${search}`);
    setUsers(r.data.users);
  }, [search]);

  useEffect(() => { if (tab === 'users') loadUsers(); }, [search, tab, loadUsers]);

  const runDraw = async () => {
    if (!confirm('Run the official monthly draw? This cannot be undone.')) return;
    setDrawLoading(true);
    try {
      const { data } = await api.post('/draws/run');
      toast.success(`Draw complete! Jackpot ${data.jackpotRolledOver ? 'rolled over' : 'won'}`);
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Draw failed');
    } finally { setDrawLoading(false); }
  };

  const simulateDraw = async () => {
    setDrawLoading(true);
    try {
      const { data } = await api.post('/draws/simulate');
      setSimResult(data);
      toast.success('Simulation complete');
    } catch { toast.error('Simulation failed'); }
    finally { setDrawLoading(false); }
  };

  const updateWinner = async (id: string, action: 'approve' | 'reject' | 'paid') => {
    try {
      await api.put(`/admin/winners/${id}/${action}`);
      toast.success(action === 'paid' ? 'Marked as paid' : action === 'approve' ? 'Approved' : 'Rejected');
      const r = await api.get('/admin/winners');
      setWinners(r.data);
    } catch { toast.error('Action failed'); }
  };

  const toggleUser = async (id: string, is_active: boolean) => {
    try {
      await api.put(`/admin/users/${id}`, { is_active: !is_active });
      toast.success(is_active ? 'User deactivated' : 'User activated');
      loadUsers();
    } catch { toast.error('Failed'); }
  };

  const createCharity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/charities', newCharity);
      toast.success('Charity created');
      setNewCharity({ name: '', description: '', website: '' });
      const r = await api.get('/charities');
      setCharities(r.data);
    } catch { toast.error('Failed to create charity'); }
  };

  const deleteCharity = async (id: string) => {
    if (!confirm('Deactivate this charity?')) return;
    try {
      await api.delete(`/charities/${id}`);
      toast.success('Charity deactivated');
      const r = await api.get('/charities');
      setCharities(r.data);
    } catch { toast.error('Failed'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
        <p className="text-gray-500 text-sm">Loading admin panel...</p>
      </div>
    </div>
  );

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'draws', label: 'Draws', icon: '🎯' },
    { id: 'winners', label: 'Winners', icon: '🏆', badge: winners.length },
    { id: 'charities', label: 'Charities', icon: '❤️' },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex w-60 flex-col bg-gray-900/50 border-r border-gray-800/60 px-4 py-6 fixed h-full">
          <Link href="/" className="text-brand-400 font-bold text-lg tracking-tight px-2 mb-2 block">GP MEMBERSHIP OS</Link>
          <span className="badge-warning text-xs px-2 mb-6 w-fit">Admin Panel</span>
          <nav className="flex-1 space-y-1">
            {tabs.map(item => (
              <button key={item.id} onClick={() => setTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === item.id ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20' : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}>
                <span className="flex items-center gap-2.5"><span>{item.icon}</span>{item.label}</span>
                {item.badge ? <span className="bg-brand-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{item.badge}</span> : null}
              </button>
            ))}
            <Link href="/dashboard" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800/60 transition-all">
              <span>←</span>User Dashboard
            </Link>
          </nav>
          <div className="border-t border-gray-800 pt-4 mt-4">
            <div className="px-3 mb-3">
              <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-gray-500 text-xs">Administrator</p>
            </div>
            <button onClick={() => { logout(); router.push('/'); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <span>→</span>Sign out
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 md:ml-60 px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold capitalize">{tab}</h1>
              <p className="text-gray-500 text-sm mt-1">
                {tab === 'analytics' ? 'Platform overview and key metrics' :
                 tab === 'users' ? 'Manage registered users and subscriptions' :
                 tab === 'draws' ? 'Run, simulate and publish monthly draws' :
                 tab === 'winners' ? 'Verify winner submissions and process payouts' :
                 'Manage charity listings'}
              </p>
            </div>

            {/* Mobile tabs */}
            <div className="md:hidden flex gap-1 bg-gray-900 rounded-xl p-1 mb-6 overflow-x-auto">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id as any)}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-gray-800 text-white' : 'text-gray-500'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ANALYTICS */}
            {tab === 'analytics' && analytics && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total users', value: analytics.users.total, sub: `${analytics.users.new_this_month} new this month`, color: 'text-white' },
                    { label: 'Active subscribers', value: analytics.subscriptions.active, sub: `${analytics.subscriptions.monthly} monthly · ${analytics.subscriptions.yearly} yearly`, color: 'text-brand-400' },
                    { label: 'Monthly revenue', value: `$${parseFloat(analytics.revenue.mrr).toFixed(0)}`, sub: 'MRR from active subs', color: 'text-brand-400' },
                    { label: 'Draws published', value: analytics.draws.published, sub: `${analytics.draws.total} total runs`, color: 'text-white' },
                  ].map(s => (
                    <div key={s.label} className="stat-card text-left">
                      <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{s.label}</p>
                      <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-gray-600 text-xs mt-1">{s.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="card">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">User breakdown</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Total registered', val: analytics.users.total },
                        { label: 'Active accounts', val: analytics.users.active },
                        { label: 'New this month', val: analytics.users.new_this_month, highlight: true },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">{r.label}</span>
                          <span className={`font-semibold text-sm ${r.highlight ? 'text-brand-400' : 'text-white'}`}>{r.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Subscriptions</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Active', val: analytics.subscriptions.active, highlight: true },
                        { label: 'Cancelled', val: analytics.subscriptions.cancelled },
                        { label: 'Expired', val: analytics.subscriptions.expired },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">{r.label}</span>
                          <span className={`font-semibold text-sm ${r.highlight ? 'text-brand-400' : 'text-white'}`}>{r.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Draw stats</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Total draws run', val: analytics.draws.total },
                        { label: 'Published', val: analytics.draws.published, highlight: true },
                        { label: 'Pending winners', val: winners.length },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">{r.label}</span>
                          <span className={`font-semibold text-sm ${r.highlight ? 'text-brand-400' : 'text-white'}`}>{r.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* USERS */}
            {tab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input className="input max-w-xs" placeholder="Search by name or email..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                  <span className="text-gray-500 text-sm">{users.length} users</span>
                </div>
                <div className="card overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="table-header pl-6">User</th>
                        <th className="table-header">Subscription</th>
                        <th className="table-header">Charity</th>
                        <th className="table-header">Status</th>
                        <th className="table-header pr-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="table-cell pl-6">
                            <p className="font-medium text-white">{u.full_name}</p>
                            <p className="text-gray-500 text-xs">{u.email}</p>
                            {u.role === 'admin' && <span className="badge-warning mt-1 inline-block">admin</span>}
                          </td>
                          <td className="table-cell">
                            <span className={u.subscription_status === 'active' ? 'badge-active' : 'badge-inactive'}>
                              {u.subscription_status || 'none'}
                            </span>
                            {u.subscription_plan && <p className="text-gray-600 text-xs mt-1 capitalize">{u.subscription_plan}</p>}
                          </td>
                          <td className="table-cell text-gray-400 text-xs">{u.charity_name || '—'}</td>
                          <td className="table-cell">
                            <span className={u.is_active ? 'badge-active' : 'badge-danger'}>{u.is_active ? 'Active' : 'Inactive'}</span>
                          </td>
                          <td className="table-cell pr-6">
                            <button onClick={() => toggleUser(u.id, u.is_active)}
                              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                                u.is_active ? 'border-red-900/60 text-red-400 hover:bg-red-900/20' : 'border-brand-900/60 text-brand-400 hover:bg-brand-900/20'
                              }`}>
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DRAWS */}
            {tab === 'draws' && (
              <div className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="card">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center text-xl">🎯</div>
                      <div>
                        <p className="font-semibold text-white">Run monthly draw</p>
                        <p className="text-gray-500 text-sm">Executes the official draw and records all winners.</p>
                      </div>
                    </div>
                    <button onClick={runDraw} disabled={drawLoading} className="btn-primary w-full">
                      {drawLoading ? 'Running draw...' : 'Run official draw'}
                    </button>
                  </div>
                  <div className="card">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl">🔬</div>
                      <div>
                        <p className="font-semibold text-white">Simulate draw</p>
                        <p className="text-gray-500 text-sm">Preview results without saving. Safe to run anytime.</p>
                      </div>
                    </div>
                    <button onClick={simulateDraw} disabled={drawLoading} className="btn-secondary w-full">
                      {drawLoading ? 'Simulating...' : 'Run simulation'}
                    </button>
                  </div>
                </div>

                {simResult && (
                  <div className="card border-brand-500/20 bg-brand-500/5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-brand-400 font-semibold">Simulation result</p>
                      <span className="badge-active">Simulation only</span>
                    </div>
                    <div className="flex gap-2 mb-5">
                      {simResult.winningNumbers.map((n: number) => (
                        <div key={n} className="w-11 h-11 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold">{n}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { label: '5-match (Jackpot)', val: simResult.winnerCounts.fiveMatch, prize: simResult.prizes.fiveMatch },
                        { label: '4-match', val: simResult.winnerCounts.fourMatch, prize: simResult.prizes.fourMatch },
                        { label: '3-match', val: simResult.winnerCounts.threeMatch, prize: simResult.prizes.threeMatch },
                      ].map(t => (
                        <div key={t.label} className="bg-gray-800/60 rounded-xl p-3 text-center">
                          <div className="text-2xl font-bold text-white">{t.val}</div>
                          <div className="text-gray-500 text-xs mt-0.5">{t.label}</div>
                          {t.val > 0 && <div className="text-brand-400 text-xs mt-1">${t.prize?.toFixed(2)} each</div>}
                        </div>
                      ))}
                    </div>
                    <p className="text-gray-500 text-sm">Estimated prize pool: <span className="text-white font-medium">${simResult.estimatedPrizePool?.toFixed(2)}</span></p>
                  </div>
                )}
              </div>
            )}

            {/* WINNERS */}
            {tab === 'winners' && (
              <div className="card overflow-x-auto p-0">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                  <p className="font-semibold">Pending winners</p>
                  <span className="badge-warning">{winners.length} pending</span>
                </div>
                {winners.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-3xl mb-3">🏆</div>
                    <p className="text-gray-400 text-sm">No pending winners to review.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="table-header pl-6">Winner</th>
                        <th className="table-header">Match</th>
                        <th className="table-header">Prize</th>
                        <th className="table-header">Status</th>
                        <th className="table-header">Proof</th>
                        <th className="table-header pr-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {winners.map(w => (
                        <tr key={w.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="table-cell pl-6">
                            <p className="font-medium text-white">{w.full_name}</p>
                            <p className="text-gray-500 text-xs">{w.email}</p>
                          </td>
                          <td className="table-cell"><span className="badge-active">{w.match_count}-match</span></td>
                          <td className="table-cell font-bold text-brand-400">${w.prize_amount?.toFixed(2)}</td>
                          <td className="table-cell">
                            <span className={`${w.payment_status === 'paid' ? 'badge-active' : w.payment_status === 'approved' ? 'badge-warning' : 'badge-inactive'}`}>
                              {w.payment_status}
                            </span>
                          </td>
                          <td className="table-cell">
                            {w.proof_url
                              ? <a href={w.proof_url} target="_blank" rel="noreferrer" className="text-brand-400 text-xs hover:underline">View →</a>
                              : <span className="text-gray-600 text-xs">None</span>}
                          </td>
                          <td className="table-cell pr-6">
                            <div className="flex gap-1.5">
                              {w.payment_status !== 'paid' && w.payment_status !== 'approved' && (
                                <button onClick={() => updateWinner(w.id, 'approve')} className="text-xs px-2.5 py-1.5 bg-brand-500/15 text-brand-400 rounded-lg hover:bg-brand-500/25 transition-all">Approve</button>
                              )}
                              {w.payment_status === 'approved' && (
                                <button onClick={() => updateWinner(w.id, 'paid')} className="text-xs px-2.5 py-1.5 bg-green-500/15 text-green-400 rounded-lg hover:bg-green-500/25 transition-all">Mark paid</button>
                              )}
                              {w.payment_status !== 'paid' && (
                                <button onClick={() => updateWinner(w.id, 'reject')} className="text-xs px-2.5 py-1.5 bg-red-500/15 text-red-400 rounded-lg hover:bg-red-500/25 transition-all">Reject</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* CHARITIES */}
            {tab === 'charities' && (
              <div className="space-y-5">
                <div className="card">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Add new charity</p>
                  <form onSubmit={createCharity} className="space-y-3">
                    <input className="input" placeholder="Charity name *" value={newCharity.name}
                      onChange={e => setNewCharity({ ...newCharity, name: e.target.value })} required />
                    <input className="input" placeholder="Short description" value={newCharity.description}
                      onChange={e => setNewCharity({ ...newCharity, description: e.target.value })} />
                    <input className="input" placeholder="Website URL (https://...)" value={newCharity.website}
                      onChange={e => setNewCharity({ ...newCharity, website: e.target.value })} />
                    <button type="submit" className="btn-primary">Add charity</button>
                  </form>
                </div>

                <div className="card overflow-x-auto p-0">
                  <div className="px-6 py-4 border-b border-gray-800">
                    <p className="font-semibold">All charities <span className="text-gray-500 font-normal text-sm">({charities.length})</span></p>
                  </div>
                  <div className="divide-y divide-gray-800/50">
                    {charities.map(c => (
                      <div key={c.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-800/30 transition-colors">
                        <div>
                          <p className="font-medium text-white text-sm">{c.name}</p>
                          {c.description && <p className="text-gray-500 text-xs mt-0.5">{c.description}</p>}
                          {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="text-brand-400 text-xs hover:underline mt-0.5 block">{c.website}</a>}
                        </div>
                        <button onClick={() => deleteCharity(c.id)}
                          className="text-xs px-3 py-1.5 border border-red-900/60 text-red-400 hover:bg-red-900/20 rounded-lg transition-all flex-shrink-0 ml-4">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
