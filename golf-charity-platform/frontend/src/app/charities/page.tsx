'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface Charity {
  id: string;
  name: string;
  description: string;
  website: string;
  total_raised: string;
  supporter_count?: number;
}

export default function CharitiesPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [charities, setCharities] = useState<Charity[]>([]);
  const [filtered, setFiltered] = useState<Charity[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [donating, setDonating] = useState<string | null>(null);
  const [donateForm, setDonateForm] = useState({ charityId: '', amount: '' });

  useEffect(() => {
    api.get('/charities').then(r => {
      setCharities(r.data);
      setFiltered(r.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(charities.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)));
  }, [search, charities]);

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donateForm.amount || parseFloat(donateForm.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    setDonating(donateForm.charityId);
    try {
      await api.post(`/charities/${donateForm.charityId}/donate`, { amount: parseFloat(donateForm.amount) });
      toast.success(`Donation of $${donateForm.amount} recorded!`);
      setDonateForm({ charityId: '', amount: '' });
      const r = await api.get('/charities');
      setCharities(r.data);
    } catch { toast.error('Donation failed'); }
    finally { setDonating(null); }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800/60 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-brand-400 font-bold text-lg tracking-tight">GP MEMBERSHIP OS</Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard" className="nav-link">Dashboard</Link>
                <button onClick={() => { logout(); router.push('/'); }} className="nav-link">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="nav-link">Sign in</Link>
                <Link href="/register" className="btn-primary text-sm px-4 py-2">Get started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="section-label mb-3">Charity Directory</div>
          <h1 className="text-4xl font-bold mb-3">Every subscription gives back.</h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Browse our curated list of charities. Choose one when you subscribe, or make a one-off donation anytime — no subscription required.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            className="input max-w-md"
            placeholder="Search charities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-500">Loading charities...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(c => (
              <div key={c.id} className="card flex flex-col hover:border-gray-700 transition-all">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-lg">
                      {c.name[0]}
                    </div>
                    {parseFloat(c.total_raised) > 0 && (
                      <span className="badge-active">${parseFloat(c.total_raised).toFixed(0)} raised</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-white mb-2">{c.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-3">{c.description}</p>
                  {c.website && (
                    <a href={c.website} target="_blank" rel="noreferrer" className="text-brand-400 text-xs hover:underline">
                      {c.website.replace('https://', '')} →
                    </a>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-800">
                  {donateForm.charityId === c.id ? (
                    <form onSubmit={handleDonate} className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        className="input flex-1 py-2 text-sm"
                        placeholder="Amount ($)"
                        value={donateForm.amount}
                        onChange={e => setDonateForm({ ...donateForm, amount: e.target.value })}
                        autoFocus
                      />
                      <button type="submit" className="btn-primary px-4 py-2 text-sm" disabled={donating === c.id}>
                        {donating === c.id ? '...' : 'Donate'}
                      </button>
                      <button type="button" onClick={() => setDonateForm({ charityId: '', amount: '' })} className="btn-secondary px-3 py-2 text-sm">✕</button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setDonateForm({ charityId: c.id, amount: '' })}
                      className="btn-secondary w-full text-sm py-2"
                    >
                      ❤️ Donate now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-16">
            <p className="text-gray-500">No charities match your search.</p>
          </div>
        )}
      </div>
    </main>
  );
}
