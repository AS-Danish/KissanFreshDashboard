import Image from "next/image";
import Link from "next/link";
import { 
  IconCheckbox, 
  IconTruckDelivery, 
  IconShieldCheck, 
  IconDeviceMobile,
  IconArrowRight,
  IconLeaf,
  IconShoppingBag
} from "@tabler/icons-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-zinc-100 dark:border-zinc-900 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white">
              <IconLeaf size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Kissan Fresh</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/" className="text-green-600">Home</Link>
            <Link href="/privacy" className="hover:text-green-600 transition-colors">Privacy Policy</Link>
            <Link href="/dashboard" className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-lg shadow-zinc-200 dark:shadow-none">
              Merchant Login
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {/* Hero Section */}
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

        {/* Features section */}
        <section className="py-24 bg-zinc-50 dark:bg-zinc-900/30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Kissan Fresh?</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-lg">We've reimagined the grocery shopping experience to bring quality and convenience closer to you.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-zinc-950 p-8 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-900 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-orange-600 mb-6">
                  <IconCheckbox size={32} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-zinc-950 dark:text-white">Strict Quality Control</h3>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">Every item is hand-picked and undergoes 12 quality checks before it reaches your doorstep.</p>
              </div>
              
              <div className="bg-white dark:bg-zinc-950 p-8 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-900 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/20 rounded-2xl flex items-center justify-center text-green-600 mb-6">
                  <IconTruckDelivery size={32} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-zinc-950 dark:text-white">Fastest Delivery</h3>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">Hyper-local delivery network ensures your orders arrive in less than 30 minutes from harvest.</p>
              </div>
              
              <div className="bg-white dark:bg-zinc-950 p-8 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-900 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                  <IconShieldCheck size={32} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-zinc-950 dark:text-white">Farm to Table</h3>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">No middleman. We connect you directly with local farmers for the best prices and freshness.</p>
              </div>
            </div>
          </div>
        </section>

        {/* App Showcase */}
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
      </main>

      {/* Footer */}
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
            <Link href="/dashboard" className="hover:text-green-600 transition-colors">Dashboard</Link>
          </div>
          
          <p className="text-sm text-zinc-400">
            &copy; {new Date().getFullYear()} Kissan Fresh. 
          </p>
        </div>
      </footer>
    </div>
  );
}
