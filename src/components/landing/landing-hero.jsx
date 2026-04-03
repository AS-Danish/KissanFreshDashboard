import Image from "next/image";
import Link from "next/link";
import { 
  IconDeviceMobile,
  IconArrowRight,
  IconShoppingBag
} from "@tabler/icons-react";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-24 md:pt-24 md:pb-32">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <div className="relative z-10 space-y-8 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Freshly Harvested Today
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-950 dark:text-white leading-[1.1]">
            Pure Freshness, <br />
            <span className="text-green-600">Directly </span> 
            to You.
          </h1>
          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Experience the finest organic produce, dairy, and home-cooked delicacies delivered from local farms to your kitchen within hours of harvest.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button className="h-14 px-8 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all shadow-xl shadow-green-200 dark:shadow-none hover:scale-[1.02] active:scale-95 group">
              Download the App
              <IconDeviceMobile size={22} className="group-hover:rotate-12 transition-transform" />
            </button>
            <Link href="/dashboard" className="h-14 px-8 border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900 overflow-hidden">
              Dashboard
              <IconArrowRight size={20} />
            </Link>
          </div>
          <div className="flex items-center gap-6 pt-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-950 bg-zinc-200 flex items-center justify-center overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i+10}`} width={40} height={40} alt="User" />
                </div>
              ))}
            </div>
            <div className="text-sm">
              <p className="font-bold text-zinc-900 dark:text-white">5,000+ Happy Families</p>
              <p className="text-zinc-500">Trusting Kissan Fresh daily</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 bg-green-400/20 blur-3xl rounded-full opacity-50 dark:opacity-20 animate-pulse"></div>
          <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-2xl border-8 border-white dark:border-zinc-900 rotate-2 hover:rotate-0 transition-transform duration-700 group">
            <Image
              src="/hero-image.png"
              alt="Fresh organic produce"
              fill
              style={{ objectFit: "cover" }}
              priority
              className="group-hover:scale-105 transition-transform duration-1000"
            />
            <div className="absolute top-6 left-6 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white dark:border-zinc-800 animate-bounce duration-[3000ms]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center text-green-600">
                  <IconShoppingBag size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">New Order</p>
                  <p className="text-sm font-bold">Organic Tomato 2kg</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
