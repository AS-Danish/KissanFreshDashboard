"use client";

import { motion } from "framer-motion";
import { IconCarrot, IconMilk, IconMeat, IconClock } from "@tabler/icons-react";

const categories = [
  {
    name: "Fresh Vegetables",
    desc: "Sourced directly from local farms every morning.",
    icon: <IconCarrot size={40} className="text-orange-500" />,
    bg: "bg-orange-50 dark:bg-orange-950/30"
  },
  {
    name: "Dairy & Bakery",
    desc: "Fresh milk, artisan breads, and farm eggs.",
    icon: <IconMilk size={40} className="text-blue-500" />,
    bg: "bg-blue-50 dark:bg-blue-950/30"
  },
  {
    name: "Meats & Poultry",
    desc: "High quality, tender cuts processed daily.",
    icon: <IconMeat size={40} className="text-red-500" />,
    bg: "bg-red-50 dark:bg-red-950/30"
  }
];

export function LandingWhatWeDo() {
  return (
    <section className="py-24 bg-white dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="flex-1 space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 text-sm font-bold">
              <IconClock size={20} />
              Hyper-Local Fast Delivery
            </div>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight text-zinc-950 dark:text-white">
              Everything you need, <br /> delivered <span className="text-green-600">in minutes.</span>
            </h2>
            <p className="text-lg text-zinc-500 dark:text-zinc-400">
              We operate micro-fulfillment centers across the city, loaded with fresh inventory every morning. This allows us to pack and deliver your daily needs incredibly fast.
            </p>
          </motion.div>

          <motion.div 
            className="flex-1 grid gap-6 w-full"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
            }}
          >
            {categories.map((cat, i) => (
              <motion.div 
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
                }}
                className={`p-6 rounded-3xl flex items-center gap-6 border border-zinc-100 dark:border-zinc-800 ${cat.bg} hover:scale-105 transition-transform duration-300 cursor-pointer`}
              >
                <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center shadow-sm">
                  {cat.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{cat.name}</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">{cat.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </div>
    </section>
  );
}
