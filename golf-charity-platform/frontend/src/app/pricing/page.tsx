'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const features = [
  'Monthly draw entry',
  'Stableford score tracking (5 scores)',
  'Charity contribution of your choice',
  'Prize pool access (3/4/5-match tiers)',
  'Winner verification & payout system',
];

export default function PricingPage() {
  const router = useRouter();
  const { user, fetchMe } = useAuthStore();
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, []);

  const subscribe = async (plan, trial = false) => {
    if (!user) { router.push('/register'); return; }
    setLoading(trial ? 'trial' : plan);
    try {
      const { data } = await api.post('/subscriptions/create-checkout', { plan, trial });

      const options = {
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
        name: 'GP Membership OS',
        description: data.planName,
        prefill: { name: user.full_name, email: user.email },
        theme: { color: '#22c55e' },
        handler: async (response) => {
          try {
            await api.post('/subscriptions/verify', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              plan,
              trial,
            });
            await fetchMe();
            toast.success(trial ? '7-day trial started!' : 'Subscription activated!');
            router.push('/dashboard?subscription=success');
          } catch {
            toast.error('Payment verification failed. Contact support.');
          }
        },
        modal: { ondismiss: () => setLoading(null) },
      };

      if (typeof window !== 'undefined' && window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp) => {
          toast.error('Payment failed: ' + resp.error.description);
          setLoading(null);
        });
        rzp.open();
      } else {
        toast.error('Payment gateway not loaded. Please refresh.');
        setLoading(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start checkout');
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800/60 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-brand-400 font-bold text-lg tracking-tight">GP MEMBERSHIP OS</Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="btn-secondary text-sm px-4 py-2">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="nav-link">Sign in</Link>
                <Link href="/register" className="btn-primary text-sm px-4 py-2">Get started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="section-label mb-4">Pricing</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Every plan includes full platform access. Payments in INR via UPI, cards, and NetBanking.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-gray-500 text-sm">Powered by</span>
            <span className="text-blue-400 font-semibold text-sm">Razorpay</span>
            <span className="badge-inactive text-xs">UPI · Cards · NetBanking · Wallets</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {/* Free Trial */}
          <div className="card flex flex-col border-gray-700">
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 bg-yellow-500/15 border border-yellow-500/30 rounded-full px-3 py-1 mb-3">
                <span className="text-yellow-400 text-xs font-bold">7 DAYS FREE</span>
              </div>
              <p className="section-label mb-3">Free Trial</p>
              <div className="flex items-end gap-1">
                <span className="text-5xl font-bold">₹0</span>
                <span className="text-gray-500 mb-1 ml-1">/ 7 days</span>
              </div>
              <p className="text-gray-500 text-sm mt-2">Then ₹2,499/mo. Card required.</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {['Full platform access', 'Enter the next monthly draw', 'Score tracking (5 scores)', 'Charity contribution active', 'Cancel before trial ends — no charge'].map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                  <span className="text-yellow-400 mt-0.5 flex-shrink-0">+</span>{f}
                </li>
              ))}
            </ul>
            <button onClick={() => subscribe('monthly', true)} disabled={loading === 'trial'}
              className="w-full py-3.5 rounded-xl font-semibold text-white border border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20 transition-all disabled:opacity-50">
              {loading === 'trial' ? 'Opening Razorpay...' : 'Start free trial'}
            </button>
          </div>

          {/* Monthly */}
          <div className="card flex flex-col">
            <div className="mb-6">
              <p className="section-label mb-3">Monthly</p>
              <div className="flex items-end gap-1">
                <span className="text-5xl font-bold">₹1</span>
                <span className="text-gray-500 mb-1 ml-1">/month</span>
              </div>
              <p className="text-gray-500 text-sm mt-2">Billed monthly. Cancel anytime.</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {features.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                  <span className="text-brand-400 mt-0.5 flex-shrink-0">+</span>{f}
                </li>
              ))}
            </ul>
            <button onClick={() => subscribe('monthly')} disabled={loading === 'monthly'}
              className="btn-secondary w-full py-3.5 disabled:opacity-50">
              {loading === 'monthly' ? 'Opening Razorpay...' : 'Start monthly plan'}
            </button>
          </div>

          {/* Yearly */}
          <div className="relative card flex flex-col border-brand-500/40 glow-brand">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-brand-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-brand-500/30">
                BEST VALUE — SAVE 5,000
              </span>
            </div>
            <div className="mb-6">
              <p className="section-label mb-3">Yearly</p>
              <div className="flex items-end gap-1">
                <span className="text-5xl font-bold text-brand-400">₹24,999</span>
                <span className="text-gray-500 mb-1 ml-1">/year</span>
              </div>
              <p className="text-gray-500 text-sm mt-2">~₹2,083/mo · 2 months free.</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[...features, 'Priority support'].map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                  <span className="text-brand-400 mt-0.5 flex-shrink-0">+</span>{f}
                </li>
              ))}
            </ul>
            <button onClick={() => subscribe('yearly')} disabled={loading === 'yearly'}
              className="btn-primary w-full py-3.5 disabled:opacity-50">
              {loading === 'yearly' ? 'Opening Razorpay...' : 'Start yearly plan'}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {[
            { q: 'How does the free trial work?', a: '7 days full access. A small authorization charge is made but refunded. Cancel before trial ends to avoid billing.' },
            { q: 'Can I cancel anytime?', a: 'Yes. Monthly plans cancel at the end of the billing period. No questions asked.' },
            { q: 'What payment methods are accepted?', a: 'UPI, credit/debit cards, NetBanking, and wallets via Razorpay.' },
            { q: 'When are draws run?', a: 'Once per month. Admins publish results and winners are notified directly.' },
          ].map(item => (
            <div key={item.q} className="card text-left">
              <p className="text-white font-semibold text-sm mb-2">{item.q}</p>
              <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
