"use client";

import { useId } from "react";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_USER" | "RESOLVED" | "REJECTED" | "CLOSED";

export interface TicketTimelineEvent {
  id: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  occurredAt: string;
  reasonLabel: string;
  actorLabel?: string;
}

export interface TicketTimelineProps {
  events: readonly TicketTimelineEvent[];
  audience?: "PUBLIC" | "STAFF";
  locale?: "bn-IN" | "en-IN";
  loading?: boolean;
  errorMessage?: string;
  emptyLabel?: string;
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "পর্যালোচনাধীন",
  IN_PROGRESS: "প্রক্রিয়াধীন",
  WAITING_USER: "ব্যবহারকারীর তথ্য অপেক্ষমাণ",
  RESOLVED: "মীমাংসিত",
  REJECTED: "গ্রহণ করা যায়নি",
  CLOSED: "বন্ধ",
};

const STATUS_STYLE: Record<TicketStatus, string> = {
  OPEN: "bg-amber-100 text-amber-950 ring-amber-200",
  IN_PROGRESS: "bg-sky-100 text-sky-950 ring-sky-200",
  WAITING_USER: "bg-violet-100 text-violet-950 ring-violet-200",
  RESOLVED: "bg-emerald-100 text-emerald-950 ring-emerald-200",
  REJECTED: "bg-rose-100 text-rose-950 ring-rose-200",
  CLOSED: "bg-slate-100 text-slate-800 ring-slate-200",
};

function formatDateTime(value: string, locale: "bn-IN" | "en-IN") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return locale === "bn-IN" ? "সময় অজানা" : "Unknown time";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export default function TicketTimeline({
  events,
  audience = "PUBLIC",
  locale = "bn-IN",
  loading = false,
  errorMessage,
  emptyLabel = "এই টিকিটের জন্য এখনও কোনো স্ট্যাটাস-ইতিহাস নেই।",
}: TicketTimelineProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="w-full rounded-3xl border border-[color:var(--color-border,#eadcca)] bg-white p-4 shadow-[0_14px_38px_rgba(80,43,24,0.06)] sm:p-6">
      <div className="border-b border-[color:var(--color-border,#eadcca)] pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-vermilion,#9e2d1b)]">Support history</p>
        <h2 id={headingId} className="mt-1 text-lg font-semibold text-[color:var(--color-text,#261b16)] sm:text-xl">স্ট্যাটাসের ইতিহাস</h2>
      </div>

      {errorMessage ? (
        <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">{errorMessage}</div>
      ) : null}

      {loading ? (
        <div className="mt-5 space-y-5" aria-busy="true" aria-label="স্ট্যাটাস ইতিহাস লোড হচ্ছে">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex gap-4 motion-safe:animate-pulse motion-reduce:animate-none">
              <div className="size-3 rounded-full bg-amber-200 ring-8 ring-amber-50" />
              <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 p-4">
                <div className="h-3 w-32 rounded bg-slate-100" />
                <div className="mt-3 h-3 w-48 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[color:var(--color-border,#eadcca)] bg-[color:var(--color-ivory,#fffaf3)] px-5 py-9 text-center text-sm leading-6 text-[color:var(--color-muted,#6b5a50)]">
          {emptyLabel}
        </div>
      ) : (
        <ol className="mt-6 space-y-5" aria-label="স্ট্যাটাস-ইতিহাস">
          {events.map((event, index) => (
            <li key={event.id} className="relative flex gap-4">
              {index < events.length - 1 ? <span aria-hidden="true" className="absolute left-[5px] top-4 h-[calc(100%+1.25rem)] w-px bg-[color:var(--color-border,#eadcca)]" /> : null}
              <span aria-hidden="true" className="relative mt-1.5 size-3 shrink-0 rounded-full bg-[color:var(--color-vermilion,#9e2d1b)] ring-8 ring-amber-50" />
              <article className="min-w-0 flex-1 rounded-2xl border border-[color:var(--color-border,#eadcca)] bg-[color:var(--color-ivory,#fffaf3)] p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {event.fromStatus ? (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATUS_STYLE[event.fromStatus]}`}>
                        {STATUS_LABELS[event.fromStatus]}
                      </span>
                    ) : null}
                    {event.fromStatus ? <span aria-hidden="true" className="text-sm text-[color:var(--color-muted,#6b5a50)]">→</span> : null}
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${STATUS_STYLE[event.toStatus]}`}>
                      {STATUS_LABELS[event.toStatus]}
                    </span>
                  </div>
                  <time dateTime={event.occurredAt} className="shrink-0 text-xs text-[color:var(--color-muted,#6b5a50)]">{formatDateTime(event.occurredAt, locale)}</time>
                </div>
                <p className="mt-3 text-sm leading-6 text-[color:var(--color-text,#261b16)]">{event.reasonLabel}</p>
                {audience === "STAFF" && event.actorLabel ? (
                  <p className="mt-2 text-xs text-[color:var(--color-muted,#6b5a50)]">দায়িত্বপ্রাপ্ত: {event.actorLabel}</p>
                ) : null}
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
