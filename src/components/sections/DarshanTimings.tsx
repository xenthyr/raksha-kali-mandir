import { Clock, CheckCircle2 } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export default function DarshanTimings() {
  return (
    <section id="darshan" className="py-20 px-4 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <span className="text-xs font-bold text-saffron-600 dark:text-saffron-400 uppercase tracking-wider">
          নিত্য নির্ঘণ্ট
        </span>
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 dark:text-amber-50 mt-1">
          দৈনিক পূজা ও আরতির সময়সূচি
        </h2>
      </div>

      <div className="bg-white dark:bg-sanctum-900 border border-stone-200 dark:border-saffron-500/20 rounded-3xl p-6 md:p-10 shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-saffron-500/10 text-saffron-600 dark:text-saffron-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-amber-50">
                মাতৃ আরাধনা নির্ঘণ্ট
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                সঠিক সময়ে উপস্থিত হয়ে মায়ের কৃপা ও পুণ্য দর্শন লাভ করুন
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>মন্দির প্রাঙ্গণ উন্মুক্ত</span>
          </div>
        </div>

        <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
          {SITE_CONFIG.timings.map((item, idx) => (
            <div key={idx} className="py-4 flex justify-between items-center text-sm md:text-base">
              <span className="font-semibold text-stone-700 dark:text-stone-300">{item.name}</span>
              <span className="font-serif font-bold text-saffron-600 dark:text-saffron-400">
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
