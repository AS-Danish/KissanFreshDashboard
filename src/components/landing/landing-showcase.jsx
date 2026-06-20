"use client";

import { IconDeviceMobile } from "@tabler/icons-react";
import { motion } from "framer-motion";

export function LandingShowcase() {
  return (
    <section className="py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-green-600 dark:bg-green-900/40 text-white rounded-[3rem] p-12 md:p-20 relative flex flex-col md:flex-row items-center gap-12 overflow-hidden border border-green-500 dark:border-green-800/50 shadow-2xl shadow-green-600/20 dark:shadow-none"
        >
          <div className="relative z-10 flex-1 space-y-8">
            <motion.h2 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-4xl md:text-5xl font-bold leading-tight"
            >
              Order from anything, <br />anytime, anywhere.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-green-50 text-lg"
            >
              Get the full Kissan Fresh experience on your mobile. Track your orders in real-time and never miss an update.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-wrap gap-4"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="h-14 px-8 bg-white text-green-700 rounded-2xl flex items-center gap-3 font-bold cursor-pointer transition-colors shadow-xl">
                <IconDeviceMobile size={22} />
                App Store
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="h-14 px-8 bg-green-800 dark:bg-green-800/80 text-white border border-green-700 rounded-2xl flex items-center gap-3 font-bold cursor-pointer transition-colors shadow-xl">
                <IconDeviceMobile size={22} />
                Play Store
              </motion.div>
            </motion.div>
          </div>
          <div className="flex-1 relative h-[400px] w-full max-w-[300px] hidden md:block">
            <div className="absolute inset-0 bg-white dark:bg-green-400 blur-[100px] rounded-full opacity-20"></div>
            {/* Mock Mobile App UI */}
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, type: "spring", stiffness: 100, damping: 20 }}
              className="absolute inset-0 bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-[2.5rem] border-[6px] border-white/20 shadow-2xl p-6 overflow-hidden"
            >
               <div className="w-20 h-1 bg-white/30 rounded-full mx-auto mb-8"></div>
               <div className="space-y-4">
                 <motion.div initial={{ width: 0 }} whileInView={{ width: "50%" }} transition={{ delay: 0.8, duration: 0.5 }} className="h-8 bg-white/20 rounded-lg"></motion.div>
                 <motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ delay: 1, duration: 0.5 }} className="h-32 w-full bg-white/30 rounded-2xl border border-white/20"></motion.div>
                 <div className="grid grid-cols-2 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.5 }} className="h-24 bg-white/20 rounded-2xl"></motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 1.4, duration: 0.5 }} className="h-24 bg-white/20 rounded-2xl"></motion.div>
                 </div>
               </div>
            </motion.div>
          </div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/20 blur-[100px] rounded-full"></div>
        </motion.div>
      </div>
    </section>
  );
}
