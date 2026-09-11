"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { GalleryItem } from "@/types";

interface LightboxProps {
  item: GalleryItem | null;
  onClose: () => void;
}

export default function LightboxModal({ item, onClose }: LightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (item) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", onKey);
    };
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-sanctum-900 border border-saffron-500/30 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-saffron-600 transition"
          aria-label="বন্ধ করুন"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative w-full h-[60vh] sm:h-[70vh] bg-black">
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 1024px"
            priority
          />
        </div>

        <div className="p-6 bg-sanctum-950 border-t border-stone-800">
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-saffron-600/20 text-saffron-400 border border-saffron-500/30">
            {item.category}
          </span>
          <h3 className="text-xl font-serif font-bold text-amber-50 mt-2">{item.title}</h3>
          <p className="text-stone-400 text-sm mt-1">{item.caption}</p>
        </div>
      </div>
    </div>
  );
}
