import { MapPin, Navigation, ExternalLink, Compass } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export default function LocationMap() {
  return (
    <section id="location" className="py-20 px-4 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <span className="text-xs font-bold text-saffron-600 dark:text-saffron-400 uppercase tracking-wider">
          তীর্থ দর্শন ও যাতায়াত
        </span>
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 dark:text-amber-50 mt-1">
          মন্দিরে পৌঁছানোর পথ ও অবস্থান
        </h2>
        <p className="text-stone-600 dark:text-stone-400 text-sm mt-1">
          {SITE_CONFIG.location.fullAddressBn}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-sanctum-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-saffron-500/10 text-saffron-600 dark:text-saffron-400 shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-amber-50">
                  গুগল ম্যাপস নেভিগেশন (সরাসরি অবস্থান)
                </h3>
                <p className="text-stone-500 dark:text-stone-400 text-xs mt-0.5 leading-relaxed">
                  সাহাপুর বটতলা মোড়ে অবস্থিত শ্রী শ্রী মা রক্ষা কালী মন্দিরের নির্ধারিত ভৌগোলিক পিন পয়েন্ট।
                </p>
              </div>
            </div>

            <div className="w-full h-44 rounded-2xl bg-stone-100 dark:bg-sanctum-950 border border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center text-center p-4">
              <Compass className="w-8 h-8 text-saffron-500 mb-2" />
              <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                {SITE_CONFIG.location.spot}
              </p>
              <span className="text-[11px] text-stone-500 mt-0.5">
                গ্রাম: সাহাপুর, ডাকঘর: লহণ্ডা, রায়গঞ্জ • পিন: ৭৩৩১৩০
              </span>
            </div>
          </div>

          <a
            href={SITE_CONFIG.location.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-saffron-600 to-amber-600 hover:from-saffron-500 hover:to-amber-500 text-white text-sm font-bold shadow-lg shadow-saffron-600/20 transition active:scale-95"
          >
            <Navigation className="w-4 h-4" />
            <span>গুগল ম্যাপে দিকনির্দেশ দেখুন (Google Maps)</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>

        <div className="bg-white dark:bg-sanctum-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 space-y-4 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-amber-50 border-b border-stone-100 dark:border-stone-800 pb-3">
            যাতায়াত সহায়িকা
          </h3>

          <div className="space-y-3.5 text-xs">
            <div>
              <span className="text-saffron-600 dark:text-saffron-400 font-bold block mb-0.5">
                রায়গঞ্জ শহর থেকে:
              </span>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                শিলিগুড়ি মোড় বা রায়গঞ্জ ঘড়িমোড় থেকে সরাসরি টোটো, অটো কিংবা নিজস্ব বাইক/গাড়িতে সাহাপুর বটতলা মোড়ে পৌঁছানো যায়।
              </p>
            </div>

            <div>
              <span className="text-saffron-600 dark:text-saffron-400 font-bold block mb-0.5">
                নিকটতম রেলস্টেশন:
              </span>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                রায়গঞ্জ রেলওয়ে স্টেশন (RGJ)। স্টেশন থেকে স্থানীয় টোটো বা অটোযোগে লহণ্ডা-সাহাপুর বটতলা মোড় পৌঁছানো সুগম।
              </p>
            </div>

            <div>
              <span className="text-saffron-600 dark:text-saffron-400 font-bold block mb-0.5">
                ডাকঘর ও পিন:
              </span>
              <p className="text-stone-600 dark:text-stone-400 font-mono font-bold">
                ডাকঘর: লহণ্ডা, পিন: 733130
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
