import { 
  IconCheckbox, 
  IconTruckDelivery, 
  IconShieldCheck
} from "@tabler/icons-react";

export function LandingFeatures() {
  return (
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
  );
}
