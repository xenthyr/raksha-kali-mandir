import { Calendar, Flame, Clock, Sparkles } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export default function PanjikaCalendar() {
  return (
    <section id="panjika" className="py-20 px-4 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-saffron-500/10 border border-saffron-500/25 text-saffron-600 dark:text-saffron-400 text-xs font-bold mb-3">
          <Calendar className="w-3.5 h-3.5" />
          <span>পশ্চিমবঙ্গ পঞ্জিকা অনুসারে ১৪৩৩ বঙ্গাব্দ</span>
        </div>
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 dark:text-amber-50">
          প্রতি অমাবস্যা তিথি ও পূজা নির্ঘণ্ট
        </h2>
        <p className="text-stone-600 dark:text-stone-400 text-sm mt-1 max-w-xl mx-auto">
          মা রক্ষা কালীর বিশেষ আরাধনা, হোমযজ্ঞ ও ভোগ নিবেদনের সঠিক তিথি সময়সূচি
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SITE_CONFIG.amavasyaList.map((item) => (
          <div
            key={item.id}
            className={`relative rounded-3xl p-6 transition-all duration-300 ${
              item.isSpecial
                ? "bg-gradient-to-b from-orange-50/80 to-white dark:from-sanctum-900 dark:to-sanctum-950 border-2 border-saffron-500/40 shadow-xl shadow-saffron-950/10"
                : "bg-white dark:bg-sanctum-900 border border-stone-200 dark:border-stone-800 shadow-md"
            }`}
          >
            {item.isSpecial && (
              <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-saffron-600 text-white text-[11px] font-bold shadow-sm">
                <Sparkles className="w-3 h-3" />
                <span>মহাপূজা</span>
              </div>
            )}

            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-saffron-500" />
              <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-amber-50">
                {item.name}
              </h3>
            </div>

            <div className="space-y-1.5 mb-4 text-xs sm:text-sm">
              <div className="flex justify-between text-stone-600 dark:text-stone-400 border-b border-stone-100 dark:border-stone-800/80 pb-1.5">
                <span>বঙ্গাব্দ পঞ্জিকা তারিখ:</span>
                <span className="font-semibold text-stone-900 dark:text-stone-200">{item.bengaliMonth}</span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-stone-400 border-b border-stone-100 dark:border-stone-800/80 pb-1.5">
                <span>ইংরেজি তারিখ:</span>
                <span className="font-semibold text-stone-900 dark:text-stone-200">{item.englishDate}</span>
              </div>
            </div>

            <div className="bg-stone-50 dark:bg-sanctum-950/90 rounded-2xl p-3.5 border border-stone-200/80 dark:border-stone-800 space-y-2 mb-4">
              <div className="flex items-start gap-2 text-xs">
                <Clock className="w-4 h-4 text-saffron-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-500 dark:text-stone-400 block">তিথি আরম্ভ:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{item.starts}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <Clock className="w-4 h-4 text-kumkum-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-500 dark:text-stone-400 block">তিথি সমাপ্তি:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{item.ends}</span>
                </div>
              </div>
            </div>

            <p className="text-stone-600 dark:text-stone-400 text-xs leading-relaxed">
              {item.significance}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
