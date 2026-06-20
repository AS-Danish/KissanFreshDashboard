"use client";

import { motion } from "framer-motion";
import { IconHandClick, IconBoxSeam, IconTruckDelivery } from "@tabler/icons-react";

const steps = [
  {
    icon: <IconHandClick size={48} className="text-blue-500" />,
    title: "1. You Order",
    desc: "Browse our huge selection of fresh items and add them to your cart. Checkout in seconds.",
    color: "bg-blue-100 dark:bg-blue-900/30"
  },
  {
    icon: <IconBoxSeam size={48} className="text-orange-500" />,
    title: "2. We Pack",
    desc: "Our dark stores immediately receive your order and our pickers pack it in under 3 minutes.",
    color: "bg-orange-100 dark:bg-orange-900/30"
  },
  {
    icon: <IconTruckDelivery size={48} className="text-green-500" />,
    title: "3. Fast Delivery",
    desc: "A delivery partner picks it up and zooms to your doorstep. Groceries delivered instantly.",
    color: "bg-green-100 dark:bg-green-900/30"
  }
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-zinc-50/50 dark:bg-zinc-900/30 transition-colors">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-zinc-950 dark:text-white">How it works</h2>
          <p className="text-lg text-zinc-500 dark:text-zinc-400">
            A seamless tech-driven supply chain makes our hyper-local delivery possible.
          </p>
        </div>

        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-zinc-200 dark:bg-zinc-800/50 -translate-y-1/2 z-0"></div>

          <div className="grid md:grid-cols-3 gap-12 relative z-10">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: i * 0.2 }}
                className="flex flex-col items-center text-center group"
              >
                <div className={`w-32 h-32 rounded-full ${step.color} border-[8px] border-white dark:border-zinc-800 flex items-center justify-center mb-8 shadow-xl shadow-zinc-200/50 dark:shadow-none group-hover:scale-110 transition-transform duration-500`}>
                  {step.icon}
                </div>
                <h3 className="text-2xl font-bold mb-3 text-zinc-950 dark:text-white">{step.title}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 px-4 leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
