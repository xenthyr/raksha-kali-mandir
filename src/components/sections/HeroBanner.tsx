import Image from "next/image";
import Link from "next/link";
import { SITE_CONFIG } from "@/config/site";
import FlowerOffering from "@/components/ui/FlowerOffering";
import { HeartHandshake, MapPin, MessageCircle, Sparkles } from "lucide-react";

export default function HeroBanner() {
  return (
    <section id="hero" className="relative pt-36 pb-20 md:py-48 px-4 text-center overflow-hidden">
      <div className="absolute inset-0 -z-20 opacity-20 dark:opacity-25 pointer-events-none">
        <Image
          src="/images/hero-mandir.svg"
          alt="শ্রী শ্রী মা রক্ষা কালী মন্দির শিখর"
          fill
          className="object-cover object-center"
          priority
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_30%,rgba(249,115,22,0.18)_0%,transparent_70%)]" />

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saffron-500/10 border border-saffron-500/30 text-saffron-600 dark:text-saffron-400 text-xs md:text-sm font-serif font-bold tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>॥ {SITE_CONFIG.shloka} ॥</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold text-stone-900 dark:text-amber-50 leading-tight">
          {SITE_CONFIG.name}
        </h1>

        <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm text-stone-600 dark:text-stone-400 font-medium">
          <MapPin className="w-4 h-4 text-saffron-600 shrink-0" />
          <span>{SITE_CONFIG.location.spot}, গ্রাম: সাহাপুর, লহণ্ডা • রায়গঞ্জ (৭৩৩১৩০)</span>
        </div>

        <p className="text-stone-600 dark:text-stone-300 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
          {SITE_CONFIG.tagline}। {SITE_CONFIG.committeeName}-এর সার্বিক পরিচালনায় প্রতিষ্ঠিত পুণ্যধাম।
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
          <Link
            href="/donate/"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-saffron-600 to-amber-600 hover:from-saffron-500 hover:to-amber-500 text-white text-sm font-bold shadow-lg shadow-saffron-600/30 transition active:scale-95"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>অনলাইন সেবা / প্রণামী দান</span>
          </Link>

          <a
            href={SITE_CONFIG.whatsapp.groupLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/25 transition active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>হোয়াটসঅ্যাপ গ্রুপে যোগ দিন</span>
          </a>
        </div>

        <FlowerOffering />
      </div>
    </section>
  );
}
