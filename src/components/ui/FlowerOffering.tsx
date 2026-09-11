"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toBengaliNumeral } from "@/lib/utils";

export default function FlowerOffering() {
  const [offeredCount, setOfferedCount] = useState<number>(108);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const handleOfferFlower = () => {
    setOfferedCount((prev) => prev + 1);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 850);
  };

  return (
    <div className="flex flex-col items-center justify-center pt-2">
      <div className="relative">
        <button
          type="button"
          onClick={handleOfferFlower}
          className="group relative flex items-center gap-2.5 px-6 py-3 rounded-full bg-sanctum-900/80 dark:bg-sanctum-900 border border-saffron-500/40 hover:border-saffron-500 text-amber-50 shadow-lg shadow-saffron-950/20 active:scale-95 transition-all duration-200"
        >
          <span className="text-xl group-hover:scale-125 transition-transform duration-200 select-none">
            🌺
          </span>
          <span className="text-sm font-semibold font-serif">মায়ের চরণে জবা নিবেদন</span>
          <Sparkles className="w-4 h-4 text-saffron-400 group-hover:rotate-45 transition-transform duration-300" />
        </button>

        {isAnimating && (
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-xs font-serif text-saffron-500 dark:text-saffron-400 font-bold animate-bounce whitespace-nowrap bg-white dark:bg-sanctum-950 px-3 py-1 rounded-full border border-saffron-500/30 shadow-md">
            ॥ শ্রী চরণে ভক্তিশ্রদ্ধা নিবেদিত ॥
          </span>
        )}
      </div>

      <p className="text-xs text-stone-500 dark:text-stone-400 mt-2.5 font-medium">
        আজ সর্বমোট ভক্তিমতী পুষ্প নিবেদন:{" "}
        <span className="text-saffron-600 dark:text-saffron-400 font-bold">
          {toBengaliNumeral(offeredCount)}
        </span>{" "}
        টি
      </p>
    </div>
  );
}
