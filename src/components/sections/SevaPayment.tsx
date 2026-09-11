"use client";

import { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, QrCode } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";
import { toBengaliNumeral } from "@/lib/utils";

export default function SevaPayment() {
  const [activeAmount, setActiveAmount] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isErrorShaking, setIsErrorShaking] = useState<boolean>(false);
  const [isHighlightPulse, setIsHighlightPulse] = useState<boolean>(false);
  const [qrPromptText, setQrPromptText] = useState<string>(
    "PhonePe, Google Pay, Paytm বা যেকোনো UPI অ্যাপ দিয়ে স্ক্যান করুন"
  );
  const [isPromptActive, setIsPromptActive] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const qrDockRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desktopInstructionTimer = useRef<NodeJS.Timeout | null>(null);

  const effectiveAmount = customInput ? parseInt(customInput, 10) : activeAmount;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (desktopInstructionTimer.current) clearTimeout(desktopInstructionTimer.current);
    };
  }, []);

  // Escape key handler for confirmation modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeConfirmModal();
    };
    if (isModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  function isSmartphoneDevice(): boolean {
    if (typeof window === "undefined") return false;
    const ua = (navigator.userAgent || navigator.vendor || "").toLowerCase();
    if (/ipad|tablet|(android(?!.*mobile))|silk|kindle|playbook/i.test(ua)) {
      return false;
    }
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isMobileUA = /mobi|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini/i.test(ua);
    return Boolean(hasTouch && isMobileUA);
  }

  function clearError() {
    setErrorMsg(null);
    setIsErrorShaking(false);
  }

  function triggerError(message: string) {
    setErrorMsg(message);
    setIsErrorShaking(false);
    setTimeout(() => setIsErrorShaking(true), 10);
  }

  function buildUpiUri(amount: number | null): string {
    const encodedNote = encodeURIComponent(SITE_CONFIG.transactionNote);
    const encodedName = encodeURIComponent(SITE_CONFIG.payeeName);
    if (amount && amount >= SITE_CONFIG.minContribution) {
      return `upi://pay?pa=${encodeURIComponent(SITE_CONFIG.vpa)}&pn=${encodedName}&am=${amount}&cu=INR&tn=${encodedNote}`;
    }
    return `upi://pay?pa=${encodeURIComponent(SITE_CONFIG.vpa)}&pn=${encodedName}&cu=INR&tn=${encodedNote}`;
  }

  function setContribution(val: number) {
    clearError();
    setCustomInput(val.toString());
    setActiveAmount(val);
  }

  function handleCustomInput(e: React.ChangeEvent<HTMLInputElement>) {
    const rawVal = e.target.value.trim();
    let val = parseInt(rawVal, 10);

    if (val > 50000) {
      val = 50000;
      setCustomInput("50000");
    } else {
      setCustomInput(rawVal);
    }

    if (rawVal === "" || isNaN(val)) {
      setActiveAmount(null);
      clearError();
    } else if (val < SITE_CONFIG.minContribution) {
      setActiveAmount(val);
    } else {
      clearError();
      setActiveAmount(val);
    }
  }

  function validateMinAmount() {
    if (customInput !== "" && !isNaN(parseInt(customInput, 10)) && parseInt(customInput, 10) < SITE_CONFIG.minContribution) {
      triggerError(`অনুগ্রহ করে কমপক্ষে ₹${toBengaliNumeral(SITE_CONFIG.minContribution)} প্রদান করুন`);
    }
  }

  function handleUpiClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const inputVal = parseInt(customInput, 10);

    if (customInput !== "" && !isNaN(inputVal) && inputVal < SITE_CONFIG.minContribution) {
      e.preventDefault();
      triggerError(`অনুগ্রহ করে কমপক্ষে ₹${toBengaliNumeral(SITE_CONFIG.minContribution)} প্রদান করুন`);
      return;
    }

    if (!activeAmount || activeAmount <= 0) {
      e.preventDefault();
      triggerError("অনুগ্রহ করে সেবার পরিমাণ নির্বাচন বা টাইপ করুন");
      return;
    }

    if (activeAmount < SITE_CONFIG.minContribution) {
      e.preventDefault();
      triggerError(`অনুগ্রহ করে কমপক্ষে ₹${toBengaliNumeral(SITE_CONFIG.minContribution)} প্রদান করুন`);
      return;
    }

    const isPhone = isSmartphoneDevice();

    if (!isPhone) {
      e.preventDefault();

      if (desktopInstructionTimer.current) {
        clearTimeout(desktopInstructionTimer.current);
      }

      setIsHighlightPulse(true);
      setIsPromptActive(true);
      setQrPromptText(`মোবাইল ফোন দিয়ে এই QR কোডটি স্ক্যান করে ₹${toBengaliNumeral(activeAmount)} প্রদান করুন`);

      qrDockRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });

      desktopInstructionTimer.current = setTimeout(() => {
        setIsHighlightPulse(false);
        setIsPromptActive(false);
        setQrPromptText("PhonePe, Google Pay, Paytm বা যেকোনো UPI অ্যাপ দিয়ে স্ক্যান করুন");
        desktopInstructionTimer.current = null;
      }, 8500);
    }
  }

  function openConfirmModal() {
    setIsModalOpen(true);
    triggerConfetti();
  }

  function closeConfirmModal() {
    setIsModalOpen(false);
  }

  function triggerConfetti() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
    }

    const particles: Particle[] = [];
    const colors = ["#ff7e29", "#f97316", "#dc2626", "#f59e0b", "#ffffff"];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 14,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
      });
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.alpha -= 0.015;

        if (p.alpha > 0) {
          alive = true;
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
      });

      if (alive) {
        requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    draw();
  }

  const currentUpiUri = buildUpiUri(effectiveAmount);

  return (
    <section id="seva" className="relative flex justify-center items-center py-12 px-4">
      {/* Dynamic Confetti Particle Canvas */}
      <canvas ref={canvasRef} id="confettiCanvas" />

      {/* Main Payment Container */}
      <div className="glow-canvas-wrapper">
        <div className="ambient-glow-halo" />

        <div className="payment-card">
          {/* Card Topbar (Inherits theme automatically, internal toggle removed) */}
          <div className="card-topbar">
            <div className="status-badge">
              <span className="pulse-dot" />
              ॥ {SITE_CONFIG.shloka} ॥
            </div>
          </div>

          <h2 className="card-title">{SITE_CONFIG.name}</h2>
          <p className="card-subtitle">
            নিত্য পূজা, ভোগরাগ ও মন্দির সংরক্ষণ তহবিলে আপনার ভক্তিমতী প্রণামী অর্পণ করুন
          </p>

          {/* Preset Chips: Bengali Numerals with English Sub-label */}
          <div className="preset-grid">
            {SITE_CONFIG.presetAmounts.map((chip) => {
              const isActive = effectiveAmount === chip.val;
              return (
                <button
                  key={chip.val}
                  type="button"
                  data-amount={chip.val}
                  onClick={() => setContribution(chip.val)}
                  className={`tier-chip ${isActive ? "active" : ""}`}
                >
                  <span className="chip-bn">{chip.bn}</span>
                  <span className="chip-en">{chip.val}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Amount Field (Min ₹11) */}
          <div className={`input-wrapper ${errorMsg ? "error-state" : ""} ${isErrorShaking ? "error-shake" : ""}`}>
            <span className="currency-sign">₹</span>
            <input
              type="number"
              id="customInput"
              value={customInput}
              min={SITE_CONFIG.minContribution}
              max={50000}
              step={1}
              placeholder={`অন্য যেকোনো পরিমাণ লিখুন (কমপক্ষে ₹${toBengaliNumeral(SITE_CONFIG.minContribution)})`}
              onChange={handleCustomInput}
              onBlur={validateMinAmount}
              onKeyDown={(e) => {
                if (["-", "e", "+", "."].includes(e.key)) e.preventDefault();
              }}
            />
          </div>

          {/* Amount Error Alert */}
          <div className={`amount-error-alert ${errorMsg ? "visible" : ""}`}>
            <svg viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{errorMsg}</span>
          </div>

          {/* QR Viewport with Tech Frame Brackets */}
          <div ref={qrDockRef} className={`qr-tech-dock ${isHighlightPulse ? "highlight-pulse" : ""}`}>
            <div className="qr-frame">
              <div className="corner c-top-left" />
              <div className="corner c-top-right" />
              <div className="corner c-bottom-left" />
              <div className="corner c-bottom-right" />

              <div className="qr-plate">
                <QRCodeSVG value={currentUpiUri} size={136} level="M" />
              </div>
            </div>
            <div className={`qr-label ${isPromptActive ? "active-instruction" : ""}`}>
              {qrPromptText}
            </div>
          </div>

          {/* Action Button: Direct Mobile UPI Deep Link */}
          <div className="action-group">
            <a id="upiIntentBtn" href={currentUpiUri} className="btn-upi-pay" onClick={handleUpiClick}>
              <Smartphone className="w-5 h-5" />
              <span>
                {effectiveAmount && effectiveAmount >= SITE_CONFIG.minContribution
                  ? `যেকোনো UPI অ্যাপে ₹${toBengaliNumeral(effectiveAmount)} প্রদান করুন`
                  : "UPI অ্যাপে প্রণামী প্রদান করুন"}
              </span>
            </a>
          </div>

          {/* Post-Transfer Row */}
          <div className="post-pay-row">
            অর্থ স্থানান্তর সম্পন্ন করেছেন?{" "}
            <button type="button" className="post-pay-btn" onClick={openConfirmModal}>
              প্রণামী নিবেদন নিশ্চিত করুন
            </button>
          </div>

          {/* Trust Footer */}
          <div className="trust-footer">
            <span>১০০% সরাসরি মন্দির ব্যাংক অ্যাকাউন্টে (০% ফি)</span>
            <span className="dot">•</span>
            <span>NPCI সুরক্ষিত</span>
          </div>

          <div className="legal-notice">
            সার্বজনীন {SITE_CONFIG.committeeName}-এর ভক্তিমূলক সেবা তহবিল। ভক্তের প্রদত্ত প্রতিটি অর্থ সরাসরি মায়ের সেবায় ব্যয়িত হয়।
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <div className={`modal-overlay ${isModalOpen ? "active" : ""}`} onClick={closeConfirmModal}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-icon">🌺</div>
          <h3>প্রণামী অর্পণ সম্পন্ন হয়েছে!</h3>
          <p>
            মা রক্ষা কালীর চরণে আপনার শ্রদ্ধা ও অবদান গ্রহণ হলো। মায়ের কৃপায় আপনার ও আপনার পরিবারে চির শান্তি, সুস্বাস্থ্য ও মঙ্গল বর্ষিত হোক।
          </p>
          <button type="button" className="modal-nav-link" onClick={closeConfirmModal}>
            মূল পাতায় ফিরে যান
          </button>
        </div>
      </div>

      {/* Scoped CSS with Dynamic Theme Variables & Animations */}
      <style jsx global>{`
        :root {
          --font-bengali: 'Noto Sans Bengali', system-ui, sans-serif;
          --font-serif: 'Noto Serif Bengali', serif;
          --font-num: 'Plus Jakarta Sans', sans-serif;

          --radius-xl: 26px;
          --radius-lg: 16px;
          --radius-md: 12px;
          --radius-sm: 8px;
          --radius-full: 9999px;
          --transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);

          --saffron-bright: #ff7e29;
          --saffron-main: #f97316;
          --saffron-deep: #ea580c;
          --kumkum-red: #dc2626;

          --error-red: #f87171;
          --error-red-bg: rgba(239, 68, 68, 0.12);
          --error-red-border: rgba(239, 68, 68, 0.35);
        }

        /* Automatically inherits Dark Mode from Main Page */
        [data-theme="dark"] {
          --bg-canvas: #0c0a08;
          --text-main: #fdfaf6;
          --text-muted: #d5c8bb;
          --text-dim: #8c7d70;

          --card-bg: rgba(22, 18, 15, 0.9);
          --card-inner: rgba(255, 255, 255, 0.04);
          --card-border: rgba(249, 115, 22, 0.22);
          --card-border-focus: rgba(249, 115, 22, 0.65);
          --card-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.88);

          --qr-dock-bg: rgba(14, 12, 10, 0.85);
          --qr-bracket: #f97316;
          --divider-line: rgba(255, 255, 255, 0.08);
          --ambient-glow-1: rgba(249, 115, 22, 0.22);
          --ambient-glow-2: rgba(220, 38, 38, 0.16);

          --chip-bg: rgba(255, 255, 255, 0.04);
          --chip-border: rgba(255, 255, 255, 0.1);
          --chip-hover: rgba(249, 115, 22, 0.15);
          --prompt-highlight-bg: rgba(249, 115, 22, 0.15);
          --prompt-highlight-border: rgba(249, 115, 22, 0.4);
        }

        /* Automatically inherits Light Mode from Main Page */
        [data-theme="light"] {
          --bg-canvas: #fcfaf6;
          --text-main: #231a14;
          --text-muted: #6b5749;
          --text-dim: #9c8a7c;

          --card-bg: rgba(255, 255, 255, 0.95);
          --card-inner: #fdf6ec;
          --card-border: rgba(234, 88, 12, 0.22);
          --card-border-focus: rgba(234, 88, 12, 0.65);
          --card-shadow: 0 20px 45px -10px rgba(138, 64, 15, 0.1);

          --qr-dock-bg: #fffbf5;
          --qr-bracket: #ea580c;
          --divider-line: rgba(138, 64, 15, 0.12);
          --ambient-glow-1: rgba(249, 115, 22, 0.14);
          --ambient-glow-2: rgba(245, 158, 11, 0.12);

          --chip-bg: #fffbf5;
          --chip-border: rgba(234, 88, 12, 0.2);
          --chip-hover: #faebd7;
          --prompt-highlight-bg: rgba(249, 115, 22, 0.14);
          --prompt-highlight-border: rgba(234, 88, 12, 0.45);
        }

        .glow-canvas-wrapper {
          position: relative;
          width: 100%;
          max-width: 424px;
          margin: 0 auto;
        }

        .ambient-glow-halo {
          position: absolute;
          inset: -14px;
          background: radial-gradient(circle at 35% 20%, var(--ambient-glow-1) 0%, transparent 60%),
            radial-gradient(circle at 65% 80%, var(--ambient-glow-2) 0%, transparent 65%);
          filter: blur(40px);
          border-radius: 40px;
          opacity: 0.85;
          z-index: 0;
          pointer-events: none;
          animation: subtlePulse 6s ease-in-out infinite alternate;
        }

        @keyframes subtlePulse {
          0% {
            transform: scale(0.97);
            opacity: 0.65;
          }
          100% {
            transform: scale(1.03);
            opacity: 0.95;
          }
        }

        .payment-card {
          position: relative;
          z-index: 1;
          width: 100%;
          background: var(--card-bg);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--card-border);
          border-radius: var(--radius-xl);
          padding: 28px 24px 24px;
          text-align: center;
          box-shadow: var(--card-shadow);
          transition: border-color var(--transition), box-shadow var(--transition);
        }

        .card-topbar {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(249, 115, 22, 0.12);
          border: 1px solid rgba(249, 115, 22, 0.32);
          color: var(--saffron-bright);
          font-size: 13px;
          font-weight: 700;
          line-height: 1.6;
          padding: 3px 12px;
          border-radius: var(--radius-full);
          font-family: var(--font-serif);
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          background: var(--saffron-bright);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--saffron-bright);
          animation: blink 2s infinite;
          flex-shrink: 0;
        }

        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.35;
          }
        }

        .card-title {
          font-family: var(--font-serif);
          font-size: 1.65rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 6px;
          line-height: 1.45;
        }

        .card-subtitle {
          font-size: 0.9rem;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 18px;
        }

        .preset-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }

        .tier-chip {
          background: var(--chip-bg);
          border: 1px solid var(--chip-border);
          color: var(--text-main);
          padding: 10px 0;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: var(--transition);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
        }

        .tier-chip:hover {
          border-color: var(--card-border-focus);
          background: var(--chip-hover);
          transform: translateY(-1px);
        }

        .tier-chip.active {
          background: rgba(249, 115, 22, 0.2);
          border-color: var(--saffron-bright);
          color: var(--saffron-bright);
          box-shadow: 0 0 14px rgba(249, 115, 22, 0.3);
        }

        .chip-bn {
          font-family: var(--font-bengali);
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .chip-en {
          font-family: var(--font-num);
          font-size: 0.68rem;
          font-weight: 600;
          opacity: 0.65;
        }

        .input-wrapper {
          position: relative;
          margin-bottom: 6px;
        }

        .currency-sign {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-dim);
          pointer-events: none;
          font-family: var(--font-num);
          transition: color 0.2s ease;
        }

        .input-wrapper input {
          width: 100%;
          background: var(--card-inner);
          border: 1px solid var(--card-border);
          border-radius: var(--radius-md);
          padding: 12px 14px 12px 34px;
          color: var(--text-main);
          font-size: 0.98rem;
          font-weight: 600;
          font-family: var(--font-num);
          outline: none;
          transition: var(--transition);
          line-height: 1.5;
        }

        .input-wrapper input::placeholder {
          font-family: var(--font-bengali);
          font-size: 0.88rem;
          color: var(--text-dim);
          font-weight: 400;
          line-height: 1.6;
        }

        .input-wrapper input:focus {
          border-color: var(--saffron-bright);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.2);
        }

        .input-wrapper input:focus ~ .currency-sign {
          color: var(--saffron-bright);
        }

        .input-wrapper.error-state input {
          border-color: var(--error-red) !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25) !important;
        }

        .input-wrapper.error-state .currency-sign {
          color: var(--error-red) !important;
        }

        .input-wrapper.error-shake {
          animation: shake 0.36s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        @keyframes shake {
          10%,
          90% {
            transform: translate3d(-1.5px, 0, 0);
          }
          20%,
          80% {
            transform: translate3d(2.5px, 0, 0);
          }
          30%,
          50%,
          70% {
            transform: translate3d(-4px, 0, 0);
          }
          40%,
          60% {
            transform: translate3d(4px, 0, 0);
          }
        }

        .amount-error-alert {
          display: none;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: var(--error-red-bg);
          border: 1px solid var(--error-red-border);
          color: var(--error-red);
          font-size: 0.82rem;
          font-weight: 600;
          line-height: 1.5;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
          animation: fadeIn 0.2s ease-in;
        }

        .amount-error-alert.visible {
          display: flex;
        }

        .amount-error-alert svg {
          width: 15px;
          height: 15px;
          fill: currentColor;
          flex-shrink: 0;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .qr-tech-dock {
          background: var(--qr-dock-bg);
          border: 1px solid var(--card-border);
          border-radius: var(--radius-lg);
          padding: 16px;
          margin-top: 6px;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          overflow: hidden;
          transition: border-color var(--transition), box-shadow var(--transition);
        }

        .qr-tech-dock.highlight-pulse {
          border-color: var(--saffron-bright);
          box-shadow: 0 0 26px rgba(249, 115, 22, 0.45);
        }

        .qr-frame {
          position: relative;
          padding: 10px;
          display: inline-block;
        }

        .qr-plate {
          background: #ffffff;
          padding: 8px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 152px;
          height: 152px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }

        .corner {
          position: absolute;
          width: 12px;
          height: 12px;
          border-color: var(--qr-bracket);
          border-style: solid;
          pointer-events: none;
        }
        .c-top-left {
          top: 2px;
          left: 2px;
          border-width: 2.5px 0 0 2.5px;
          border-top-left-radius: 4px;
        }
        .c-top-right {
          top: 2px;
          right: 2px;
          border-width: 2.5px 2.5px 0 0;
          border-top-right-radius: 4px;
        }
        .c-bottom-left {
          bottom: 2px;
          left: 2px;
          border-width: 0 0 2.5px 2.5px;
          border-bottom-left-radius: 4px;
        }
        .c-bottom-right {
          bottom: 2px;
          right: 2px;
          border-width: 0 2.5px 2.5px 0;
          border-bottom-right-radius: 4px;
        }

        .qr-label {
          margin-top: 10px;
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--text-muted);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          transition: all 0.3s ease;
          line-height: 1.5;
        }

        .qr-label.active-instruction {
          background: var(--prompt-highlight-bg);
          border: 1px solid var(--prompt-highlight-border);
          color: var(--saffron-bright);
          font-weight: 700;
          box-shadow: 0 0 14px rgba(249, 115, 22, 0.25);
          animation: alertPulse 1.8s ease-in-out infinite alternate;
        }

        @keyframes alertPulse {
          0% {
            transform: scale(0.99);
          }
          100% {
            transform: scale(1.02);
          }
        }

        .action-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .btn-upi-pay {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          background: linear-gradient(135deg, var(--saffron-main) 0%, var(--saffron-deep) 100%);
          color: #ffffff;
          text-decoration: none;
          padding: 14px 18px;
          border-radius: var(--radius-md);
          font-size: 1.02rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(234, 88, 12, 0.38);
          transition: var(--transition);
          font-family: var(--font-bengali);
          line-height: 1.5;
        }

        .btn-upi-pay:hover {
          background: linear-gradient(135deg, var(--saffron-bright) 0%, var(--saffron-main) 100%);
          box-shadow: 0 8px 24px rgba(234, 88, 12, 0.5);
          transform: translateY(-1px);
        }

        .post-pay-row {
          margin-top: 14px;
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .post-pay-btn {
          background: none;
          border: none;
          color: var(--saffron-bright);
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
          font-family: var(--font-bengali);
          line-height: 1.5;
        }

        .trust-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 14px;
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-dim);
          line-height: 1.5;
        }

        .trust-footer .dot {
          opacity: 0.4;
        }

        .legal-notice {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid var(--divider-line);
          font-size: 0.74rem;
          line-height: 1.6;
          color: var(--text-dim);
        }

        #confettiCanvas {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1000;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(12, 10, 8, 0.8);
          backdrop-filter: blur(12px);
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .modal-overlay.active {
          opacity: 1;
          pointer-events: auto;
        }

        .modal-card {
          width: 100%;
          max-width: 360px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: var(--radius-xl);
          padding: 28px 24px;
          text-align: center;
          box-shadow: var(--card-shadow);
          transform: scale(0.92);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-overlay.active .modal-card {
          transform: scale(1);
        }

        .modal-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(249, 115, 22, 0.15);
          color: var(--saffron-bright);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
          font-size: 1.4rem;
          border: 1px solid var(--saffron-bright);
        }

        .modal-card h3 {
          font-family: var(--font-serif);
          font-size: 1.3rem;
          font-weight: 700;
          margin-bottom: 6px;
          color: var(--text-main);
          line-height: 1.5;
        }

        .modal-card p {
          font-size: 0.86rem;
          color: var(--text-muted);
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .modal-nav-link {
          display: block;
          width: 100%;
          background: var(--card-inner);
          border: 1px solid var(--card-border);
          color: var(--text-main);
          padding: 12px;
          border-radius: var(--radius-md);
          font-weight: 700;
          font-size: 0.92rem;
          text-decoration: none;
          cursor: pointer;
          font-family: var(--font-bengali);
          transition: var(--transition);
          line-height: 1.5;
        }

        .modal-nav-link:hover {
          border-color: var(--saffron-bright);
          color: var(--saffron-bright);
        }
      `}</style>
    </section>
  );
}
