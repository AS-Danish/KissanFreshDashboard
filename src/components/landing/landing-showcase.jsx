import { IconDeviceMobile } from "@tabler/icons-react";

export function LandingShowcase() {
  return (
    <section className="py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-[3rem] p-12 md:p-20 relative flex flex-col md:flex-row items-center gap-12 overflow-hidden">
          <div className="relative z-10 flex-1 space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">Order from anything, <br />anytime, anywhere.</h2>
            <p className="text-zinc-400 dark:text-zinc-500 text-lg">Get the full Kissan Fresh experience on your mobile. Track your orders in real-time and never miss an update.</p>
            <div className="flex flex-wrap gap-4">
              <div className="h-14 px-8 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-white rounded-2xl flex items-center gap-3 font-bold cursor-pointer hover:scale-105 transition-transform">
                <IconDeviceMobile size={22} />
                App Store
              </div>
              <div className="h-14 px-8 bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl flex items-center gap-3 font-bold cursor-pointer hover:scale-105 transition-transform">
                <IconDeviceMobile size={22} />
                Play Store
              </div>
            </div>
          </div>
          <div className="flex-1 relative h-[400px] w-full max-w-[300px] hidden md:block">
            <div className="absolute inset-0 bg-green-500 blur-[100px] rounded-full opacity-20"></div>
            {/* Mock Mobile App UI */}
            <div className="absolute inset-0 bg-zinc-900 dark:bg-zinc-200 rounded-[2.5rem] border-8 border-zinc-800 dark:border-zinc-300 shadow-2xl p-6 overflow-hidden">
               <div className="w-20 h-1 bg-zinc-800 dark:bg-zinc-300 rounded-full mx-auto mb-8"></div>
               <div className="space-y-4">
                 <div className="h-8 w-1/2 bg-zinc-800 dark:bg-zinc-300 rounded-lg"></div>
                 <div className="h-32 w-full bg-green-600/20 rounded-2xl border border-green-600/30"></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-zinc-800 dark:bg-zinc-300 rounded-2xl"></div>
                    <div className="h-24 bg-zinc-800 dark:bg-zinc-300 rounded-2xl"></div>
                 </div>
               </div>
            </div>
          </div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-green-500/20 blur-[100px] rounded-full"></div>
        </div>
      </div>
    </section>
  );
}
