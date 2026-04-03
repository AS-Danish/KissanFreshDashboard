import Link from "next/link";
import { IconLeaf } from "@tabler/icons-react";

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-100 dark:border-zinc-900 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white">
            <IconLeaf size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Kissan Fresh</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link href="/" className="text-green-600">Home</Link>
          <Link href="/privacy" className="hover:text-green-600 transition-colors">Privacy Policy</Link>
          <Link href="/dashboard" className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-lg shadow-zinc-200 dark:shadow-none">
            Merchant Login
          </Link>
        </div>
      </div>
    </nav>
  );
}
