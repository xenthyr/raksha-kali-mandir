"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

export interface InternalNoteDraft { body: string; }
export interface InternalNoteSubmitResult {
  ok: boolean;
  errorCode?: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "VALIDATION" | "DEPENDENCY" | "INTERNAL";
  message?: string;
}
export interface InternalNoteProps {
  ticketId: string;
  initialValue?: string;
  disabled?: boolean;
  submitting?: boolean;
  onSubmit: (draft: InternalNoteDraft) => Promise<InternalNoteSubmitResult>;
}

function failureCopy(result: InternalNoteSubmitResult) {
  switch (result.errorCode) {
    case "UNAUTHORIZED": return "আপনার সেশনটি আর বৈধ নয়। আবার সাইন ইন করুন।";
    case "FORBIDDEN": return "এই টিকিটে অভ্যন্তরীণ নোট লেখার অনুমতি আপনার নেই।";
    case "NOT_FOUND": return "টিকিটটি পাওয়া যায়নি। সর্বশেষ inbox অবস্থা খুলুন।";
    case "CONFLICT": return "টিকিটের সংস্করণ বদলে গেছে। সর্বশেষ অবস্থা দেখে আবার চেষ্টা করুন।";
    case "VALIDATION": return result.message ?? "নোটটি যাচাই করা যায়নি।";
    case "DEPENDENCY": return "সংরক্ষণকারী সেবা এই মুহূর্তে প্রস্তুত নয়। পরে আবার চেষ্টা করুন।";
    default: return "নোট সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।";
  }
}

export default function InternalNote({ ticketId, initialValue = "", disabled = false, submitting = false, onSubmit }: InternalNoteProps) {
  const id = useId();
  const [body, setBody] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const lastTicketId = useRef(ticketId);

  useEffect(() => {
    if (ticketId !== lastTicketId.current) {
      lastTicketId.current = ticketId;
      setBody(initialValue);
      setError(null);
      setSaved(false);
    }
  }, [initialValue, ticketId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || submitting) return;
    const normalized = body.trim();
    setError(null); setSaved(false);
    if (!ticketId) return setError("টিকিট শনাক্ত করা যায়নি।");
    if (!normalized) return setError("একটি অভ্যন্তরীণ নোট লিখুন।");
    const result = await onSubmit({ body: normalized });
    if (!result.ok) return setError(failureCopy(result));
    setBody(""); setSaved(true);
  };

  return (
    <section className="w-full rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900" aria-hidden="true">●</div>
        <div><h3 className="text-base font-semibold text-[color:var(--color-text,#241b16)]">অভ্যন্তরীণ নোট</h3><p className="mt-1 text-xs leading-5 text-amber-950/75">শুধুমাত্র অনুমোদিত স্টাফের জন্য। requester-facing timeline-এ এই লেখা কখনও প্রকাশ করা যাবে না।</p></div>
      </div>
      <form className="mt-4" onSubmit={submit} noValidate>
        <label htmlFor={id} className="sr-only">অভ্যন্তরীণ নোট</label>
        <textarea id={id} rows={5} value={body} disabled={disabled || submitting} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => { setBody(event.target.value); setError(null); setSaved(false); }} className="min-h-32 w-full resize-y rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm leading-6 text-[color:var(--color-text,#241b16)] outline-none placeholder:text-[color:var(--color-muted,#6d5b4f)] focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50" placeholder="কাজের অগ্রগতি, যাচাই বা পরবর্তী পদক্ষেপ লিখুন…" />
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[color:var(--color-muted,#6d5b4f)]">{body.length.toLocaleString("bn-IN")} অক্ষর</p><button type="submit" disabled={disabled || submitting || body.trim().length === 0} className="min-h-11 rounded-xl bg-[color:var(--color-vermilion,#9e2d1b)] px-4 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400">{submitting ? "সংরক্ষণ হচ্ছে…" : "নোট সংরক্ষণ করুন"}</button></div>
        <div className="mt-3 min-h-6" aria-live="polite">{error ? <p className="text-sm text-rose-800" role="alert">{error}</p> : null}{saved ? <p className="text-sm text-emerald-800">নোটটি নিরাপদে সংরক্ষিত হয়েছে।</p> : null}</div>
      </form>
    </section>
  );
}
