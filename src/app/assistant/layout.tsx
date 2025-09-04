// src/app/assistant/layout.tsx
import Header from '@/app/components/header';

export default function HeaderOnlyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 min-w-0 bg-white">{children}</main>
    </div>
  );
}