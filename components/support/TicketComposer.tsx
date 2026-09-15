"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import AttachmentUploader, { PublicGrievanceUploadLimits, SelectedSupportFile } from "./AttachmentUploader";

export type SupportCategoryCode = "FINANCE" | "PUJA" | "GRIEVANCE" | "GENERAL";
export interface TicketCategoryOption { code: SupportCategoryCode; labelBn: string; labelEn?: string; enabled?: boolean; }
export type TicketComposerMode = "PUBLIC_TICKET" | "STAFF_REPLY";
export interface TicketComposerValues {
  name?: string; email?: string; categoryCode?: SupportCategoryCode;
  subject: string; message: string; attachments: readonly SelectedSupportFile[];
  /** Retry identity, deliberately independent from database ticket identity. */
  idempotencyKey: string;
}
export interface TicketComposerSubmitResult {
  ok: boolean;
  errorCode?: "UNAUTHORIZED" | "FORBIDDEN" | "TURNSTILE_FAILED" | "VALIDATION" | "CONFLICT" | "NOT_FOUND" | "RATE_LIMITED" | "DEPENDENCY" | "INTERNAL";
  publicReference?: string;
  trackingPin?: string;
  message?: string;
}
export interface TicketComposerProps {
  mode: TicketComposerMode;
  ticketId?: string;
  categories?: readonly TicketCategoryOption[];
  initialValue?: Partial<Pick<TicketComposerValues, "name" | "email" | "categoryCode" | "subject" | "message">>;
  initialAttachments?: readonly SelectedSupportFile[];
  attachmentLimits?: PublicGrievanceUploadLimits;
  existingAttachmentCount?: number;
  existingAttachmentBytes?: number;
  disabled?: boolean;
  submitting?: boolean;
  /** Caller owns the server workflow: auth/Turnstile/DB/idempotency/attachments/outbox. */
  onSubmit: (values: TicketComposerValues) => Promise<TicketComposerSubmitResult>;
}
let keySequence = 0;
function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") { const bytes = new Uint8Array(16); crypto.getRandomValues(bytes); return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""); }
  keySequence += 1; return `retry-${Date.now()}-${keySequence}`;
}
function emailOk(value: string) { return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function safeError(result: TicketComposerSubmitResult) {
  switch (result.errorCode) {
    case "UNAUTHORIZED": return "আপনার সেশনটি আর বৈধ নয়। আবার সাইন ইন করুন।";
    case "FORBIDDEN": return "এই support action করার অনুমতি আপনার নেই।";
    case "TURNSTILE_FAILED": return "নিরাপত্তা যাচাই সম্পন্ন হয়নি। আবার চেষ্টা করুন।";
    case "VALIDATION": return result.message ?? "তথ্য যাচাই করা যায়নি।";
    case "CONFLICT": return "একই অনুরোধের সঙ্গে সংঘর্ষ হয়েছে; duplicate ticket তৈরি করা হয়নি।";
    case "NOT_FOUND": return "টিকিটটি পাওয়া যায়নি।";
    case "RATE_LIMITED": return "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।";
    case "DEPENDENCY": return "support সেবা এই মুহূর্তে প্রস্তুত নয়। পরে আবার চেষ্টা করুন।";
    default: return "বার্তাটি সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।";
  }
}

export default function TicketComposer({ mode, ticketId, categories = [], initialValue, initialAttachments = [], attachmentLimits, existingAttachmentCount = 0, existingAttachmentBytes = 0, disabled = false, submitting = false, onSubmit }: TicketComposerProps) {
  const publicMode = mode === "PUBLIC_TICKET";
  const nameId = useId(); const emailId = useId(); const categoryId = useId(); const subjectId = useId(); const messageId = useId(); const formErrorId = useId();
  const keyRef = useRef(newIdempotencyKey());
  const [name, setName] = useState(initialValue?.name ?? ""); const [email, setEmail] = useState(initialValue?.email ?? ""); const [category, setCategory] = useState<SupportCategoryCode | "">(initialValue?.categoryCode ?? "");
  const [subject, setSubject] = useState(initialValue?.subject ?? ""); const [message, setMessage] = useState(initialValue?.message ?? ""); const [attachments, setAttachments] = useState<SelectedSupportFile[]>([...initialAttachments]); const [error, setError] = useState<string | null>(null); const [result, setResult] = useState<TicketComposerSubmitResult | null>(null);
  const canSubmit = useMemo(() => {
    if (disabled || submitting || !subject.trim() || !message.trim()) return false;
    if (publicMode && (!name.trim() || !emailOk(email.trim().toLowerCase()) || !category)) return false;
    return !publicMode && Boolean(ticketId) || publicMode;
  }, [category, disabled, email, message, publicMode, name, subject, submitting, ticketId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(null); setResult(null);
    const normalizedName = name.trim(); const normalizedEmail = email.trim().toLowerCase(); const normalizedSubject = subject.trim(); const normalizedMessage = message.trim();
    if (publicMode && !normalizedName) return setError("আপনার নাম দিন।");
    if (publicMode && !emailOk(normalizedEmail)) return setError("একটি বৈধ ইমেল ঠিকানা দিন।");
    if (publicMode && !category) return setError("একটি support category নির্বাচন করুন।");
    if (!normalizedSubject) return setError(publicMode ? "বিষয় লিখুন।" : "রিপ্লাইয়ের বিষয় লিখুন।");
    if (!normalizedMessage) return setError(publicMode ? "বিস্তারিত লিখুন।" : "রিপ্লাইয়ের বার্তা লিখুন।");
    if (!publicMode && !ticketId) return setError("রিপ্লাইয়ের জন্য টিকিট শনাক্ত করা যায়নি।");
    const response = await onSubmit({ name: publicMode ? normalizedName : undefined, email: publicMode ? normalizedEmail : undefined, categoryCode: publicMode ? category || undefined : undefined, subject: normalizedSubject, message: normalizedMessage, attachments, idempotencyKey: keyRef.current });
    if (!response.ok) return setError(safeError(response));
    setResult(response); setSubject(""); setMessage(""); setAttachments([]); keyRef.current = newIdempotencyKey();
    if (publicMode) { setName(""); setEmail(""); setCategory(""); }
  };

  return (
    <section className="w-full overflow-hidden rounded-3xl border border-[color:var(--color-border,#e7d9c6)] bg-[color:var(--color-ivory,#fffaf3)] shadow-[0_18px_50px_rgba(91,44,17,0.07)]">
      <header className="border-b border-[color:var(--color-border,#e7d9c6)] px-5 py-5 sm:px-6 sm:py-6"><span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 py-1 text-[11px] font-semibold text-[color:var(--color-vermilion,#9e2d1b)]"><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{publicMode ? "সহায়তা / অভিযোগ" : "স্টাফ রিপ্লাই"}</span><h2 className="mt-3 text-xl font-semibold tracking-tight text-[color:var(--color-text,#241b16)] sm:text-2xl">{publicMode ? "আপনার বিষয়টি লিখুন" : "নিরাপদভাবে উত্তর লিখুন"}</h2><p className="mt-2 text-sm leading-6 text-[color:var(--color-muted,#6d5b4f)]">{publicMode ? "প্রয়োজনীয় তথ্য দিন। টিকিট তৈরি হলে reference ও tracking PIN দেখানো হবে।" : "রিপ্লাই durable SupportMessage হিসেবে আগে সংরক্ষিত হবে; notification failure ticket/message মুছে দেবে না।"}</p></header>
      <form className="space-y-5 px-5 py-5 sm:px-6 sm:py-6" onSubmit={submit} noValidate aria-describedby={error ? formErrorId : undefined}>
        {publicMode ? <div className="grid gap-5 md:grid-cols-2"><div><label htmlFor={nameId} className="mb-2 block text-sm font-semibold">নাম <span aria-hidden="true">*</span></label><input id={nameId} value={name} autoComplete="name" disabled={disabled || submitting} onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)} className="min-h-11 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15" placeholder="আপনার নাম" /></div><div><label htmlFor={emailId} className="mb-2 block text-sm font-semibold">ইমেল <span aria-hidden="true">*</span></label><input id={emailId} type="email" value={email} autoComplete="email" disabled={disabled || submitting} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} className="min-h-11 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15" placeholder="name@example.com" /><p className="mt-1.5 text-xs leading-5 text-[color:var(--color-muted,#6d5b4f)]">এটি পাবলিক ticket tracking-এ প্রকাশ করা হবে না।</p></div></div> : null}
        {publicMode ? <div><label htmlFor={categoryId} className="mb-2 block text-sm font-semibold">Category <span aria-hidden="true">*</span></label><select id={categoryId} value={category} disabled={disabled || submitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => setCategory(event.target.value as SupportCategoryCode | "")} className="min-h-11 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15"><option value="">একটি category নির্বাচন করুন</option>{categories.map((item) => <option key={item.code} value={item.code} disabled={item.enabled === false}>{item.labelBn}{item.labelEn ? ` · ${item.labelEn}` : ""}</option>)}</select></div> : null}
        <div><div className="flex items-end justify-between gap-3"><label htmlFor={subjectId} className="text-sm font-semibold">{publicMode ? "বিষয়" : "রিপ্লাইয়ের বিষয়"} <span aria-hidden="true">*</span></label></div><input id={subjectId} value={subject} disabled={disabled || submitting} onChange={(event: ChangeEvent<HTMLInputElement>) => setSubject(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15" placeholder={publicMode ? "সংক্ষেপে বিষয়টি লিখুন" : "অনুসরণযোগ্য বিষয়"} /></div>
        <div><div className="flex items-end justify-between gap-3"><label htmlFor={messageId} className="text-sm font-semibold">{publicMode ? "বিস্তারিত" : "বার্তা"} <span aria-hidden="true">*</span></label></div><textarea id={messageId} rows={8} value={message} disabled={disabled || submitting} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value)} className="mt-2 min-h-44 w-full resize-y rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15" placeholder={publicMode ? "বিষয়টির বিস্তারিত ও প্রাসঙ্গিক তথ্য লিখুন…" : "Requester-এর জন্য পরিষ্কার ও সম্মানজনক উত্তর লিখুন…"} /></div>
        {publicMode && attachmentLimits ? <AttachmentUploader value={attachments} onChange={setAttachments} limits={attachmentLimits} existingCount={existingAttachmentCount} existingBytes={existingAttachmentBytes} disabled={disabled || submitting} /> : null}
        <div className="rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-4 py-3 text-xs leading-5 text-[color:var(--color-muted,#6d5b4f)]">{publicMode ? "সংযুক্তি private storage-এ যাবে; client checks final authorization বা security validation-এর বিকল্প নয়।" : "Internal note, requester private email, assignment data এবং private object key এই composer-এর payload-এ নেই।"}</div>
        <div id={formErrorId} className="min-h-6" aria-live="polite">{error ? <p className="text-sm text-rose-800" role="alert">{error}</p> : null}</div>
        {result?.ok && publicMode && result.publicReference ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-950"><p className="text-sm font-semibold">আপনার support request সংরক্ষিত হয়েছে।</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white/80 px-3 py-3"><p className="text-[11px] font-medium uppercase tracking-wide">Reference</p><p className="mt-1 font-mono text-base font-bold tracking-wide">{result.publicReference}</p></div><div className="rounded-xl bg-white/80 px-3 py-3"><p className="text-[11px] font-medium uppercase tracking-wide">Tracking PIN</p><p className="mt-1 font-mono text-base font-bold tracking-[0.24em]">{result.trackingPin ?? "••••"}</p></div></div><p className="mt-3 text-xs leading-5">Reference ও PIN নিরাপদে রাখুন। Reference একা ticket authorization দেয় না।</p></div> : null}
        <div className="flex flex-col gap-3 border-t border-[color:var(--color-border,#e7d9c6)] pt-4 sm:flex-row sm:items-center sm:justify-end"><p className="text-xs leading-5 text-[color:var(--color-muted,#6d5b4f)] sm:mr-auto">{publicMode ? "Turnstile, authorization, durable D1 persistence, idempotency এবং email outbox server-side workflow-এর দায়িত্ব।" : "Durable message save এবং notification delivery আলাদা ধাপ।"}</p><button type="submit" disabled={!canSubmit} className="min-h-12 rounded-xl bg-[color:var(--color-vermilion,#9e2d1b)] px-5 text-sm font-semibold text-white shadow-sm hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2 motion-reduce:transform-none disabled:cursor-not-allowed disabled:bg-slate-400">{submitting ? "প্রক্রিয়াধীন…" : publicMode ? "অনুরোধ পাঠান" : "রিপ্লাই সংরক্ষণ ও পাঠান"}</button></div>
      </form>
    </section>
  );
}
