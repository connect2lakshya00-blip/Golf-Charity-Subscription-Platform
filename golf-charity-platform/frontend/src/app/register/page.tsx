'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState(1);
  const [charities, setCharities] = useState([]);
  const [charityError, setCharityError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    charity_id: '', charity_contribution_percent: 10,
  });

  useEffect(() => {
    api.get('/charities')
      .then(r => { setCharities(r.data); setCharityError(false); })
      .catch(() => setCharityError(true));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    if (!form.charity_id) { toast.error('Please select a charity'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', form);
      setAuth(data.token, data.user);
      toast.success('Account created!');
      router.push('/pricing');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const monthlyAmount = (29.99 * form.charity_contribution_percent / 100).toFixed(2);

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-brand-400 font-bold text-xl">GP MEMBERSHIP OS</Link>
          <h1 className="text-3xl font-bold mt-4 mb-1">
            {step === 1 ? 'Create account' : 'Choose charity'}
          </h1>
          <p className="text-gray-400 text-sm">Step {step} of 2</p>
        </div>

        <div className="flex gap-2 mb-6">
          {[1, 2].map(s => (
            <div key={s} className={s <= step ? 'h-1 flex-1 rounded-full bg-brand-500' : 'h-1 flex-1 rounded-full bg-gray-800'} />
          ))}
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Full name</label>
                  <input className="input" placeholder="Your name" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email</label>
                  <input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Password</label>
                  <input type="password" className="input" placeholder="Min 8 chars" value={form.password} onChange={e => setForm({...form, password: e.target.value})} minLength={8} required />
                </div>
                <button type="submit" className="btn-primary w-full">Continue</button>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Select a charity</label>
                  {charityError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-2 text-center">
                      <p className="text-red-400 text-sm">Could not load charities</p>
                    </div>
                  )}
                  {!charityError && charities.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">Loading...</p>
                  )}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {charities.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setForm({...form, charity_id: c.id})}
                        className={form.charity_id === c.id ? 'w-full text-left p-3 rounded-xl border border-brand-500 bg-brand-500/10' : 'w-full text-left p-3 rounded-xl border border-gray-700 bg-gray-800 hover:border-gray-600'}
                      >
                        <span className="font-medium text-sm">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-3">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-400">Contribution</span>
                    <span className="text-brand-400 font-bold">{form.charity_contribution_percent}%</span>
                  </div>
                  <input type="range" min={10} max={100} step={5} value={form.charity_contribution_percent} onChange={e => setForm({...form, charity_contribution_percent: parseInt(e.target.value)})} className="w-full accent-brand-500" />
                  <p className="text-gray-500 text-xs mt-1">${monthlyAmount}/mo to charity</p>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                  <button type="submit" className="btn-primary flex-1" disabled={loading || !form.charity_id}>
                    {loading ? 'Creating...' : 'Create account'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-400">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
