"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import AttachmentUploader, { type PublicGrievanceUploadLimits, type SelectedSupportFile } from "./AttachmentUploader";
import type { SupportCategoryCode, TicketCategoryOption } from "./TicketComposer";

export interface TicketFormValues {
  name: string;
  email: string;
  categoryCode: SupportCategoryCode | "";
  subject: string;
  message: string;
  attachments: readonly SelectedSupportFile[];
  idempotencyKey: string;
}

export interface TicketFormResult {
  ok: boolean;
  errorCode?: "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "RATE_LIMITED" | "CONFLICT" | "DEPENDENCY" | "INTERNAL";
  message?: string;
  publicReference?: string;
  trackingPin?: string;
}

export interface TicketFormProps {
  categories: readonly TicketCategoryOption[];
  attachmentLimits?: PublicGrievanceUploadLimits;
  disabled?: boolean;
  submitting?: boolean;
  turnstileReady?: boolean;
  onSubmit: (values: TicketFormValues) => Promise<TicketFormResult>;
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function safeError(result: TicketFormResult): string {
  switch (result.errorCode) {
    case "VALIDATION": return result.message ?? "অনুগ্রহ করে ফর্মের তথ্য আবার পরীক্ষা করুন।";
    case "RATE_LIMITED": return "অনেক দ্রুত অনুরোধ পাঠানো হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।";
    case "CONFLICT": return "এই অনুরোধের ফলাফল ইতিমধ্যে সংরক্ষিত বা পরিবর্তিত হয়েছে।";
    case "FORBIDDEN": return "অনুরোধটি গ্রহণ করার অনুমতি নেই।";
    case "UNAUTHORIZED": return "সেশনটি আর বৈধ নয়। আবার চেষ্টা করুন।";
    case "DEPENDENCY": return "সহায়তা পরিষেবার একটি নির্ভরতা এখন সাময়িকভাবে ব্যস্ত।";
    default: return "অনুরোধ সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।";
  }
}

export default function TicketForm({ categories, attachmentLimits, disabled = false, submitting = false, turnstileReady = false, onSubmit }: TicketFormProps) {
  const nameId = useId();
  const emailId = useId();
  const categoryId = useId();
  const subjectId = useId();
  const messageId = useId();
  const errorId = useId();
  const keyRef = useRef(newIdempotencyKey());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [categoryCode, setCategoryCode] = useState<SupportCategoryCode | "">("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<SelectedSupportFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TicketFormResult | null>(null);

  const canSubmit = useMemo(() => {
    return !disabled && !submitting && Boolean(name.trim()) && validEmail(email.trim()) && Boolean(categoryCode) && Boolean(subject.trim()) && Boolean(message.trim());
  }, [categoryCode, disabled, email, message, name, subject, submitting]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedSubject = subject.trim();
    const normalizedMessage = message.trim();
    if (!normalizedName) return setError("আপনার নাম দিন।");
    if (!validEmail(normalizedEmail)) return setError("একটি বৈধ ইমেল ঠিকানা দিন।");
    if (!categoryCode) return setError("একটি সহায়তা বিভাগ নির্বাচন করুন।");
    if (!normalizedSubject) return setError("বিষয় লিখুন।");
    if (!normalizedMessage) return setError("বিস্তারিত লিখুন।");
    if (attachmentLimits && attachments.length > attachmentLimits.maxFiles) return setError("অনুমোদিত সীমার বেশি সংযুক্তি রয়েছে।");

    try {
      const response = await onSubmit({
        name: normalizedName,
        email: normalizedEmail,
        categoryCode,
        subject: normalizedSubject,
        message: normalizedMessage,
        attachments,
        idempotencyKey: keyRef.current,
      });
      if (!response.ok) return setError(safeError(response));
      setResult(response);
      setName(""); setEmail(""); setCategoryCode(""); setSubject(""); setMessage(""); setAttachments([]);
      keyRef.current = newIdempotencyKey();
    } catch {
      setError("অনুরোধ সম্পূর্ণ করা যায়নি। আপনার তথ্য আবার পাঠানোর আগে কিছুক্ষণ অপেক্ষা করুন।");
    }
  };

  return (
    <section className="w-full overflow-hidden rounded-3xl border border-[color:var(--color-border,#e7d9c6)] bg-[color:var(--color-ivory,#fffaf3)] shadow-[0_18px_50px_rgba(91,44,17,0.07)]">
      <header className="border-b border-[color:var(--color-border,#e7d9c6)] px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 py-1.5 text-[11px] font-semibold text-[color:var(--color-vermilion,#9e2d1b)]"><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />সহায়তা / অভিযোগ</span>
          <span className="text-xs text-[color:var(--color-muted,#6d5b4f)]">Reference + PIN tracking</span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--color-text,#241b16)] sm:text-3xl">আপনার বিষয়টি আমাদের জানান</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--color-muted,#6d5b4f)]">প্রয়োজনীয় তথ্য দিন। টিকিটটি স্থায়ীভাবে সংরক্ষিত হলে আপনি একটি public reference এবং ৪ সংখ্যার tracking PIN পাবেন। Reference একা ticket access দেয় না।</p>
      </header>

      <form onSubmit={submit} noValidate aria-describedby={error ? errorId : undefined} className="space-y-5 px-5 py-6 sm:px-7">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor={nameId} className="mb-2 block text-sm font-semibold text-[color:var(--color-text,#241b16)]">নাম <span aria-hidden="true">*</span></label>
            <input id={nameId} value={name} onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)} autoComplete="name" disabled={disabled || submitting} className="min-h-12 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3.5 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15 disabled:bg-slate-50" />
          </div>
          <div>
            <label htmlFor={emailId} className="mb-2 block text-sm font-semibold text-[color:var(--color-text,#241b16)]">ইমেল <span aria-hidden="true">*</span></label>
            <input id={emailId} type="email" value={email} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} autoComplete="email" inputMode="email" disabled={disabled || submitting} className="min-h-12 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3.5 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15 disabled:bg-slate-50" />
            <p className="mt-1.5 text-xs leading-5 text-[color:var(--color-muted,#6d5b4f)]">আপনার ইমেল public tracking view-তে দেখানো হবে না।</p>
          </div>
        </div>

        <div>
          <label htmlFor={categoryId} className="mb-2 block text-sm font-semibold text-[color:var(--color-text,#241b16)]">বিষয়ের বিভাগ <span aria-hidden="true">*</span></label>
          <select id={categoryId} value={categoryCode} onChange={(event: ChangeEvent<HTMLSelectElement>) => setCategoryCode(event.target.value as SupportCategoryCode | "")} disabled={disabled || submitting} className="min-h-12 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3.5 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15 disabled:bg-slate-50">
            <option value="">বিভাগ নির্বাচন করুন</option>
            {categories.map((item) => <option key={item.code} value={item.code} disabled={item.enabled === false}>{item.labelBn}{item.labelEn ? ` · ${item.labelEn}` : ""}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor={subjectId} className="mb-2 block text-sm font-semibold text-[color:var(--color-text,#241b16)]">বিষয় <span aria-hidden="true">*</span></label>
          <input id={subjectId} value={subject} onChange={(event: ChangeEvent<HTMLInputElement>) => setSubject(event.target.value)} disabled={disabled || submitting} maxLength={180} className="min-h-12 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3.5 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15 disabled:bg-slate-50" />
          <p className="mt-1.5 text-right text-[11px] text-[color:var(--color-muted,#6d5b4f)]">{subject.length}/180</p>
        </div>

        <div>
          <label htmlFor={messageId} className="mb-2 block text-sm font-semibold text-[color:var(--color-text,#241b16)]">বিস্তারিত <span aria-hidden="true">*</span></label>
          <textarea id={messageId} value={message} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value)} rows={9} maxLength={6000} disabled={disabled || submitting} className="min-h-52 w-full resize-y rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3.5 py-3 text-sm leading-6 outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15 disabled:bg-slate-50" />
          <p className="mt-1.5 text-right text-[11px] text-[color:var(--color-muted,#6d5b4f)]">{message.length}/6000</p>
        </div>

        {attachmentLimits ? <AttachmentUploader value={attachments} onChange={setAttachments} limits={attachmentLimits} disabled={disabled || submitting} /> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-4 py-3 text-xs leading-5 text-[color:var(--color-muted,#6d5b4f)]">টিকিট D1-এ durable record হিসেবে সংরক্ষিত হওয়ার পর notification workflow আলাদাভাবে চলে। Email ব্যর্থ হলেও ticket মুছে যাবে না।</div>
          <div className="rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-4 py-3 text-xs leading-5 text-[color:var(--color-muted,#6d5b4f)]">{turnstileReady ? "নিরাপত্তা যাচাই প্রস্তুত আছে।" : "নিরাপত্তা যাচাই server-side boundary-তে সম্পন্ন হবে।"} সংযুক্তির final authorization client-side নয়।</div>
        </div>

        <div id={errorId} className="min-h-6" aria-live="polite">{error ? <p role="alert" className="text-sm leading-6 text-rose-800">{error}</p> : null}</div>

        {result?.ok && result.publicReference ? (
          <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 sm:p-5">
            <p className="text-sm font-semibold">আপনার সহায়তা অনুরোধ সংরক্ষিত হয়েছে।</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white/80 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Reference</p><p className="mt-1 font-mono text-lg font-bold tracking-wide">{result.publicReference}</p></div>
              <div className="rounded-xl bg-white/80 p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Tracking PIN</p><p className="mt-1 font-mono text-lg font-bold tracking-[0.32em]">{result.trackingPin ?? "••••"}</p></div>
            </div>
            <p className="mt-3 text-xs leading-5">এই দুইটি তথ্য নিরাপদে রাখুন। Public tracking-এ reference এবং PIN দুটিই প্রয়োজন।</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-[color:var(--color-border,#e7d9c6)] pt-5 sm:flex-row sm:items-center sm:justify-end">
          <p className="text-xs leading-5 text-[color:var(--color-muted,#6d5b4f)] sm:mr-auto">প্রেরণের পর ticket identity server-generated হবে; এই ফর্ম কোনো canonical ticket ID তৈরি করে না।</p>
          <button type="submit" disabled={!canSubmit} className="min-h-12 rounded-xl bg-[color:var(--color-vermilion,#9e2d1b)] px-6 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2 motion-reduce:transform-none disabled:cursor-not-allowed disabled:bg-slate-400">{submitting ? "সংরক্ষণ হচ্ছে…" : "অনুরোধ পাঠান"}</button>
        </div>
      </form>
    </section>
  );
}
