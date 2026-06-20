"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function LandingAbout() {
  return (
    <section id="about" className="py-24 bg-zinc-50 dark:bg-zinc-950/50 overflow-hidden transition-colors">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="relative aspect-square md:aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800/50"
        >
          <Image
            src="/hero-image.png" 
            alt="About Kissan Fresh"
            fill
            style={{ objectFit: "cover" }}
            className="hover:scale-105 transition-transform duration-1000"
          />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <div className="inline-block px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400 text-sm font-bold tracking-wider uppercase">
            About Kissan Fresh
          </div>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight text-zinc-950 dark:text-white">
            Bridging the gap between Farms and your Kitchen.
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            We started with a simple idea: fresh food shouldn't take days to reach you. By cutting out the middlemen and building an ultra-fast supply chain, we ensure that the vegetables harvested in the morning are in your kitchen by noon.
          </p>
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-zinc-200 dark:border-zinc-800/50">
            <div>
              <p className="text-4xl font-bold text-green-600 dark:text-green-500 mb-2">10<span className="text-xl">min</span></p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Average Delivery Time</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-green-600 dark:text-green-500 mb-2">500+</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Partner Farmers</p>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
