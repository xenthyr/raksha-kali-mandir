import { SITE_CONFIG } from "@/config/site";
import { MapPin, MessageCircle, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-stone-200 dark:border-stone-900 bg-stone-100 dark:bg-sanctum-950 py-12 px-4 text-center text-xs text-stone-500">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h3 className="font-serif text-lg font-bold text-stone-800 dark:text-stone-200">
            {SITE_CONFIG.name}
          </h3>
          <p className="text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
            {SITE_CONFIG.committeeName}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
          <MapPin className="w-4 h-4 text-saffron-600 shrink-0" />
          <span>{SITE_CONFIG.location.fullAddressBn}</span>
        </div>

        <div className="flex justify-center pt-1">
          <a
            href={SITE_CONFIG.whatsapp.groupLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>অফিসিয়াল হোয়াটসঅ্যাপ গ্রুপে যোগ দিন</span>
          </a>
        </div>

        <div className="border-t border-stone-200 dark:border-stone-900 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-stone-400">
          <p>© {new Date().getFullYear()} {SITE_CONFIG.name}। সর্বস্বত্ব সংরক্ষিত।</p>
          <p className="flex items-center gap-1">
            ভক্তিমূলক সেবায় সর্বজনীন গ্রামবাসী <Heart className="w-3 h-3 text-kumkum-600" />
          </p>
        </div>
      </div>
    </footer>
  );
}
