'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

function useCountUp(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function CountdownTimer() {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const getNextDraw = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return next;
    };
    const tick = () => {
      const now = new Date();
      const diff = getNextDraw().getTime() - now.getTime();
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex gap-3 justify-center">
      {[['days', time.days], ['hrs', time.hours], ['min', time.minutes], ['sec', time.seconds]].map(([label, val]) => (
        <div key={label} className="card-glass text-center px-4 py-3 min-w-16">
          <div className="text-2xl font-bold text-brand-400 tabular-nums">{String(val).padStart(2,'0')}</div>
          <div className="text-gray-500 text-xs uppercase tracking-wider mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}

function StatsSection() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  
  
  
  
  return (
    <section ref={ref} className="max-w-4xl mx-auto px-6 pb-20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { val: '50%', label: 'Prize pool share' },
          { val: '10%+', label: 'Min charity cut' },
          { val: 'Monthly', label: 'Draw cadence' },
          { val: 'Yes', label: 'Jackpot rollover' },
        ].map(s => (
          <div key={s.label} className="card text-center hover:border-gray-700 transition-all duration-300 hover:-translate-y-0.5">
            <div className="text-3xl font-bold text-brand-400 mb-1">{s.val}</div>
            <div className="text-gray-500 text-xs uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState('checking');
  const [featuredCharity, setFeaturedCharity] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.ok ? setApiStatus('ok') : setApiStatus('error'))
      .catch(() => setApiStatus('error'));
    fetch('/api/charities')
      .then(r => r.json())
      .then(data => data.length > 0 && setFeaturedCharity(data[0]))
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-brand-500/3 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-[300px] h-[300px] bg-brand-500/3 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative border-b border-gray-800/60 px-6 py-4 backdrop-blur-sm bg-gray-950/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">GP</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">GP MEMBERSHIP OS</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/charities" className="nav-link">Charities</Link>
            <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
            <Link href="/pricing" className="nav-link">Pricing</Link>
          </div>
          <div className="flex gap-3">
            <Link href="/login" className="btn-secondary text-sm px-4 py-2">Sign in</Link>
            <Link href="/register" className="btn-primary text-sm px-4 py-2">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          <span className="text-brand-400 text-xs font-semibold tracking-wide">Golf · Charity · Monthly Draws</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
          Play golf.<br />
          <span className="gradient-text">Win prizes.</span><br />
          Give back.
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Subscribe, enter your Stableford scores, and compete in monthly draws. Part of every subscription goes straight to a charity you choose.
        </p>
        <div className="flex gap-4 justify-center flex-wrap mb-16">
          <Link href="/register" className="btn-primary text-base px-8 py-4">Start for free →</Link>
          <Link href="/pricing" className="btn-secondary text-base px-8 py-4">View pricing</Link>
        </div>

        {/* Next draw countdown */}
        <div className="max-w-md mx-auto">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Next draw in</p>
          <CountdownTimer />
        </div>
      </section>

      {/* Animated stats */}
      <StatsSection />

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <div className="section-label mb-3">How it works</div>
          <h2 className="text-3xl md:text-4xl font-bold">Four simple steps</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { num: '01', title: 'Subscribe', desc: 'Pick monthly or yearly. Part of every payment goes to your chosen charity.', icon: '💳' },
            { num: '02', title: 'Enter scores', desc: 'Log your last 5 Stableford rounds (1-45). System keeps only your latest five.', icon: '⛳' },
            { num: '03', title: 'Win monthly', desc: 'Match 3, 4, or 5 drawn numbers to win a share of the prize pool.', icon: '🎯' },
            { num: '04', title: 'Give back', desc: 'Your charity contribution happens automatically every billing cycle.', icon: '❤️' },
          ].map((s, i) => (
            <div key={s.num} className="card-hover group relative overflow-hidden">
              <div className="absolute top-0 right-0 text-6xl font-black text-gray-800/40 leading-none p-2 group-hover:text-gray-700/40 transition-colors">{s.num}</div>
              <div className="text-3xl mb-3">{s.icon}</div>
              <h3 className="font-bold text-white mb-2">{s.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Prize pool tiers */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="section-label mb-3">Prize pool</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Three ways to win</h2>
            <p className="text-gray-400 leading-relaxed mb-6">50% of every subscription goes into the prize pool. Match numbers to claim your share. The jackpot rolls over if nobody hits all five.</p>
            <Link href="/register" className="btn-primary inline-block">Join the next draw</Link>
          </div>
          <div className="card space-y-0">
            {[
              { match: 5, label: 'Jackpot', share: '40%', note: 'Rolls over if unclaimed', color: 'text-brand-400', bg: 'bg-brand-500/15 border-brand-500/30' },
              { match: 4, label: '4-Number Match', share: '35%', note: null, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
              { match: 3, label: '3-Number Match', share: '25%', note: null, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
            ].map(t => (
              <div key={t.match} className="prize-tier">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm ${t.bg} ${t.color}`}>{t.match}</div>
                  <div>
                    <p className="font-semibold text-sm">{t.label}</p>
                    {t.note && <p className="text-gray-500 text-xs">{t.note}</p>}
                  </div>
                </div>
                <span className={`font-bold text-lg ${t.color}`}>{t.share}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured charity spotlight */}
      {featuredCharity && (
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="relative overflow-hidden rounded-3xl border border-brand-500/20 bg-gradient-to-br from-brand-500/10 via-gray-900 to-gray-950 p-8 md:p-12">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl" />
            <div className="relative flex items-start justify-between flex-wrap gap-6">
              <div className="flex-1 max-w-lg">
                <div className="section-label mb-3">Spotlight charity</div>
                <h2 className="text-3xl font-bold mb-3">{featuredCharity.name}</h2>
                <p className="text-gray-400 leading-relaxed mb-6">{featuredCharity.description}</p>
                <div className="flex gap-3 flex-wrap">
                  <Link href="/register" className="btn-primary">Support this charity</Link>
                  <Link href="/charities" className="btn-secondary">Browse all charities</Link>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-black text-3xl glow-brand">
                  {featuredCharity.name[0]}
                </div>
                {parseFloat(featuredCharity.total_raised) > 0 && (
                  <div className="text-center">
                    <p className="text-brand-400 font-bold text-lg">₹{parseFloat(featuredCharity.total_raised).toLocaleString()}</p>
                    <p className="text-gray-500 text-xs">raised so far</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features grid */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <div className="section-label mb-3">Platform features</div>
          <h2 className="text-3xl md:text-4xl font-bold">Everything you need</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: '⛳', title: 'Stableford scoring', desc: 'Standard golf scoring 1-45. Submit up to 5 rounds. Oldest auto-drops when you add a 6th.' },
            { icon: '🎯', title: 'Smart draw engine', desc: 'Random or algorithm-weighted draws. Admins simulate before publishing official results.' },
            { icon: '🏆', title: 'Tiered prize pool', desc: '50% of subscriptions into the pool. Winners split their tier equally. Jackpot rolls forward.' },
            { icon: '❤️', title: 'Charity-first', desc: 'Choose any listed charity. 10-100% of your plan goes there every cycle.' },
            { icon: '🔒', title: 'Verified payouts', desc: 'Winners upload score screenshots. Admins verify before any payout is released.' },
            { icon: '📊', title: 'Full admin panel', desc: 'Manage users, draws, charities, winners, and analytics from one dashboard.' },
          ].map(f => (
            <div key={f.title} className="card-hover group">
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-200 inline-block">{f.icon}</div>
              <h3 className="font-bold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 p-10 md:p-16 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.1)_0%,_transparent_70%)]" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Join today. Play next month.</h2>
            <p className="text-brand-100 text-lg mb-8 max-w-xl mx-auto">Create your account, pick a charity, choose a plan, and submit your first five scores.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/register" className="bg-white text-brand-600 font-bold px-8 py-4 rounded-xl hover:bg-brand-50 transition-all hover:scale-[1.02] active:scale-95 shadow-xl">
                Create your account
              </Link>
              <Link href="/login" className="bg-brand-600/50 text-white font-semibold px-8 py-4 rounded-xl border border-white/20 hover:bg-brand-600/70 transition-all">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/60 px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-brand-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs">GP</span>
              </div>
              <span className="text-white font-bold">GP MEMBERSHIP OS</span>
            </div>
            <div className="flex gap-6">
              <Link href="/charities" className="nav-link text-sm">Charities</Link>
              <Link href="/pricing" className="nav-link text-sm">Pricing</Link>
              <Link href="/login" className="nav-link text-sm">Sign in</Link>
              <Link href="/register" className="nav-link text-sm">Register</Link>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${apiStatus === 'ok' ? 'bg-brand-400' : 'bg-red-400'}`} />
              <span className="text-gray-500 text-xs">{apiStatus === 'ok' ? 'All systems operational' : 'Backend offline'}</span>
            </div>
          </div>
          <div className="border-t border-gray-800/40 mt-6 pt-6 text-center text-gray-600 text-xs">
            Built with Next.js, Node.js, Supabase and Razorpay.
          </div>
        </div>
      </footer>
    </main>
  );
}
