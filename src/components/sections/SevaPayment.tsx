"use client";

import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import { Smartphone, QrCode, AlertCircle, HeartHandshake } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";
import { isPhoneClient, toBengaliNumeral } from "@/lib/utils";

export default function SevaPayment() {
  const [amount, setAmount] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [qrNotice, setQrNotice] = useState<string>("PhonePe, Google Pay, Paytm বা যেকোনো UPI অ্যাপ দিয়ে স্ক্যান করুন");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const qrDockRef = useRef<HTMLDivElement>(null);

  const effectiveAmount = customInput ? parseInt(customInput, 10) : amount;

  const buildUpiUrl = (amt: number | null): string => {
    const encodedNote = encodeURIComponent(SITE_CONFIG.transactionNote);
    const encodedName = encodeURIComponent(SITE_CONFIG.payeeName);
    if (amt && amt >= SITE_CONFIG.minContribution) {
      return `upi://pay?pa=${encodeURIComponent(SITE_CONFIG.vpa)}&pn=${encodedName}&am=${amt}&cu=INR&tn=${encodedNote}`;
    }
    return `upi://pay?pa=${encodeURIComponent(SITE_CONFIG.vpa)}&pn=${encodedName}&cu=INR&tn=${encodedNote}`;
  };

  const handleSelectPreset = (val: number) => {
    setErrorMsg(null);
    setAmount(val);
    setCustomInput(val.toString());
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    let parsed = parseInt(raw, 10);

    if (parsed > 50000) parsed = 50000;

    if (raw === "" || isNaN(parsed)) {
      setCustomInput("");
      setAmount(null);
      setErrorMsg(null);
    } else {
      setCustomInput(parsed.toString());
      setAmount(parsed);
      if (parsed >= SITE_CONFIG.minContribution) {
        setErrorMsg(null);
      }
    }
  };

  const handleUpiClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!effectiveAmount || isNaN(effectiveAmount)) {
      e.preventDefault();
      setErrorMsg("অনুগ্রহ করে সেবার পরিমাণ নির্বাচন বা টাইপ করুন");
      return;
    }

    if (effectiveAmount < SITE_CONFIG.minContribution) {
      e.preventDefault();
      setErrorMsg(`Please enter a minimum of ₹${SITE_CONFIG.minContribution} to proceed`);
      return;
    }

    if (!isPhoneClient()) {
      e.preventDefault();
      setQrNotice(`Scan with your mobile UPI app to pay ₹${effectiveAmount}`);
      qrDockRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setTimeout(() => {
        setQrNotice("PhonePe, Google Pay, Paytm বা যেকোনো UPI অ্যাপ দিয়ে স্ক্যান করুন");
      }, 8000);
    }
  };

  const openCelebration = () => {
    setIsModalOpen(true);
    confetti({
      particleCount: 85,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#f97316", "#ea580c", "#dc2626", "#f59e0b", "#ffffff"],
    });
  };

  const currentUpiUri = buildUpiUrl(effectiveAmount);

  return (
    <section id="seva" className="py-20 px-4 max-w-md mx-auto">
      <div className="bg-white dark:bg-sanctum-900 border border-stone-200 dark:border-saffron-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-saffron-500/10 text-saffron-600 dark:text-saffron-400 text-xs font-bold mb-2">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>সরাসরি মন্দির ব্যাংক একাউন্টে (০% ফি)</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-amber-50">
            {SITE_CONFIG.name}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            নিত্য পূজা, ভোগরাগ ও মন্দির সংস্কার তহবিলে ভক্তিমতী প্রণামী নিবেদন করুন
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {SITE_CONFIG.presetAmounts.map((item) => (
            <button
              key={item.val}
              type="button"
              onClick={() => handleSelectPreset(item.val)}
              className={`py-3 rounded-xl font-bengali text-base font-bold transition-all ${
                effectiveAmount === item.val
                  ? "bg-saffron-600 text-white shadow-lg shadow-saffron-600/30 border border-saffron-500"
                  : "bg-stone-100 dark:bg-sanctum-950 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-800 hover:border-saffron-500"
              }`}
            >
              {item.bn}
            </button>
          ))}
        </div>

        <div className="relative mb-3">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-num font-bold text-stone-400">
            ₹
          </span>
          <input
            type="number"
            value={customInput}
            min={SITE_CONFIG.minContribution}
            max={50000}
            step={1}
            placeholder="Enter custom amount (Min ₹11)"
            onChange={handleCustomChange}
            onKeyDown={(e) => {
              if (["-", "+", "e", "."].includes(e.key)) e.preventDefault();
            }}
            className="w-full bg-stone-50 dark:bg-sanctum-950 border border-stone-300 dark:border-stone-800 focus:border-saffron-500 rounded-xl py-3 pl-8 pr-4 text-stone-900 dark:text-stone-100 font-num font-semibold text-sm outline-none transition"
          />
        </div>

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400 font-semibold mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div
          ref={qrDockRef}
          className="p-5 rounded-2xl bg-stone-50 dark:bg-sanctum-950 border border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center my-4"
        >
          <div className="p-3 bg-white rounded-xl shadow-md mb-2">
            <QRCodeSVG value={currentUpiUri} size={150} level="M" />
          </div>
          <span className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 text-center font-medium mt-1">
            <QrCode className="w-3.5 h-3.5 text-saffron-500" />
            {qrNotice}
          </span>
        </div>

        <a
          href={currentUpiUri}
          onClick={handleUpiClick}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-saffron-600 to-saffron-500 hover:from-saffron-500 hover:to-saffron-600 text-white font-bold text-sm shadow-lg shadow-saffron-600/30 transition active:scale-95"
        >
          <Smartphone className="w-4 h-4" />
          <span>
            {effectiveAmount && effectiveAmount >= SITE_CONFIG.minContribution
              ? `যেকোনো UPI অ্যাপে ₹${toBengaliNumeral(effectiveAmount)} প্রদান করুন`
              : "UPI অ্যাপে প্রণামী প্রদান করুন"}
          </span>
        </a>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={openCelebration}
            className="text-xs text-saffron-600 dark:text-saffron-400 font-bold hover:underline"
          >
            অর্থ স্থানান্তর সম্পন্ন করেছেন? প্রণামী নিবেদন নিশ্চিত করুন
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-800/80 flex items-center justify-center gap-2 text-[11px] text-stone-500 font-medium">
          <span>১০০% সরাসরি মন্দির ব্যাংক একাউন্টে</span>
          <span>•</span>
          <span>NPCI সুরক্ষিত</span>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-sanctum-900 border border-saffron-500/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-saffron-500/20 text-saffron-500 text-2xl flex items-center justify-center mx-auto mb-3">
              🌺
            </div>
            <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-amber-50 mb-2">
              প্রণামী অর্পণ সম্পন্ন হয়েছে!
            </h3>
            <p className="text-stone-600 dark:text-stone-300 text-xs leading-relaxed mb-5">
              মা রক্ষা কালীর চরণে আপনার শ্রদ্ধা ও অবদান গ্রহণ হলো। মায়ের কৃপায় আপনার ও আপনার পরিবারে চির শান্তি, সুস্বাস্থ্য ও মঙ্গল বর্ষিত হোক।
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-saffron-600 text-white font-bold text-xs hover:bg-saffron-500 transition"
            >
              মূল পাতায় ফিরে যান
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
