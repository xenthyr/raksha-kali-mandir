"use client";

import { useId, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

export type PublicTicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_USER" | "RESOLVED" | "REJECTED" | "CLOSED";

export interface PublicTicketMessage {
  id: string;
  authorLabel: string;
  body: string;
  createdAt: string;
}

export interface PublicTicketTimelineEvent {
  id: string;
  fromStatus: PublicTicketStatus | null;
  toStatus: PublicTicketStatus;
  occurredAt: string;
  reasonLabel: string;
}

export interface PublicTicketView {
  reference: string;
  categoryLabel: string;
  subject: string;
  status: PublicTicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: readonly PublicTicketMessage[];
  history: readonly PublicTicketTimelineEvent[];
}

export type TicketTrackingFailureCode = "INVALID_INPUT" | "UNAUTHORIZED" | "NOT_FOUND" | "RATE_LIMITED" | "UNAVAILABLE" | "INTERNAL";

export interface TicketTrackingFailure {
  code: TicketTrackingFailureCode;
  message: string;
  retryAfterSeconds?: number;
}

export type TicketTrackingResult = { ok: true; data: PublicTicketView } | { ok: false; error: TicketTrackingFailure };

export interface TicketTrackingProps {
  initialReference?: string;
  onTrack: (input: { reference: string; pin: string }) => Promise<TicketTrackingResult>;
  onClear?: () => void;
  locale?: "bn-IN" | "en-IN";
}

const STATUS_LABELS: Record<PublicTicketStatus, string> = {
  OPEN: "পর্যালোচনাধীন",
  IN_PROGRESS: "প্রক্রিয়াধীন",
  WAITING_USER: "আপনার তথ্যের অপেক্ষায়",
  RESOLVED: "মীমাংসিত",
  REJECTED: "গ্রহণ করা যায়নি",
  CLOSED: "বন্ধ",
};

const REFERENCE_PATTERN = /^MRK-\d{4}-\d{6}$/;

function formatDateTime(value: string, locale: "bn-IN" | "en-IN") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return locale === "bn-IN" ? "সময় অজানা" : "Unknown time";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function validateReference(reference: string) {
  return REFERENCE_PATTERN.test(reference.trim().toUpperCase());
}

function validatePin(pin: string) {
  return /^\d{4}$/.test(pin);
}

function safeErrorMessage(code: TicketTrackingFailureCode) {
  switch (code) {
    case "INVALID_INPUT":
      return "টিকিট নম্বর ও ৪ সংখ্যার PIN সঠিকভাবে দিন।";
    case "RATE_LIMITED":
      return "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।";
    case "UNAVAILABLE":
      return "এই মুহূর্তে টিকিটের তথ্য আনা যাচ্ছে না। কিছুক্ষণ পরে আবার চেষ্টা করুন।";
    case "NOT_FOUND":
    case "UNAUTHORIZED":
      return "টিকিট নম্বর বা PIN সঠিক নয়, অথবা এই তথ্য দেখার অনুমতি নেই।";
    case "INTERNAL":
    default:
      return "টিকিটের তথ্য প্রদর্শন করা যাচ্ছে না। পরে আবার চেষ্টা করুন।";
  }
}

export default function TicketTracking({ initialReference = "", onTrack, onClear, locale = "bn-IN" }: TicketTrackingProps) {
  const referenceId = useId();
  const pinId = useId();
  const statusId = useId();
  const [reference, setReference] = useState(initialReference.toUpperCase());
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<PublicTicketView | null>(null);
  const [error, setError] = useState<TicketTrackingFailure | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedReference = reference.trim().toUpperCase();
    const normalizedPin = pin.trim();
    if (!validateReference(normalizedReference) || !validatePin(normalizedPin)) {
      setError({
        code: "INVALID_INPUT",
        message: "টিকিট নম্বর ও ৪ সংখ্যার PIN সঠিকভাবে দিন।",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await onTrack({ reference: normalizedReference, pin: normalizedPin });
      if (response.ok) {
        setResult(response.data);
        setPin("");
      } else {
        setResult(null);
        setError({
          ...response.error,
          message: safeErrorMessage(response.error.code),
        });
      }
    } catch {
      setResult(null);
      setError({ code: "UNAVAILABLE", message: "এই মুহূর্তে টিকিটের তথ্য আনা যাচ্ছে না। কিছুক্ষণ পরে আবার চেষ্টা করুন।" });
    } finally {
      setSubmitting(false);
    }
  }

  function clearTracking() {
    setResult(null);
    setError(null);
    setPin("");
    onClear?.();
  }

  return (
    <section className="w-full max-w-3xl rounded-[2rem] border border-[color:var(--color-border,#eadcca)] bg-[color:var(--color-ivory,#fffaf3)] p-5 shadow-[0_22px_60px_rgba(80,43,24,0.1)] sm:p-7">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-vermilion,#9e2d1b)]">Ticket tracking</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--color-text,#261b16)] sm:text-3xl">আপনার টিকিটের অবস্থা দেখুন</h2>
        <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted,#6b5a50)]">
          টিকিট নম্বরের সঙ্গে আপনার ৪ সংখ্যার PIN ব্যবহার করুন। শুধু টিকিট নম্বর দিয়ে ব্যক্তিগত তথ্য দেখা যাবে না।
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-[color:var(--color-border,#eadcca)] bg-white p-4 sm:p-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-[1.25fr_0.75fr]">
          <div>
            <label htmlFor={referenceId} className="text-sm font-semibold text-[color:var(--color-text,#261b16)]">টিকিট নম্বর</label>
            <input
              id={referenceId}
              value={reference}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setReference(event.target.value.toUpperCase().slice(0, 15))}
              inputMode="text"
              autoComplete="off"
              maxLength={15}
              placeholder="MRK-2026-000001"
              aria-describedby={`${referenceId}-help`}
              className="mt-2 min-h-12 w-full rounded-xl border border-[color:var(--color-border,#d9c8b5)] bg-[color:var(--color-ivory,#fffaf3)] px-3.5 font-mono text-sm tracking-wide text-[color:var(--color-text,#261b16)] outline-none transition focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15"
            />
            <p id={`${referenceId}-help`} className="mt-1.5 text-xs text-[color:var(--color-muted,#6b5a50)]">MRK-YYYY-NNNNNN</p>
          </div>
          <div>
            <label htmlFor={pinId} className="text-sm font-semibold text-[color:var(--color-text,#261b16)]">৪ সংখ্যার PIN</label>
            <input
              id={pinId}
              value={pin}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              type="password"
              className="mt-2 min-h-12 w-full rounded-xl border border-[color:var(--color-border,#d9c8b5)] bg-[color:var(--color-ivory,#fffaf3)] px-3.5 text-sm tracking-[0.35em] text-[color:var(--color-text,#261b16)] outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15"
            />
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-6 text-rose-900" role="alert">
            <p>{error.message}</p>
            {error.retryAfterSeconds ? <p className="mt-1 text-xs">আবার চেষ্টা করার আগে প্রায় {error.retryAfterSeconds} সেকেন্ড অপেক্ষা করুন।</p> : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={submitting}
            className="min-h-12 flex-1 rounded-xl bg-[color:var(--color-vermilion,#9e2d1b)] px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "টিকিট খোঁজা হচ্ছে…" : "টিকিট দেখুন"}
          </button>
          {result ? (
            <button type="button" onClick={clearTracking} className="min-h-12 rounded-xl border border-[color:var(--color-border,#d9c8b5)] px-5 text-sm font-semibold text-[color:var(--color-text,#261b16)] hover:bg-[color:var(--color-ivory,#fffaf3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2">
              নতুন টিকিট খুঁজুন
            </button>
          ) : null}
        </div>
      </form>

      {result ? (
        <article className="mt-6 rounded-2xl border border-[color:var(--color-border,#eadcca)] bg-white p-5 sm:p-6" aria-labelledby={statusId}>
          <div className="flex flex-col gap-4 border-b border-[color:var(--color-border,#eadcca)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-[color:var(--color-vermilion,#9e2d1b)]">{result.reference}</p>
              <h3 id={statusId} className="mt-2 text-xl font-semibold text-[color:var(--color-text,#261b16)]">{result.subject}</h3>
              <p className="mt-1 text-sm text-[color:var(--color-muted,#6b5a50)]">{result.categoryLabel}</p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950">
              {STATUS_LABELS[result.status]}
            </span>
          </div>

          <dl className="grid gap-3 border-b border-[color:var(--color-border,#eadcca)] py-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[color:var(--color-muted,#6b5a50)]">জমা দেওয়া হয়েছে</dt>
              <dd className="mt-1 font-medium text-[color:var(--color-text,#261b16)]">{formatDateTime(result.createdAt, locale)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[color:var(--color-muted,#6b5a50)]">সর্বশেষ পরিবর্তন</dt>
              <dd className="mt-1 font-medium text-[color:var(--color-text,#261b16)]">{formatDateTime(result.updatedAt, locale)}</dd>
            </div>
          </dl>

          <div className="mt-5">
            <h4 className="text-sm font-semibold text-[color:var(--color-text,#261b16)]">বার্তার ইতিহাস</h4>
            {result.messages.length === 0 ? (
              <p className="mt-3 rounded-xl bg-[color:var(--color-ivory,#fffaf3)] px-4 py-4 text-sm text-[color:var(--color-muted,#6b5a50)]">কোনো প্রকাশ্য উত্তর এখনও যোগ হয়নি।</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {result.messages.map((message) => (
                  <li key={message.id} className="rounded-xl border border-[color:var(--color-border,#eadcca)] bg-[color:var(--color-ivory,#fffaf3)] p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-[color:var(--color-text,#261b16)]">{message.authorLabel}</span>
                      <time dateTime={message.createdAt} className="text-xs text-[color:var(--color-muted,#6b5a50)]">{formatDateTime(message.createdAt, locale)}</time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[color:var(--color-text,#261b16)]">{message.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="mt-6 border-t border-[color:var(--color-border,#eadcca)] pt-5">
            <h4 className="text-sm font-semibold text-[color:var(--color-text,#261b16)]">স্ট্যাটাসের ইতিহাস</h4>
            {result.history.length === 0 ? (
              <p className="mt-3 text-sm text-[color:var(--color-muted,#6b5a50)]">স্ট্যাটাস-ইতিহাস উপলব্ধ নেই।</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {result.history.map((event) => (
                  <li key={event.id} className="rounded-xl border border-[color:var(--color-border,#eadcca)] px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <p className="text-sm font-medium text-[color:var(--color-text,#261b16)]">{event.reasonLabel}</p>
                      <time dateTime={event.occurredAt} className="text-xs text-[color:var(--color-muted,#6b5a50)]">{formatDateTime(event.occurredAt, locale)}</time>
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--color-muted,#6b5a50)]">
                      {event.fromStatus ? `${STATUS_LABELS[event.fromStatus]} → ` : ""}{STATUS_LABELS[event.toStatus]}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </article>
      ) : null}
    </section>
  );
}
