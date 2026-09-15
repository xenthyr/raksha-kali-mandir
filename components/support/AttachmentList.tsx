"use client";

import { useId } from "react";

export type SupportAttachmentState =
  | "REGISTERED"
  | "UPLOADING"
  | "UPLOADED"
  | "SCANNING"
  | "CLEAN"
  | "FAILED"
  | "QUARANTINED"
  | "DELETED";

export interface SupportAttachmentItem {
  /** Stable SupportAttachment.id; filename/index is never identity. */
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  state: SupportAttachmentState;
  progressPercent?: number;
  /** Caller-supplied safe UI copy; never pass raw provider/DB diagnostics here. */
  errorMessage?: string;
  /** Must be decided by the protected delivery endpoint, not by this component. */
  canDownload?: boolean;
}

export interface AttachmentListProps {
  attachments: readonly SupportAttachmentItem[];
  title?: string;
  emptyLabel?: string;
  locale?: "bn-IN" | "en-IN";
  disabled?: boolean;
  onDownload?: (attachmentId: string) => void;
  onRemove?: (attachmentId: string) => void;
  renderStateLabel?: (state: SupportAttachmentState) => string;
}

const DEFAULT_STATE_LABELS: Record<SupportAttachmentState, string> = {
  REGISTERED: "নিবন্ধিত",
  UPLOADING: "আপলোড হচ্ছে",
  UPLOADED: "আপলোড সম্পন্ন",
  SCANNING: "নিরাপত্তা পরীক্ষা চলছে",
  CLEAN: "নিরাপদ",
  FAILED: "ব্যর্থ",
  QUARANTINED: "পরীক্ষার জন্য আটকানো",
  DELETED: "মুছে ফেলা হয়েছে",
};

const STATE_CLASS: Record<SupportAttachmentState, string> = {
  REGISTERED: "border-amber-200 bg-amber-50 text-amber-900",
  UPLOADING: "border-sky-200 bg-sky-50 text-sky-900",
  UPLOADED: "border-sky-200 bg-sky-50 text-sky-900",
  SCANNING: "border-violet-200 bg-violet-50 text-violet-900",
  CLEAN: "border-emerald-200 bg-emerald-50 text-emerald-900",
  FAILED: "border-rose-200 bg-rose-50 text-rose-900",
  QUARANTINED: "border-orange-200 bg-orange-50 text-orange-900",
  DELETED: "border-slate-200 bg-slate-50 text-slate-700",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatBytes(bytes: number, locale: "bn-IN" | "en-IN") {
  if (!Number.isFinite(bytes) || bytes < 0) return locale === "bn-IN" ? "আকার অজানা" : "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function glyphForMime(mime: string) {
  return mime === "application/pdf" ? "PDF" : mime.startsWith("image/") ? "ছবি" : "ফাইল";
}

export default function AttachmentList({
  attachments,
  title = "সংযুক্তি",
  emptyLabel = "এখনও কোনো সংযুক্তি নেই।",
  locale = "bn-IN",
  disabled = false,
  onDownload,
  onRemove,
  renderStateLabel,
}: AttachmentListProps) {
  const headingId = useId();
  const totalBytes = attachments.reduce((sum, item) => sum + Math.max(0, item.sizeBytes), 0);
  const busy = attachments.some((item) => ["REGISTERED", "UPLOADING", "UPLOADED", "SCANNING"].includes(item.state));
  const getStateLabel = renderStateLabel ?? ((state) => DEFAULT_STATE_LABELS[state]);

  return (
    <section
      aria-labelledby={headingId}
      className="w-full rounded-2xl border border-[color:var(--color-border,#e7d9c6)] bg-[color:var(--color-surface,#fffaf3)] p-4 shadow-[0_10px_32px_rgba(91,44,17,0.06)] sm:p-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 id={headingId} className="text-base font-semibold text-[color:var(--color-text,#241b16)] sm:text-lg">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted,#6d5b4f)]">
            {attachments.length === 0 ? emptyLabel : `${attachments.length} ${locale === "bn-IN" ? "টি ফাইল" : attachments.length === 1 ? "file" : "files"} · ${formatBytes(totalBytes, locale)}`}
          </p>
        </div>
        {busy ? (
          <span role="status" aria-live="polite" className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
            <span className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" aria-hidden="true" />
            নিরাপত্তা/আপলোড প্রক্রিয়া চলছে
          </span>
        ) : null}
      </div>

      {attachments.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-[color:var(--color-border,#eadfce)] bg-white/70 px-4 py-8 text-center text-sm text-[color:var(--color-muted,#6d5b4f)]">
          {emptyLabel}
        </div>
      ) : (
        <ul className="mt-4 space-y-3" aria-label={title}>
          {attachments.map((attachment) => {
            const progress = Number.isFinite(attachment.progressPercent)
              ? Math.min(100, Math.max(0, attachment.progressPercent ?? 0))
              : undefined;
            const isBusy = ["UPLOADING", "SCANNING"].includes(attachment.state);
            const removable = Boolean(onRemove) && !disabled && !["SCANNING", "DELETED"].includes(attachment.state);
            const downloadable = attachment.canDownload === true && attachment.state === "CLEAN" && Boolean(onDownload);

            return (
              <li key={attachment.id} className="rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 py-3 shadow-sm sm:px-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-[10px] font-bold tracking-wide text-[color:var(--color-vermilion,#9e2d1b)]" aria-hidden="true">
                    {glyphForMime(attachment.mimeType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[color:var(--color-text,#241b16)]" title={attachment.fileName}>{attachment.fileName}</p>
                        <p className="mt-1 text-xs text-[color:var(--color-muted,#6d5b4f)]">{formatBytes(attachment.sizeBytes, locale)} · {attachment.mimeType}</p>
                      </div>
                      <span className={cx("inline-flex w-fit shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold", STATE_CLASS[attachment.state])}>
                        {getStateLabel(attachment.state)}
                      </span>
                    </div>

                    {isBusy && progress !== undefined ? (
                      <div className="mt-3" aria-label={`Progress ${progress}%`}>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-[color:var(--color-vermilion,#9e2d1b)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="mt-1 text-right text-[11px] text-[color:var(--color-muted,#6d5b4f)]">{progress}%</p>
                      </div>
                    ) : null}

                    {attachment.errorMessage ? <p className="mt-2 text-xs leading-5 text-rose-800" role="alert">{attachment.errorMessage}</p> : null}

                    {downloadable || removable ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {downloadable ? (
                          <button type="button" onClick={() => onDownload?.(attachment.id)} disabled={disabled} className="min-h-10 rounded-lg border border-[color:var(--color-border,#e7d9c6)] px-3 text-xs font-semibold text-[color:var(--color-text,#241b16)] hover:bg-[color:var(--color-ivory,#fffaf3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            নিরাপদে খুলুন
                          </button>
                        ) : null}
                        {removable ? (
                          <button type="button" onClick={() => onRemove?.(attachment.id)} disabled={disabled} className="min-h-10 rounded-lg px-3 text-xs font-semibold text-rose-800 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            সরান
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
