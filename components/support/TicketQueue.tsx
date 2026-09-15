"use client";

import TicketStatusBadge, { type SupportTicketPriority, type SupportTicketStatus } from "./TicketStatusBadge";
import type { SupportCategoryCode } from "./TicketComposer";
import type { TicketFiltersValue } from "./TicketFilters";

export interface TicketQueueItem {
  id: string;
  publicReference: string;
  categoryCode: SupportCategoryCode;
  categoryLabelBn: string;
  subject: string;
  requesterDisplayName: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  queueLabelBn?: string;
  assigneeLabelBn?: string;
  messagePreview?: string;
  attachmentCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export type TicketQueueState = "loading" | "ready" | "empty" | "error" | "forbidden";

export interface TicketQueueProps {
  tickets: readonly TicketQueueItem[];
  state?: TicketQueueState;
  filters?: TicketFiltersValue;
  onSelect: (ticketId: string) => void;
  onRetry?: () => void;
  onClearFilters?: () => void;
  title?: string;
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "তারিখ অজানা";
  return new Intl.DateTimeFormat("bn-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date);
}

function cx(...values: Array<string | false | null | undefined>): string { return values.filter(Boolean).join(" "); }

export default function TicketQueue({ tickets, state = "ready", filters, onSelect, onRetry, onClearFilters, title = "সাপোর্ট ইনবক্স" }: TicketQueueProps) {
  if (state === "loading") {
    return <section aria-busy="true" aria-labelledby="ticket-queue-loading-title" className="rounded-3xl border border-[color:var(--color-border,#e7d9c6)] bg-[color:var(--color-ivory,#fffaf3)] p-5 sm:p-6"><h2 id="ticket-queue-loading-title" className="text-lg font-semibold text-[color:var(--color-text,#241b16)]">{title}</h2><div className="mt-5 space-y-3" aria-hidden="true">{[1,2,3,4].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-white/80 motion-reduce:animate-none" />)}</div><p className="mt-4 text-sm text-[color:var(--color-muted,#6d5b4f)]">টিকিট তালিকা লোড হচ্ছে…</p></section>;
  }
  if (state === "forbidden") {
    return <section role="alert" className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-950"><h2 className="text-lg font-semibold">এই inbox দেখার অনুমতি নেই</h2><p className="mt-2 text-sm leading-6">Server-side permission check ব্যর্থ হয়েছে। UI visibility কোনো authorization-এর বিকল্প নয়।</p></section>;
  }
  if (state === "error") {
    return <section role="alert" className="rounded-3xl border border-rose-200 bg-[color:var(--color-ivory,#fffaf3)] p-6"><h2 className="text-lg font-semibold text-[color:var(--color-text,#241b16)]">টিকিট তালিকা আনা যায়নি</h2><p className="mt-2 text-sm leading-6 text-[color:var(--color-muted,#6d5b4f)]">সার্ভার বা read-model নির্ভরতা সাময়িকভাবে ব্যর্থ হয়েছে।</p>{onRetry ? <button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-xl bg-[color:var(--color-vermilion,#9e2d1b)] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2">আবার চেষ্টা করুন</button> : null}</section>;
  }
  if (state === "empty" || tickets.length === 0) {
    const filtered = Boolean(filters && (filters.search || filters.status !== "ALL" || filters.category !== "ALL" || filters.priority !== "ALL" || filters.queue !== "ALL" || filters.assigneeId || filters.createdFrom || filters.createdTo));
    return <section className="rounded-3xl border border-dashed border-[color:var(--color-border,#e7d9c6)] bg-[color:var(--color-ivory,#fffaf3)] p-8 text-center sm:p-12"><div aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">✦</div><h2 className="mt-4 text-lg font-semibold text-[color:var(--color-text,#241b16)]">{filtered ? "এই ফিল্টারে কোনো ticket নেই" : "এখনও কোনো ticket নেই"}</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[color:var(--color-muted,#6d5b4f)]">{filtered ? "Filter পরিবর্তন করুন বা সব filter পরিষ্কার করে আবার দেখুন।" : "Support queue-এর durable ticket record পাওয়া গেলে এখানে দেখা যাবে।"}</p>{filtered && onClearFilters ? <button type="button" onClick={onClearFilters} className="mt-4 min-h-11 rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-4 text-sm font-semibold text-[color:var(--color-text,#241b16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2">ফিল্টার পরিষ্কার করুন</button> : null}</section>;
  }

  return (
    <section aria-labelledby="ticket-queue-title" className="w-full rounded-3xl border border-[color:var(--color-border,#e7d9c6)] bg-[color:var(--color-ivory,#fffaf3)] shadow-[0_18px_50px_rgba(91,44,17,0.05)]">
      <div className="flex flex-col gap-3 border-b border-[color:var(--color-border,#e7d9c6)] px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div><h2 id="ticket-queue-title" className="text-xl font-semibold text-[color:var(--color-text,#241b16)]">{title}</h2><p className="mt-1 text-xs leading-5 text-[color:var(--color-muted,#6d5b4f)]">{tickets.length}টি result · সর্বশেষ server read-model snapshot</p></div>
        <div className="rounded-full border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 py-1.5 text-xs font-medium text-[color:var(--color-muted,#6d5b4f)]" aria-live="polite">Admin view · protected</div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[980px] w-full border-collapse text-left">
          <thead><tr className="border-b border-[color:var(--color-border,#e7d9c6)] bg-white/70 text-[11px] uppercase tracking-[0.11em] text-[color:var(--color-muted,#6d5b4f)]"><th scope="col" className="px-5 py-4 font-semibold">Ticket</th><th scope="col" className="px-5 py-4 font-semibold">বিষয়</th><th scope="col" className="px-5 py-4 font-semibold">Status</th><th scope="col" className="px-5 py-4 font-semibold">Assignment</th><th scope="col" className="px-5 py-4 font-semibold">Created</th></tr></thead>
          <tbody>{tickets.map((ticket) => <tr key={ticket.id} className="border-b border-[color:var(--color-border,#eee5d8)] align-top last:border-b-0 hover:bg-white/80 focus-within:bg-white/80"><td className="px-5 py-4"><button type="button" onClick={() => onSelect(ticket.id)} className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2"><span className="font-mono text-sm font-bold tracking-wide text-[color:var(--color-vermilion,#9e2d1b)]">{ticket.publicReference}</span><span className="mt-1 block text-xs text-[color:var(--color-muted,#6d5b4f)]">{ticket.requesterDisplayName}</span></button></td><td className="px-5 py-4"><button type="button" onClick={() => onSelect(ticket.id)} className="block max-w-[430px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2"><span className="font-semibold text-[color:var(--color-text,#241b16)]">{ticket.subject}</span><span className="mt-1 block text-xs text-[color:var(--color-muted,#6d5b4f)]">{ticket.categoryLabelBn}{ticket.attachmentCount ? ` · ${ticket.attachmentCount}টি সংযুক্তি` : ""}</span>{ticket.messagePreview ? <span className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--color-muted,#6d5b4f)]">{ticket.messagePreview}</span> : null}</button></td><td className="px-5 py-4"><TicketStatusBadge status={ticket.status} priority={ticket.priority} showPriority={ticket.priority !== "NORMAL"} compact /></td><td className="px-5 py-4 text-sm"><p className={cx("font-medium", ticket.assigneeLabelBn ? "text-[color:var(--color-text,#241b16)]" : "text-[color:var(--color-muted,#6d5b4f)]")}>{ticket.assigneeLabelBn ?? "Unassigned"}</p><p className="mt-1 text-xs text-[color:var(--color-muted,#6d5b4f)]">{ticket.queueLabelBn ?? "Queue not supplied"}</p></td><td className="px-5 py-4 text-xs text-[color:var(--color-muted,#6d5b4f)]">{formatCreatedAt(ticket.createdAt)}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="divide-y divide-[color:var(--color-border,#eee5d8)] md:hidden">
        {tickets.map((ticket) => <article key={ticket.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><button type="button" onClick={() => onSelect(ticket.id)} className="font-mono text-sm font-bold tracking-wide text-[color:var(--color-vermilion,#9e2d1b)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2">{ticket.publicReference}</button><p className="mt-1 text-xs text-[color:var(--color-muted,#6d5b4f)]">{ticket.requesterDisplayName}</p></div><TicketStatusBadge status={ticket.status} priority={ticket.priority} compact /></div><button type="button" onClick={() => onSelect(ticket.id)} className="mt-3 block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2"><h3 className="text-base font-semibold text-[color:var(--color-text,#241b16)]">{ticket.subject}</h3><p className="mt-1 text-xs text-[color:var(--color-muted,#6d5b4f)]">{ticket.categoryLabelBn}{ticket.queueLabelBn ? ` · ${ticket.queueLabelBn}` : ""}</p>{ticket.messagePreview ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-[color:var(--color-muted,#6d5b4f)]">{ticket.messagePreview}</p> : null}</button><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-white p-3"><p className="text-[10px] uppercase tracking-wide text-[color:var(--color-muted,#6d5b4f)]">Assigned</p><p className="mt-1 font-medium text-[color:var(--color-text,#241b16)]">{ticket.assigneeLabelBn ?? "Unassigned"}</p></div><div className="rounded-xl bg-white p-3"><p className="text-[10px] uppercase tracking-wide text-[color:var(--color-muted,#6d5b4f)]">Created</p><p className="mt-1 font-medium text-[color:var(--color-text,#241b16)]">{formatCreatedAt(ticket.createdAt)}</p></div></div></article>)}
      </div>
    </section>
  );
}
