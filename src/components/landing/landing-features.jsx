"use client";

import { 
  IconCheckbox, 
  IconTruckDelivery, 
  IconShieldCheck,
  IconLeaf,
  IconBasket
} from "@tabler/icons-react";
import { motion } from "framer-motion";

export function LandingFeatures() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <section className="py-24 bg-white dark:bg-zinc-950 relative overflow-hidden transition-colors">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-400/10 dark:bg-green-900/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-400/10 dark:bg-orange-900/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-green-600 dark:text-green-400 font-bold tracking-wider uppercase text-sm mb-2 block">The Kissan Fresh Difference</span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-zinc-950 dark:text-white tracking-tight">Why choose us?</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg leading-relaxed">
            We don't just deliver groceries; we deliver peace of mind. Our state-of-the-art supply chain guarantees the highest quality, untouched by middlemen.
          </p>
        </motion.div>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[250px]"
        >
          {/* Main Large Feature (Bento Item 1) */}
          <motion.div variants={itemVariants} className="md:col-span-8 row-span-2 group relative bg-zinc-50/50 dark:bg-zinc-900/50 rounded-[2.5rem] p-10 overflow-hidden border border-zinc-200 dark:border-zinc-800/50 transition-all hover:border-green-300/50 dark:hover:border-green-500/30 hover:shadow-2xl hover:shadow-green-900/5 dark:hover:shadow-green-900/20 hover:-translate-y-1 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="w-16 h-16 bg-white dark:bg-zinc-800 shadow-sm rounded-2xl flex items-center justify-center text-green-600 dark:text-green-400">
                <IconShieldCheck size={36} stroke={1.5} />
              </div>
              <div className="max-w-md mt-8">
                <h3 className="text-3xl font-bold mb-4 text-zinc-950 dark:text-white tracking-tight">12-Step Quality Control</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-lg leading-relaxed">
                  Every fruit and vegetable goes through rigorous sorting, cleaning, and quality checks in our facilities before being packed in breathable, eco-friendly material.
                </p>
              </div>
            </div>
            {/* Decorative abstract shape */}
            <IconLeaf className="absolute -bottom-10 -right-10 text-green-100 dark:text-zinc-800 w-64 h-64 -rotate-12 group-hover:rotate-0 transition-transform duration-700 ease-out opacity-50" />
          </motion.div>
          
          {/* Top Right Feature (Bento Item 2) */}
          <motion.div variants={itemVariants} className="md:col-span-4 row-span-1 group bg-orange-50/50 dark:bg-orange-950/20 rounded-[2.5rem] p-8 flex flex-col justify-center border border-orange-200/50 dark:border-orange-900/30 hover:border-orange-300 dark:hover:border-orange-700/50 hover:shadow-xl hover:shadow-orange-100/50 dark:hover:shadow-orange-900/20 hover:-translate-y-1 transition-all backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-center text-orange-500 shadow-sm">
                <IconTruckDelivery size={28} stroke={1.5} />
              </div>
              <h3 className="text-xl font-bold text-zinc-950 dark:text-white">Lightning Fast</h3>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400">Our hyperlocal dark stores ensure delivery within minutes, keeping the cold-chain intact.</p>
          </motion.div>
          
          {/* Bottom Right Feature (Bento Item 3) */}
          <motion.div variants={itemVariants} className="md:col-span-4 row-span-1 group bg-blue-50/50 dark:bg-blue-950/20 rounded-[2.5rem] p-8 flex flex-col justify-center border border-blue-200/50 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700/50 hover:shadow-xl hover:shadow-blue-100/50 dark:hover:shadow-blue-900/20 hover:-translate-y-1 transition-all backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-xl flex items-center justify-center text-blue-500 shadow-sm">
                <IconBasket size={28} stroke={1.5} />
              </div>
              <h3 className="text-xl font-bold text-zinc-950 dark:text-white">Vast Assortment</h3>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400">From exotic fruits to daily dairy, find over 5,000+ items stocked fresh every single day.</p>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}
