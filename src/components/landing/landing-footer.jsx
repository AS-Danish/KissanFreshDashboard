import Link from "next/link";
import { IconLeaf } from "@tabler/icons-react";

export function LandingFooter() {
  return (
    <footer className="py-12 border-t border-zinc-100 dark:border-zinc-900">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white">
            <IconLeaf size={18} />
          </div>
          <span className="text-lg font-bold">Kissan Fresh</span>
        </div>
        
        <div className="flex gap-8 text-sm text-zinc-500">
          <Link href="/" className="hover:text-green-600 transition-colors">Home</Link>
          <Link href="/privacy" className="hover:text-green-600 transition-colors">Privacy Policy</Link>
          <Link href="/delete-account" className="hover:text-green-600 transition-colors">Delete Account</Link>
          <Link href="/dashboard" className="hover:text-green-600 transition-colors">Dashboard</Link>
        </div>
        
        <p className="text-sm text-zinc-400">
          &copy; {new Date().getFullYear()} Kissan Fresh. 
        </p>
      </div>
    </footer>
  );
}
