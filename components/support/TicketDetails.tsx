"use client";

import { useId } from "react";
import AttachmentList, { type SupportAttachmentItem } from "./AttachmentList";
import InternalNote, { type InternalNoteSubmitResult } from "./InternalNote";
import TicketAssignment, { type TicketAssignmentValue, type TicketAssigneeOption, type TicketQueueOption, type TicketAssignmentResult } from "./TicketAssignment";
import TicketComposer, { type TicketCategoryOption, type TicketComposerSubmitResult, type TicketComposerValues } from "./TicketComposer";
import TicketStatusBadge, { type SupportTicketPriority, type SupportTicketStatus } from "./TicketStatusBadge";

export interface TicketHistoryEvent {
  id: string;
  kind: "STATUS" | "PUBLIC_REPLY";
  occurredAt: string;
  actorLabel?: string;
  fromStatus?: SupportTicketStatus;
  toStatus?: SupportTicketStatus;
  body?: string;
  reasonLabel?: string;
}

export interface TicketDetailsRecord {
  id: string;
  publicReference: string;
  requesterName: string;
  requesterEmail?: string;
  categoryCode: "FINANCE" | "PUJA" | "GRIEVANCE" | "GENERAL";
  categoryLabelBn: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  publicAttachments: readonly SupportAttachmentItem[];
  internalAttachments?: readonly SupportAttachmentItem[];
  assignment?: TicketAssignmentValue;
  history: readonly TicketHistoryEvent[];
}

export interface TicketDetailsProps {
  ticket: TicketDetailsRecord | null;
  loading?: boolean;
  errorState?: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "DEPENDENCY" | "INTERNAL";
  categories?: readonly TicketCategoryOption[];
  queues?: readonly TicketQueueOption[];
  assignees?: readonly TicketAssigneeOption[];
  onRetry?: () => void;
  onAssignmentSave?: (value: TicketAssignmentValue) => Promise<TicketAssignmentResult>;
  onReply?: (values: TicketComposerValues) => Promise<TicketComposerSubmitResult>;
  onInternalNoteSubmit?: (body: string) => Promise<InternalNoteSubmitResult>;
  onAttachmentDownload?: (attachmentId: string) => void;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "তারিখ অজানা";
  return new Intl.DateTimeFormat("bn-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date);
}

function errorTitle(errorState: NonNullable<TicketDetailsProps["errorState"]>): string {
  switch (errorState) {
    case "NOT_FOUND": return "টিকিটটি পাওয়া যায়নি";
    case "FORBIDDEN": return "এই টিকিট দেখার অনুমতি নেই";
    case "CONFLICT": return "টিকিটের সর্বশেষ অবস্থা বদলে গেছে";
    case "DEPENDENCY": return "টিকিটের নির্ভরতা সাময়িকভাবে ব্যর্থ";
    default: return "টিকিটের বিবরণ লোড করা যায়নি";
  }
}

function cx(...values: Array<string | false | null | undefined>): string { return values.filter(Boolean).join(" "); }

export default function TicketDetails({ ticket, loading = false, errorState, categories = [], queues = [], assignees = [], onRetry, onAssignmentSave, onReply, onInternalNoteSubmit, onAttachmentDownload }: TicketDetailsProps) {
  const titleId = useId();

  if (loading) return <section aria-busy="true" className="rounded-3xl border border-[color:var(--color-border,#e7d9c6)] bg-[color:var(--color-ivory,#fffaf3)] p-6"><div className="h-7 w-56 animate-pulse rounded-lg bg-white motion-reduce:animate-none" /><div className="mt-4 grid gap-4 lg:grid-cols-3"><div className="h-32 animate-pulse rounded-2xl bg-white motion-reduce:animate-none" /><div className="h-32 animate-pulse rounded-2xl bg-white motion-reduce:animate-none" /><div className="h-32 animate-pulse rounded-2xl bg-white motion-reduce:animate-none" /></div><p className="mt-5 text-sm text-[color:var(--color-muted,#6d5b4f)]">টিকিটের বিস্তারিত লোড হচ্ছে…</p></section>;

  if (errorState || !ticket) return <section role="alert" className="rounded-3xl border border-rose-200 bg-[color:var(--color-ivory,#fffaf3)] p-6"><h2 className="text-lg font-semibold text-[color:var(--color-text,#241b16)]">{errorTitle(errorState ?? "INTERNAL")}</h2><p className="mt-2 text-sm leading-6 text-[color:var(--color-muted,#6d5b4f)]">কোনো ব্যক্তিগত provider/DB error এখানে প্রকাশ করা হবে না। নিরাপদ fallback দেখানো হয়েছে।</p>{onRetry ? <button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-xl bg-[color:var(--color-vermilion,#9e2d1b)] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2">আবার চেষ্টা করুন</button> : null}</section>;

  return (
    <section aria-labelledby={titleId} className="w-full space-y-5">
      <header className="overflow-hidden rounded-3xl border border-[color:var(--color-border,#e7d9c6)] bg-[color:var(--color-ivory,#fffaf3)] shadow-[0_18px_50px_rgba(91,44,17,0.05)]">
        <div className="border-b border-[color:var(--color-border,#e7d9c6)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div><p className="font-mono text-sm font-bold tracking-wide text-[color:var(--color-vermilion,#9e2d1b)]">{ticket.publicReference}</p><h1 id={titleId} className="mt-2 max-w-4xl text-2xl font-semibold tracking-tight text-[color:var(--color-text,#241b16)] sm:text-3xl">{ticket.subject}</h1><p className="mt-2 text-sm text-[color:var(--color-muted,#6d5b4f)]">{ticket.categoryLabelBn} · তৈরি {formatDate(ticket.createdAt)} · আপডেট {formatDate(ticket.updatedAt)}</p></div>
            <TicketStatusBadge status={ticket.status} priority={ticket.priority} showPriority={ticket.priority !== "NORMAL"} />
          </div>
        </div>

        <div className="grid gap-px bg-[color:var(--color-border,#e7d9c6)] sm:grid-cols-2 lg:grid-cols-4">
          {[["Requester", ticket.requesterName], ["Email", ticket.requesterEmail ?? "Private / not exposed"], ["First response", ticket.firstResponseAt ? formatDate(ticket.firstResponseAt) : "Not recorded"], ["Resolved", ticket.resolvedAt ? formatDate(ticket.resolvedAt) : "Not resolved"]].map(([label, value]) => <div key={label} className="bg-white/80 px-4 py-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-muted,#6d5b4f)]">{label}</p><p className={cx("mt-1 text-sm font-medium", label === "Email" ? "break-all text-[color:var(--color-text,#241b16)]" : "text-[color:var(--color-text,#241b16)]")}>{value}</p></div>)}
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <div className="space-y-5">
          <article className="rounded-2xl border border-[color:var(--color-border,#e7d9c6)] bg-white p-5 sm:p-6"><h2 className="text-base font-semibold text-[color:var(--color-text,#241b16)]">মূল বার্তা</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[color:var(--color-text,#241b16)]">{ticket.message}</p></article>
          <AttachmentList attachments={ticket.publicAttachments} title="টিকিটের সংযুক্তি" onDownload={onAttachmentDownload} />
          {ticket.internalAttachments?.length ? <AttachmentList attachments={ticket.internalAttachments} title="Staff-only সংযুক্তি" onDownload={onAttachmentDownload} /> : null}

          {onReply ? <TicketComposer mode="STAFF_REPLY" ticketId={ticket.id} categories={categories} onSubmit={onReply} /> : null}
          {onInternalNoteSubmit ? <InternalNote ticketId={ticket.id} onSubmit={async (draft) => onInternalNoteSubmit(draft.body)} /> : null}
        </div>

        <aside className="space-y-5">
          {ticket.assignment && onAssignmentSave ? <TicketAssignment ticketId={ticket.id} value={ticket.assignment} queues={queues} assignees={assignees} onSave={onAssignmentSave} /> : null}
          <section className="rounded-2xl border border-[color:var(--color-border,#e7d9c6)] bg-[color:var(--color-ivory,#fffaf3)] p-5"><h2 className="text-base font-semibold text-[color:var(--color-text,#241b16)]">নিরাপদ history</h2><p className="mt-1 text-xs leading-5 text-[color:var(--color-muted,#6d5b4f)]">Public reply ও status-history দেখা যায়; internal audit/security metadata এখানে serialized হয় না।</p><ol className="mt-4 space-y-4 border-l border-[color:var(--color-border,#e7d9c6)] pl-4">{ticket.history.map((event) => <li key={event.id} className="relative"><span aria-hidden="true" className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-[color:var(--color-vermilion,#9e2d1b)]" /><p className="text-[11px] text-[color:var(--color-muted,#6d5b4f)]">{formatDate(event.occurredAt)}</p>{event.kind === "STATUS" ? <p className="mt-1 text-sm font-medium text-[color:var(--color-text,#241b16)]">{event.fromStatus ?? "—"} → {event.toStatus}</p> : <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[color:var(--color-text,#241b16)]">{event.body}</p>}{event.reasonLabel ? <p className="mt-1 text-xs text-[color:var(--color-muted,#6d5b4f)]">কারণ: {event.reasonLabel}</p> : null}</li>)}</ol></section>
        </aside>
      </div>
    </section>
  );
}
