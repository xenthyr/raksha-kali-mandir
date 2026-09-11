"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, Sparkles } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";
import { GalleryItem } from "@/types";
import LightboxModal from "@/components/ui/LightboxModal";

export default function TempleGallery() {
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);

  return (
    <section id="gallery" className="py-20 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saffron-500/10 border border-saffron-500/20 text-saffron-600 dark:text-saffron-400 text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>পবিত্র চিত্রশালা</span>
        </div>
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 dark:text-amber-50">
          মন্দির ও উৎসবের দর্শন
        </h2>
        <p className="text-stone-600 dark:text-stone-400 text-sm mt-1">
          ছবিতে ক্লিক করে পূর্ণ রূপ দর্শন করুন
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {SITE_CONFIG.galleryItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveItem(item)}
            className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer bg-sanctum-900 border border-stone-200 dark:border-stone-800 shadow-md hover:shadow-xl hover:border-saffron-500/50 transition-all duration-300"
          >
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

            <div className="absolute bottom-0 inset-x-0 p-5 text-white">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-saffron-600 text-white inline-block mb-1.5">
                {item.category}
              </span>
              <h3 className="font-serif font-bold text-base text-amber-50 leading-snug">
                {item.title}
              </h3>
              <p className="text-xs text-stone-300 mt-1 line-clamp-1">{item.caption}</p>
            </div>

            <div className="absolute top-3 right-3 p-2 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      <LightboxModal item={activeItem} onClose={() => setActiveItem(null)} />
    </section>
  );
}
