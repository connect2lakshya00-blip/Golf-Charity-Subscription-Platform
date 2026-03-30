'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface Player {
  id: string;
  full_name: string;
  avg_score: string;
  total_scores: number;
  total_wins: number;
  total_won: string;
  charity_name: string;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/login'); return; }
    api.get('/leaderboard')
      .then(r => setPlayers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800/60 px-6 py-4 sticky top-0 bg-gray-950/80 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-brand-400 font-bold text-lg tracking-tight">GP MEMBERSHIP OS</Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="nav-link text-sm">Dashboard</Link>
            <Link href="/leaderboard" className="text-brand-400 text-sm font-medium">Leaderboard</Link>
            <button onClick={() => { logout(); router.push('/'); }} className="nav-link text-sm">Sign out</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="section-label mb-3">Rankings</div>
          <h1 className="text-4xl font-bold mb-2">Leaderboard</h1>
          <p className="text-gray-400">Top players ranked by average Stableford score. Updated in real time.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : players.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">🏆</div>
            <p className="text-white font-semibold mb-2">No players yet</p>
            <p className="text-gray-400 text-sm">Be the first to enter scores and appear on the leaderboard.</p>
            <Link href="/dashboard" className="btn-primary inline-block mt-4">Enter scores</Link>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {players.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[players[1], players[0], players[2]].map((p, i) => {
                  const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
                  const heights = ['h-28', 'h-36', 'h-24'];
                  const colors = ['border-gray-400/40 bg-gray-400/5', 'border-brand-500/40 bg-brand-500/10 glow-brand', 'border-amber-600/40 bg-amber-600/5'];
                  return (
                    <div key={p.id} className={`card ${colors[i]} flex flex-col items-center justify-end ${heights[i]} text-center`}>
                      <div className="text-2xl mb-1">{medals[rank - 1]}</div>
                      <p className="font-bold text-sm truncate w-full px-2">{p.full_name}</p>
                      <p className="text-brand-400 font-bold text-lg">{p.avg_score}</p>
                      <p className="text-gray-500 text-xs">avg score</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full table */}
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="table-header pl-6 w-12">#</th>
                    <th className="table-header">Player</th>
                    <th className="table-header text-right">Avg Score</th>
                    <th className="table-header text-right">Rounds</th>
                    <th className="table-header text-right">Wins</th>
                    <th className="table-header text-right pr-6">Total Won</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={p.id} className={`hover:bg-gray-800/30 transition-colors ${p.id === user?.id ? 'bg-brand-500/5 border-l-2 border-brand-500' : ''}`}>
                      <td className="table-cell pl-6">
                        <span className={`font-bold ${i < 3 ? 'text-lg' : 'text-gray-500'}`}>
                          {i < 3 ? medals[i] : i + 1}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-xs flex-shrink-0">
                            {p.full_name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {p.full_name}
                              {p.id === user?.id && <span className="ml-2 badge-active text-xs">You</span>}
                            </p>
                            {p.charity_name && <p className="text-gray-500 text-xs">❤️ {p.charity_name}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-right">
                        <span className="text-brand-400 font-bold text-base">{p.avg_score}</span>
                      </td>
                      <td className="table-cell text-right text-gray-400">{p.total_scores}</td>
                      <td className="table-cell text-right">
                        {parseInt(p.total_wins as any) > 0 ? (
                          <span className="badge-active">{p.total_wins}x</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="table-cell text-right pr-6 font-semibold text-brand-400">
                        {parseFloat(p.total_won) > 0 ? `₹${parseFloat(p.total_won).toFixed(0)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
