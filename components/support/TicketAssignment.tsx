"use client";

import { useEffect, useId, useState } from "react";
import type { ChangeEvent } from "react";

export type SupportQueueCode = "FINANCE" | "PUJA" | "GOVERNANCE" | "GENERAL";
export interface TicketQueueOption { code: SupportQueueCode; labelBn: string; labelEn?: string; available?: boolean; }
export interface TicketAssigneeOption {
  /** Canonical identity supplied by an authorized admin read model. */
  userId?: string;
  /** Stable ROLE-* identity when assignment is role based. */
  roleId?: string;
  displayNameBn: string;
  displayNameEn?: string;
  roleLabelBn?: string;
  active?: boolean;
}
export interface TicketAssignmentValue { queueCode: SupportQueueCode | ""; assignedUserId?: string; assignedRoleId?: string; }
export interface TicketAssignmentResult { ok: boolean; errorCode?: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "VALIDATION" | "DEPENDENCY" | "INTERNAL"; message?: string; }
export interface TicketAssignmentProps {
  ticketId: string;
  value: TicketAssignmentValue;
  queues: readonly TicketQueueOption[];
  assignees: readonly TicketAssigneeOption[];
  disabled?: boolean;
  submitting?: boolean;
  onChange?: (value: TicketAssignmentValue) => void;
  onSave: (value: TicketAssignmentValue) => Promise<TicketAssignmentResult>;
}
function errorCopy(result: TicketAssignmentResult) {
  switch (result.errorCode) {
    case "UNAUTHORIZED": return "আপনার সেশনটি আর বৈধ নয়। আবার সাইন ইন করুন।";
    case "FORBIDDEN": return "এই টিকিট assign করার অনুমতি আপনার নেই।";
    case "NOT_FOUND": return "টিকিটটি পাওয়া যায়নি।";
    case "CONFLICT": return "Assignment ইতিমধ্যে বদলে গেছে। সর্বশেষ অবস্থা দেখে আবার চেষ্টা করুন।";
    case "VALIDATION": return result.message ?? "Assignment-এর মান বৈধ নয়।";
    case "DEPENDENCY": return "Assignment সেবা এই মুহূর্তে প্রস্তুত নয়।";
    default: return "Assignment সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।";
  }
}

export default function TicketAssignment({ ticketId, value, queues, assignees, disabled = false, submitting = false, onChange, onSave }: TicketAssignmentProps) {
  const queueId = useId(); const assigneeId = useId();
  const [draft, setDraft] = useState(value); const [error, setError] = useState<string | null>(null); const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(value), [value]);
  const update = (next: TicketAssignmentValue) => { setDraft(next); setError(null); setSaved(false); onChange?.(next); };
  const save = async () => {
    if (disabled || submitting) return;
    setError(null); setSaved(false);
    if (!ticketId) return setError("টিকিট শনাক্ত করা যায়নি।");
    if (!draft.queueCode) return setError("একটি routing queue নির্বাচন করুন।");
    if (!draft.assignedUserId && !draft.assignedRoleId) return setError("একটি অনুমোদিত role বা user নির্বাচন করুন।");
    const result = await onSave(draft);
    if (!result.ok) return setError(errorCopy(result));
    setSaved(true);
  };
  return (
    <section className="w-full rounded-2xl border border-[color:var(--color-border,#e7d9c6)] bg-white p-4 shadow-[0_10px_32px_rgba(91,44,17,0.05)] sm:p-5">
      <h3 className="text-base font-semibold text-[color:var(--color-text,#241b16)]">টিকিট assignment</h3>
      <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted,#6d5b4f)]">Routing queue ও বর্তমান canonical role/user তথ্য server-side read model থেকে আসবে; এই UI কোনো স্থায়ী ব্যক্তি-রুট hardcode করে না।</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div><label htmlFor={queueId} className="mb-2 block text-sm font-semibold text-[color:var(--color-text,#241b16)]">Routing queue</label><select id={queueId} value={draft.queueCode} disabled={disabled || submitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => update({ queueCode: event.target.value as SupportQueueCode | "", assignedUserId: undefined, assignedRoleId: undefined })} className="min-h-11 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15 disabled:bg-slate-50"><option value="">queue নির্বাচন করুন</option>{queues.map((queue) => <option key={queue.code} value={queue.code} disabled={queue.available === false}>{queue.labelBn}{queue.labelEn ? ` · ${queue.labelEn}` : ""}</option>)}</select></div>
        <div><label htmlFor={assigneeId} className="mb-2 block text-sm font-semibold text-[color:var(--color-text,#241b16)]">Role / responsible staff</label><select id={assigneeId} value={draft.assignedUserId ? `user:${draft.assignedUserId}` : draft.assignedRoleId ? `role:${draft.assignedRoleId}` : ""} disabled={disabled || submitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => { const selected = event.target.value; update(selected.startsWith("user:") ? { ...draft, assignedUserId: selected.slice(5), assignedRoleId: undefined } : selected.startsWith("role:") ? { ...draft, assignedRoleId: selected.slice(5), assignedUserId: undefined } : { ...draft, assignedUserId: undefined, assignedRoleId: undefined }); }} className="min-h-11 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15 disabled:bg-slate-50"><option value="">role/user নির্বাচন করুন</option>{assignees.filter((item) => item.active !== false).map((item) => { const identity = item.userId ? `user:${item.userId}` : item.roleId ? `role:${item.roleId}` : ""; return identity ? <option key={identity} value={identity}>{item.displayNameBn}{item.roleLabelBn ? ` · ${item.roleLabelBn}` : ""}</option> : null; })}</select></div>
      </div>
      <div className="mt-4 min-h-6" aria-live="polite">{error ? <p className="text-sm text-rose-800" role="alert">{error}</p> : null}{saved ? <p className="text-sm text-emerald-800">Assignment সংরক্ষণ করা হয়েছে।</p> : null}</div>
      <div className="flex justify-end"><button type="button" onClick={() => void save()} disabled={disabled || submitting || !draft.queueCode || (!draft.assignedUserId && !draft.assignedRoleId)} className="min-h-11 rounded-xl bg-[color:var(--color-vermilion,#9e2d1b)] px-4 text-sm font-semibold text-white shadow-sm hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2 motion-reduce:transform-none disabled:cursor-not-allowed disabled:bg-slate-400">{submitting ? "সংরক্ষণ হচ্ছে…" : "Assignment সংরক্ষণ করুন"}</button></div>
    </section>
  );
}
