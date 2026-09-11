import { ShieldAlert, Sparkles, Users, Church } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export default function MandirLegend() {
  return (
    <section id="legend" className="py-20 px-4 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <span className="text-xs font-bold text-saffron-600 dark:text-saffron-400 uppercase tracking-wider">
          ঐতিহাসিক প্রেক্ষাপট
        </span>
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 dark:text-amber-50 mt-1">
          মন্দির প্রতিষ্ঠা ও মা রক্ষা কালীর মাহাত্ম্য
        </h2>
        <p className="text-stone-600 dark:text-stone-400 text-sm mt-1 max-w-2xl mx-auto">
          {SITE_CONFIG.location.spot}-এ মায়ের অধিষ্ঠান ও অপমৃত্যু নিবারণের অলৌকিক ইতিহাস
        </p>
      </div>

      <div className="bg-white dark:bg-sanctum-900 border border-stone-200 dark:border-saffron-500/20 rounded-3xl p-6 sm:p-10 shadow-xl mb-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-saffron-500/10 text-saffron-600 dark:text-saffron-400 shrink-0">
            <Church className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-amber-50">
              গ্রামরক্ষা ও মন্দির প্রতিষ্ঠার আদি কথা
            </h3>
            <p className="text-xs text-saffron-600 dark:text-saffron-400 font-semibold mt-0.5">
              উদ্যোক্তা: {SITE_CONFIG.committeeName}
            </p>
          </div>
        </div>

        <div className="prose dark:prose-invert max-w-none text-stone-700 dark:text-stone-300 text-sm md:text-base leading-relaxed space-y-4">
          <p>
            অতীতে রায়গঞ্জের অন্তর্গত <strong>সাহাপুর বটতলা মোড়</strong> এলাকায় বিভিন্ন অনিয়ম ও পারিপার্শ্বিক অমঙ্গলের কারণে ক্রমাগত বহু পথ দুর্ঘটনা ঘটেছিল এবং এতে বহু অমূল্য প্রাণহানি ঘটে। আকস্মিক বিপদে সমগ্র গ্রামবাসী গভীরভাবে শঙ্কিত হয়ে পড়েন।
          </p>
          <p>
            পরবর্তীতে জগৎজননী মা রক্ষা কালীর স্বর্গীয় ইচ্ছায় ও স্বপ্নাদেশে স্থির হয় যে, এই স্থানে মায়ের মন্দির স্থাপন ও নিত্য আরাধনাই একমাত্র এই অপমৃত্যু ও অমঙ্গল হতে সমগ্র অঞ্চলকে রক্ষা করতে পারে। সেই মহৎ উদ্দেশ্যে <strong>শ্রী শ্রী মা রক্ষা কালী পূজা কমিটি ও সকল গ্রামবাসী</strong> যৌথভাবে মন্দির প্রতিষ্ঠা ও পূজা আয়োজনের একনিষ্ঠ উদ্যোগ গ্রহণ করেন।
          </p>
          <p>
            এই উদ্যোগ কেবল গ্রামের অমঙ্গল নাশ করেনি, বরং আমাদের সনাতন হিন্দু সমাজের ঐতিহ্য, সংস্কৃতি ও ভ্রাতৃত্বের বন্ধনকে আরও সুদৃঢ় ও ঐক্যবদ্ধ করেছে। মায়ের আশীর্বাদে আজ সাহাপুর বটতলা মোড় সর্বপ্রকার দুর্ঘটনা মুক্ত এক পরম পবিত্র পুণ্যতীর্থে পরিণত হয়েছে।
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-sanctum-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
          <ShieldAlert className="w-8 h-8 text-kumkum-600 mb-3" />
          <h4 className="font-serif font-bold text-base text-stone-900 dark:text-amber-50 mb-1">
            দুর্ঘটনা ও অপমৃত্যু নিবারণ
          </h4>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            সাহাপুর বটতলা মোড়ের সংকটাপন্ন পথ মা রক্ষা কালীর আশ্রয়ে আজ সম্পূর্ণ নিরাপদ। মা সদা জাগ্রত থেকে পথিক ও গ্রামবাসীকে রক্ষা করেন।
          </p>
        </div>

        <div className="bg-white dark:bg-sanctum-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
          <Users className="w-8 h-8 text-saffron-500 mb-3" />
          <h4 className="font-serif font-bold text-base text-stone-900 dark:text-amber-50 mb-1">
            সামাজিক সংহতি ও ঐক্য
          </h4>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            সাহাপুর ও লহণ্ডা অঞ্চলের সর্বস্তরের মানুষের সম্মিলিত সহযোগিতায় মায়ের মন্দির সংস্কার, ভোগ ও পূজার্চনা পরিচালিত হয়।
          </p>
        </div>

        <div className="bg-white dark:bg-sanctum-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
          <Sparkles className="w-8 h-8 text-amber-500 mb-3" />
          <h4 className="font-serif font-bold text-base text-stone-900 dark:text-amber-50 mb-1">
            সনাতন ঐতিহ্যের বিকাশ
          </h4>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
            অমাবস্যা ব্রত, নিত্য আরতি ও ধর্মীয় উৎসবের মধ্য দিয়ে সনাতন সংস্কৃতি ও আধ্যাত্মিক মূল্যবোধ সমুন্নত রাখা হয়।
          </p>
        </div>
      </div>
    </section>
  );
}
