"use client";

import { useId } from "react";

export type TicketThreadVisibility = "PUBLIC_REPLY" | "INTERNAL_NOTE";
export type TicketThreadAuthorType = "REQUESTER" | "STAFF" | "SYSTEM";

export interface TicketThreadAttachment {
  id: string;
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  sizeBytes: number;
  state: "REGISTERED" | "UPLOADING" | "UPLOADED" | "SCANNING" | "CLEAN" | "FAILED" | "QUARANTINED" | "DELETED";
  canDownload?: boolean;
}

export interface TicketThreadMessage {
  id: string;
  authorType: TicketThreadAuthorType;
  visibility: TicketThreadVisibility;
  authorLabel: string;
  body: string;
  createdAt: string;
  attachments?: readonly TicketThreadAttachment[];
}

export interface TicketThreadProps {
  messages: readonly TicketThreadMessage[];
  currentViewer: "PUBLIC" | "STAFF";
  emptyLabel?: string;
  locale?: "bn-IN" | "en-IN";
  loading?: boolean;
  errorMessage?: string;
  onDownloadAttachment?: (attachmentId: string) => void;
}

function formatDateTime(value: string, locale: "bn-IN" | "en-IN") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return locale === "bn-IN" ? "সময় অজানা" : "Unknown time";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function visibleToViewer(message: TicketThreadMessage, viewer: TicketThreadProps["currentViewer"]) {
  return viewer === "STAFF" || message.visibility === "PUBLIC_REPLY";
}

export default function TicketThread({
  messages,
  currentViewer,
  emptyLabel = "এই টিকিটে এখনও কোনো বার্তা নেই।",
  locale = "bn-IN",
  loading = false,
  errorMessage,
  onDownloadAttachment,
}: TicketThreadProps) {
  const headingId = useId();
  const visibleMessages = messages.filter((message) => visibleToViewer(message, currentViewer));

  return (
    <section
      aria-labelledby={headingId}
      className="w-full rounded-3xl border border-[color:var(--color-border,#eadcca)] bg-[color:var(--color-ivory,#fffaf3)] p-4 shadow-[0_18px_46px_rgba(80,43,24,0.08)] sm:p-6"
    >
      <div className="flex items-end justify-between gap-4 border-b border-[color:var(--color-border,#eadcca)] pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-vermilion,#9e2d1b)]">
            {currentViewer === "STAFF" ? "Support workspace" : "সহায়তা"}
          </p>
          <h2 id={headingId} className="mt-1 text-lg font-semibold text-[color:var(--color-text,#261b16)] sm:text-xl">
            {currentViewer === "STAFF" ? "টিকিট বার্তালাপ" : "বার্তার ইতিহাস"}
          </h2>
        </div>
        <span className="rounded-full border border-[color:var(--color-border,#eadcca)] bg-white px-3 py-1 text-xs font-medium text-[color:var(--color-muted,#6b5a50)]">
          {visibleMessages.length} {locale === "bn-IN" ? "টি বার্তা" : visibleMessages.length === 1 ? "message" : "messages"}
        </span>
      </div>

      <div className="mt-5" aria-live="polite" aria-busy={loading}>
        {errorMessage ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-4" aria-label="লোড হচ্ছে">
            {[0, 1].map((item) => (
              <div key={item} className="rounded-2xl border border-[color:var(--color-border,#eadcca)] bg-white p-4 motion-safe:animate-pulse motion-reduce:animate-none">
                <div className="h-3 w-28 rounded bg-slate-100" />
                <div className="mt-3 h-4 w-3/4 rounded bg-slate-100" />
                <div className="mt-2 h-4 w-1/2 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--color-border,#eadcca)] bg-white/75 px-5 py-10 text-center text-sm leading-6 text-[color:var(--color-muted,#6b5a50)]">
            {emptyLabel}
          </div>
        ) : (
          <ol className="space-y-4" aria-label="টিকিটের বার্তা">
            {visibleMessages.map((message, index) => {
              const staff = message.authorType === "STAFF" || message.authorType === "SYSTEM";
              const internal = message.visibility === "INTERNAL_NOTE";
              return (
                <li key={message.id} className="relative">
                  <article
                    className={
                      staff
                        ? "rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:ml-8"
                        : "rounded-2xl border border-[color:var(--color-border,#eadcca)] bg-white p-4 sm:mr-8"
                    }
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[color:var(--color-text,#261b16)]">{message.authorLabel}</p>
                          {internal ? (
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800">
                              Internal
                            </span>
                          ) : null}
                          {message.authorType === "SYSTEM" ? (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                              System
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-[color:var(--color-muted,#6b5a50)]">{formatDateTime(message.createdAt, locale)}</p>
                      </div>
                      <span className="text-[11px] text-[color:var(--color-muted,#6b5a50)]">#{index + 1}</span>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[color:var(--color-text,#261b16)]">{message.body}</p>

                    {message.attachments?.length ? (
                      <ul className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="সংযুক্তি">
                        {message.attachments.map((attachment) => (
                          <li key={attachment.id} className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--color-border,#eadcca)] bg-white px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-[color:var(--color-text,#261b16)]">{attachment.fileName}</p>
                              <p className="mt-0.5 text-[11px] text-[color:var(--color-muted,#6b5a50)]">{formatBytes(attachment.sizeBytes)} · {attachment.state}</p>
                            </div>
                            {attachment.canDownload && onDownloadAttachment ? (
                              <button
                                type="button"
                                onClick={() => onDownloadAttachment(attachment.id)}
                                className="min-h-9 shrink-0 rounded-lg px-2.5 text-xs font-semibold text-[color:var(--color-vermilion,#9e2d1b)] hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2"
                              >
                                খুলুন
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
