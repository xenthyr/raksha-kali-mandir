"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Flame, Menu, X, Sun, Moon, HeartHandshake } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const cur = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "dark";
    setTheme(cur);

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("mandir_theme", nextTheme);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 dark:bg-sanctum-950/95 backdrop-blur-md py-3 shadow-md border-b border-saffron-500/20"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-saffron-600 to-amber-500 flex items-center justify-center shadow-lg shadow-saffron-600/30 group-hover:scale-105 transition-transform">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-serif text-lg md:text-xl font-bold text-stone-900 dark:text-amber-50 block leading-tight">
              {SITE_CONFIG.name}
            </span>
            <span className="text-[11px] text-saffron-600 dark:text-saffron-400 font-semibold tracking-wide">
              {SITE_CONFIG.location.spot}, রায়গঞ্জ
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-5 lg:gap-6">
          {SITE_CONFIG.navLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-stone-700 dark:text-stone-300 hover:text-saffron-600 dark:hover:text-saffron-400 text-sm font-semibold transition"
            >
              {item.label}
            </a>
          ))}

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-full bg-stone-200/70 dark:bg-sanctum-900 border border-stone-300 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:text-saffron-600 transition"
            aria-label="থিম পরিবর্তন"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link
            href="/donate/"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-saffron-600 to-saffron-500 hover:from-saffron-500 hover:to-saffron-600 text-white text-xs font-bold shadow-md shadow-saffron-600/30 transition-all active:scale-95"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>প্রণামী অর্পণ</span>
          </Link>
        </nav>

        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-stone-200/80 dark:bg-sanctum-900 text-stone-700 dark:text-stone-300"
            aria-label="থিম পরিবর্তন"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg bg-stone-200/80 dark:bg-sanctum-900 text-stone-700 dark:text-stone-300"
            aria-label="মেনু"
          >
            {isOpen ? <X className="w-6 h-6 text-saffron-600" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden fixed inset-x-0 top-[65px] bg-white/95 dark:bg-sanctum-950/95 backdrop-blur-xl border-b border-stone-200 dark:border-stone-800 px-6 py-8 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-top-4 duration-200">
          {SITE_CONFIG.navLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="text-base font-semibold text-stone-800 dark:text-stone-200 hover:text-saffron-600 dark:hover:text-saffron-400 py-2 border-b border-stone-100 dark:border-stone-900"
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/donate/"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-3.5 mt-2 rounded-xl bg-saffron-600 text-white font-bold text-sm shadow-lg shadow-saffron-600/30"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>সরাসরি প্রণামী প্রদান করুন</span>
          </Link>
        </div>
      )}
    </header>
  );
}
