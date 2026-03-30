'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800/80 bg-gray-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-black">G</span>
          </div>
          <span className="text-white font-bold text-base tracking-tight">GolfDraw</span>
        </Link>

        <div className="flex items-center gap-1 md:gap-2">
          {!user ? (
            <>
              <Link href="/pricing" className={`nav-link px-3 py-2 rounded-lg ${pathname === '/pricing' ? 'text-white bg-gray-800/60' : ''}`}>Pricing</Link>
              <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
              <Link href="/register" className="btn-primary text-sm px-4 py-2">Get started</Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" className={`nav-link px-3 py-2 rounded-lg ${pathname?.startsWith('/dashboard') ? 'text-white bg-gray-800/60' : ''}`}>Dashboard</Link>
              {user.role === 'admin' && (
                <Link href="/admin" className={`nav-link px-3 py-2 rounded-lg ${pathname?.startsWith('/admin') ? 'text-white bg-gray-800/60' : ''}`}>Admin</Link>
              )}
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-800">
                <div className="w-7 h-7 bg-brand-500/20 rounded-full flex items-center justify-center">
                  <span className="text-brand-400 text-xs font-bold">{user.full_name?.[0]?.toUpperCase()}</span>
                </div>
                <button onClick={handleLogout} className="nav-link text-sm">Sign out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
