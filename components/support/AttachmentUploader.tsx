"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";

/**
 * Policy is injected from the configuration/read-model seam. This component is
 * deliberately not the authoritative upload-policy source.
 */
export interface PublicGrievanceUploadLimits {
  maxFiles: number;
  maxBytesPerFile: number;
  maxTotalBytes: number;
  allowedMimeTypes: readonly ["image/jpeg", "image/png", "image/webp", "application/pdf"];
}

export type PublicGrievanceMimeType = PublicGrievanceUploadLimits["allowedMimeTypes"][number];

export interface SelectedSupportFile {
  localId: string;
  file: File;
}

export interface AttachmentValidationError {
  fileName?: string;
  code: "TOO_MANY_FILES" | "FILE_TOO_LARGE" | "TOTAL_TOO_LARGE" | "UNSUPPORTED_TYPE" | "TYPE_SIGNATURE_MISMATCH" | "EMPTY_FILE" | "READ_FAILED";
  message: string;
}

export interface AttachmentUploaderProps {
  value: readonly SelectedSupportFile[];
  onChange: (files: SelectedSupportFile[]) => void;
  limits: PublicGrievanceUploadLimits;
  existingCount?: number;
  existingBytes?: number;
  disabled?: boolean;
  label?: string;
  helpText?: string;
  onValidationError?: (error: AttachmentValidationError) => void;
}

function cx(...classes: Array<string | false | null | undefined>) { return classes.filter(Boolean).join(" "); }
let localSequence = 0;
function localId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  localSequence += 1;
  return `upload-${Date.now()}-${localSequence}`;
}
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function allowedExtension(type: PublicGrievanceMimeType) {
  return type === "image/jpeg" ? ["jpg", "jpeg"] : type === "image/png" ? ["png"] : type === "image/webp" ? ["webp"] : ["pdf"];
}
function extensionMatches(name: string, type: PublicGrievanceMimeType) {
  return allowedExtension(type).includes(name.split(".").pop()?.toLowerCase() ?? "");
}
async function magicMatches(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const starts = (signature: number[]) => signature.every((value, index) => bytes[index] === value);
  if (file.type === "image/jpeg") return starts([0xff, 0xd8, 0xff]);
  if (file.type === "image/png") return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (file.type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (file.type === "application/pdf") return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  return false;
}

export default function AttachmentUploader({
  value,
  onChange,
  limits,
  existingCount = 0,
  existingBytes = 0,
  disabled = false,
  label = "সংযুক্তি যোগ করুন",
  helpText,
  onValidationError,
}: AttachmentUploaderProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<AttachmentValidationError | null>(null);
  const selectedBytes = useMemo(() => value.reduce((sum, item) => sum + item.file.size, 0), [value]);
  const currentCount = existingCount + value.length;
  const currentBytes = existingBytes + selectedBytes;
  const remainingCount = Math.max(0, limits.maxFiles - currentCount);

  const fail = (next: AttachmentValidationError) => { setError(next); onValidationError?.(next); };

  const inspect = async (files: File[]) => {
    setError(null);
    if (remainingCount === 0 || files.length > remainingCount) {
      fail({ code: "TOO_MANY_FILES", message: `সর্বোচ্চ ${limits.maxFiles}টি ফাইল রাখা যায়।` });
      return;
    }
    const accepted: SelectedSupportFile[] = [];
    let incomingBytes = 0;
    setChecking(true);
    try {
      for (const file of files) {
        if (file.size <= 0) { fail({ code: "EMPTY_FILE", fileName: file.name, message: `${file.name}: খালি ফাইল গ্রহণ করা যাবে না।` }); continue; }
        if (file.size > limits.maxBytesPerFile) { fail({ code: "FILE_TOO_LARGE", fileName: file.name, message: `${file.name}: প্রতি ফাইলের নির্ধারিত সীমার বেশি।` }); continue; }
        if (!(limits.allowedMimeTypes as readonly string[]).includes(file.type)) { fail({ code: "UNSUPPORTED_TYPE", fileName: file.name, message: `${file.name}: অনুমোদিত JPEG, PNG, WebP বা PDF নয়।` }); continue; }
        if (!extensionMatches(file.name, file.type as PublicGrievanceMimeType)) { fail({ code: "TYPE_SIGNATURE_MISMATCH", fileName: file.name, message: `${file.name}: extension ও declared type মিলছে না।` }); continue; }
        try {
          if (!(await magicMatches(file))) { fail({ code: "TYPE_SIGNATURE_MISMATCH", fileName: file.name, message: `${file.name}: content signature declared type-এর সঙ্গে মেলেনি।` }); continue; }
        } catch {
          fail({ code: "READ_FAILED", fileName: file.name, message: `${file.name}: প্রাথমিক file check করা যায়নি। আবার চেষ্টা করুন।` }); continue;
        }
        incomingBytes += file.size;
        if (currentBytes + incomingBytes > limits.maxTotalBytes) { fail({ code: "TOTAL_TOO_LARGE", fileName: file.name, message: `সব সংযুক্তি মিলিয়ে সর্বোচ্চ ${formatBytes(limits.maxTotalBytes)} রাখা যায়।` }); break; }
        accepted.push({ localId: localId(), file });
      }
    } finally { setChecking(false); }
    if (accepted.length) onChange([...value, ...accepted]);
  };

  const onInput = (event: ChangeEvent<HTMLInputElement>) => { void inspect(Array.from(event.target.files ?? [])); if (inputRef.current) inputRef.current.value = ""; };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragActive(false); if (!disabled) void inspect(Array.from(event.dataTransfer.files)); };
  const inputDisabled = disabled || checking || remainingCount === 0;

  return (
    <section className="w-full">
      <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label htmlFor={id} className="text-sm font-semibold text-[color:var(--color-text,#241b16)]">{label}</label>
          <p id={`${id}-help`} className="mt-1 text-xs leading-5 text-[color:var(--color-muted,#6d5b4f)]">
            {helpText ?? `সর্বোচ্চ ${limits.maxFiles}টি ফাইল · প্রতি ফাইল ${formatBytes(limits.maxBytesPerFile)} · মোট ${formatBytes(limits.maxTotalBytes)} · ${limits.allowedMimeTypes.join(", ")} · ভিডিও নয়`}
          </p>
        </div>
        <span className="text-xs font-medium text-[color:var(--color-muted,#6d5b4f)]">{currentCount}/{limits.maxFiles} · {formatBytes(currentBytes)}/{formatBytes(limits.maxTotalBytes)}</span>
      </div>

      <div
        onDragEnter={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); if (!disabled) setDragActive(true); }}
        onDragOver={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); if (!disabled) event.dataTransfer.dropEffect = "copy"; }}
        onDragLeave={(event: DragEvent<HTMLDivElement>) => { if (event.currentTarget === event.target) setDragActive(false); }}
        onDrop={onDrop}
        className={cx("rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors motion-reduce:transition-none sm:px-6 sm:py-8", dragActive ? "border-[color:var(--color-vermilion,#9e2d1b)] bg-amber-50" : "border-[color:var(--color-border,#e7d9c6)] bg-white", inputDisabled ? "opacity-60" : "hover:border-[color:var(--color-vermilion,#9e2d1b)]")}
      >
        <input ref={inputRef} id={id} type="file" accept={limits.allowedMimeTypes.join(",")} multiple disabled={inputDisabled} onChange={onInput} aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`} className="sr-only" />
        <div className="mx-auto max-w-lg">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-lg text-[color:var(--color-vermilion,#9e2d1b)]" aria-hidden="true">↑</div>
          <p className="mt-3 text-sm font-semibold text-[color:var(--color-text,#241b16)]">{checking ? "ফাইল পরীক্ষা করা হচ্ছে…" : "ফাইল বেছে নিন অথবা এখানে টেনে আনুন"}</p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted,#6d5b4f)]">Client check সহায়ক মাত্র; final MIME, magic-byte, checksum, quota, ownership ও authorization server-side বাধ্যতামূলক।</p>
          <label htmlFor={id} className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[color:var(--color-vermilion,#9e2d1b)] px-4 text-sm font-semibold text-white shadow-sm hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-[color:var(--color-vermilion,#9e2d1b)] focus-within:ring-offset-2 motion-reduce:transform-none">
            {remainingCount === 0 ? "সীমা পূর্ণ" : "ফাইল নির্বাচন করুন"}
          </label>
        </div>
      </div>

      {value.length ? (
        <ul aria-label="নির্বাচিত ফাইল" className="mt-3 space-y-2">
          {value.map((item) => (
            <li key={item.localId} className="flex items-center gap-3 rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 py-2.5">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[color:var(--color-text,#241b16)]">{item.file.name}</p><p className="text-xs text-[color:var(--color-muted,#6d5b4f)]">{formatBytes(item.file.size)} · {item.file.type}</p></div>
              <button type="button" disabled={disabled || checking} onClick={() => onChange(value.filter((entry) => entry.localId !== item.localId))} className="min-h-10 rounded-lg px-3 text-xs font-semibold text-rose-800 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 disabled:opacity-50">সরান</button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <div id={`${id}-error`} role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900">{error.message}</div> : null}
    </section>
  );
}
