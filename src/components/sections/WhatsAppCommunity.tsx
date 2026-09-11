import { MessageCircle, ExternalLink, Users, Bell } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export default function WhatsAppCommunity() {
  return (
    <section className="py-12 px-4 max-w-4xl mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900/90 via-sanctum-900 to-sanctum-950 border border-emerald-500/30 p-8 sm:p-10 shadow-2xl text-white">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              <Users className="w-3.5 h-3.5" />
              <span>অফিসিয়াল গ্রাম্য কমিউনিটি</span>
            </div>

            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-amber-50">
              মন্দির কমিটির হোয়াটসঅ্যাপ গ্রুপে যুক্ত হোন
            </h3>

            <p className="text-stone-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              {SITE_CONFIG.whatsapp.noticeText}
            </p>

            <div className="flex items-center justify-center md:justify-start gap-4 text-xs text-emerald-300/80 pt-1">
              <span className="flex items-center gap-1"><Bell className="w-3.5 h-3.5" /> পূজার আপডেট</span>
              <span>•</span>
              <span>হিসাব ও সংস্কারের তথ্য</span>
              <span>•</span>
              <span>সরাসরি সম্পৃক্ততা</span>
            </div>
          </div>

          <a
            href={SITE_CONFIG.whatsapp.groupLink}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2.5 px-6 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-sanctum-950 font-bold text-sm shadow-xl shadow-emerald-900/40 transition active:scale-95"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>গ্রুপে যুক্ত হোন</span>
            <ExternalLink className="w-4 h-4 opacity-80" />
          </a>
        </div>
      </div>
    </section>
  );
}
