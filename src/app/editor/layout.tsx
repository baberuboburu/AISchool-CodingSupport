// src/app/editor/layout.tsx
import Header from '@/app/components/header';
import Sidebar from '@/app/components/sidebar';

export default function WithSidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 min-w-0 bg-white">{children}</main>
      </div>
    </div>
  );
}
