import Link from "next/link";
import SevaPayment from "@/components/sections/SevaPayment";
import { ArrowLeft } from "lucide-react";

export default function DonatePage() {
  return (
    <div className="pt-28 pb-16 px-4">
      <div className="max-w-md mx-auto mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-saffron-600 dark:hover:text-saffron-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>মূল মন্দির ওয়েবসাইটে ফিরে যান</span>
        </Link>
      </div>
      <SevaPayment />
    </div>
  );
}
