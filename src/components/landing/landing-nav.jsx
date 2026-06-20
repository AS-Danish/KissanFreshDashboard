"use client";

import Link from "next/link";
import { IconLeaf, IconSun, IconMoon } from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function LandingNav() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full border-b border-zinc-100 dark:border-zinc-900 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-200 dark:shadow-none">
            <IconLeaf size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Kissan Fresh</span>
        </Link>
        <div className="flex items-center gap-4 md:gap-8 text-sm font-medium">
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-green-600">Home</Link>
            <Link href="/#about" className="hover:text-green-600 transition-colors">About Us</Link>
            <Link href="/#how-it-works" className="hover:text-green-600 transition-colors">How it Works</Link>
            <Link href="/privacy" className="hover:text-green-600 transition-colors">Privacy Policy</Link>
          </div>
          
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Toggle theme"
          >
            {mounted ? (
              theme === "dark" ? <IconSun size={20} /> : <IconMoon size={20} />
            ) : (
              <div className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
