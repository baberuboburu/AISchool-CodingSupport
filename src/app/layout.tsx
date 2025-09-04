// src/app/layout.tsx
import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import './reset.css';

export const metadata: Metadata = {
  title: 'Coding Support',
  description: 'Editor / Assistant / Result',
};

const noto = Noto_Sans_JP({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`min-h-screen ${noto.className}`}>{children}</body>
    </html>
  );
}