// src/components/header.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Tab({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`px-[101px] py-[10px] text-[16px] font-normal tracking-[0.10em] leading-none rounded-[6px]
        ${active ? 'bg-[linear-gradient(to_right,#0152A3_0%,#00A5EC_100%)] text-white' : 'bg-[#EBEEF1] text-[#0A2642]'}`}
    >
      {label}
    </Link>
  );
}

export default function Header() {
  return (
    <header className="h-[64px] border-b border-[#0A2642] bg-white flex justify-center items-center">
      <nav className="flex justify-center items-center gap-[6px]">
        <Tab href="/editor"     label="Editor" />
        <Tab href="/assistant"  label="Assistant" />
        <Tab href="/result"     label="Result" />
      </nav>
    </header>
  );
}
