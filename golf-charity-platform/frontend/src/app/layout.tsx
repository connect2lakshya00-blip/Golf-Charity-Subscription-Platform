import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GolfDraw — Play. Give. Win.',
  description: 'Monthly golf draw with charity contributions. Subscribe, track your scores, and win prizes while supporting causes you care about.',
  keywords: 'golf, charity, subscription, draw, prizes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' },
          }}
        />
        {children}
      </body>
    </html>
  );
}
