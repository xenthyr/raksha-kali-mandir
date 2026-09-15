"use client";

import type { ReactNode } from "react";

export type SupportTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_USER"
  | "RESOLVED"
  | "REJECTED"
  | "CLOSED";

export type SupportTicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface TicketStatusBadgeProps {
  status: SupportTicketStatus;
  priority?: SupportTicketPriority;
  compact?: boolean;
  showPriority?: boolean;
  className?: string;
  icon?: ReactNode;
}

const STATUS_COPY: Record<SupportTicketStatus, { bn: string; en: string; tone: string }> = {
  OPEN: { bn: "নতুন", en: "Open", tone: "border-sky-200 bg-sky-50 text-sky-950" },
  IN_PROGRESS: { bn: "কাজ চলছে", en: "In progress", tone: "border-amber-200 bg-amber-50 text-amber-950" },
  WAITING_USER: { bn: "ব্যবহারকারীর উত্তরের অপেক্ষায়", en: "Waiting for requester", tone: "border-violet-200 bg-violet-50 text-violet-950" },
  RESOLVED: { bn: "সমাধান হয়েছে", en: "Resolved", tone: "border-emerald-200 bg-emerald-50 text-emerald-950" },
  REJECTED: { bn: "গ্রহণ করা হয়নি", en: "Rejected", tone: "border-rose-200 bg-rose-50 text-rose-950" },
  CLOSED: { bn: "বন্ধ", en: "Closed", tone: "border-slate-200 bg-slate-100 text-slate-900" },
};

const PRIORITY_COPY: Record<SupportTicketPriority, { bn: string; tone: string }> = {
  LOW: { bn: "কম", tone: "border-slate-200 bg-slate-50 text-slate-700" },
  NORMAL: { bn: "স্বাভাবিক", tone: "border-slate-200 bg-slate-50 text-slate-700" },
  HIGH: { bn: "উচ্চ", tone: "border-orange-200 bg-orange-50 text-orange-950" },
  URGENT: { bn: "জরুরি", tone: "border-rose-200 bg-rose-50 text-rose-950" },
};

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function getTicketStatusLabel(status: SupportTicketStatus): string {
  return STATUS_COPY[status].bn;
}

export function getTicketPriorityLabel(priority: SupportTicketPriority): string {
  return PRIORITY_COPY[priority].bn;
}

export default function TicketStatusBadge({
  status,
  priority = "NORMAL",
  compact = false,
  showPriority = false,
  className,
  icon,
}: TicketStatusBadgeProps) {
  const copy = STATUS_COPY[status];
  const priorityCopy = PRIORITY_COPY[priority];
  const label = showPriority ? `${copy.bn} · ${priorityCopy.bn}` : copy.bn;

  return (
    <span className={cx("inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full border font-semibold leading-none", compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs", copy.tone, className)} aria-label={`${copy.en}: ${label}`}>
      {icon ? <span aria-hidden="true" className="shrink-0">{icon}</span> : <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current/60" />}
      <span>{label}</span>
      {!compact && showPriority && priority !== "NORMAL" ? (
        <span className={cx("rounded-full border px-1.5 py-1 text-[10px]", priorityCopy.tone)}>
          {priorityCopy.bn}
        </span>
      ) : null}
    </span>
  );
}
