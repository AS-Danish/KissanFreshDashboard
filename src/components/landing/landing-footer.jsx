"use client";

import Link from "next/link";
import { IconLeaf } from "@tabler/icons-react";
import { motion } from "framer-motion";

export function LandingFooter() {
  return (
    <motion.footer 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="py-12 border-t border-zinc-100 dark:border-zinc-900"
    >
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-green-200 dark:shadow-none">
            <IconLeaf size={18} />
          </div>
          <span className="text-lg font-bold text-zinc-900 dark:text-white">Kissan Fresh</span>
        </div>
        
        <div className="flex gap-8 text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Home</Link>
          <Link href="/privacy" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Privacy Policy</Link>
          <Link href="/delete-account" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Delete Account</Link>
        </div>
        
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          &copy; {new Date().getFullYear()} Kissan Fresh. 
        </p>
      </div>
    </motion.footer>
  );
}
