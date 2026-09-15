"use client";

import { useId, useMemo } from "react";
import type { ChangeEvent } from "react";
import type { SupportQueueCode } from "./TicketAssignment";
import type { SupportTicketPriority, SupportTicketStatus } from "./TicketStatusBadge";
import type { SupportCategoryCode } from "./TicketComposer";

export interface TicketFilterCategoryOption {
  code: SupportCategoryCode;
  labelBn: string;
  labelEn?: string;
}

export interface TicketFilterAssigneeOption {
  id: string;
  displayNameBn: string;
  displayNameEn?: string;
}

export interface TicketFiltersValue {
  search: string;
  status: SupportTicketStatus | "ALL";
  category: SupportCategoryCode | "ALL";
  priority: SupportTicketPriority | "ALL";
  queue: SupportQueueCode | "ALL";
  assigneeId: string;
  createdFrom: string;
  createdTo: string;
}

export interface TicketFiltersProps {
  value: TicketFiltersValue;
  categories: readonly TicketFilterCategoryOption[];
  assignees?: readonly TicketFilterAssigneeOption[];
  queues?: readonly { code: SupportQueueCode; labelBn: string; labelEn?: string }[];
  disabled?: boolean;
  loading?: boolean;
  onChange: (next: TicketFiltersValue) => void;
  onReset?: () => void;
  resultCount?: number;
}

const STATUS_OPTIONS: ReadonlyArray<[SupportTicketStatus, string]> = [
  ["OPEN", "নতুন"],
  ["IN_PROGRESS", "কাজ চলছে"],
  ["WAITING_USER", "ব্যবহারকারীর উত্তরের অপেক্ষায়"],
  ["RESOLVED", "সমাধান হয়েছে"],
  ["REJECTED", "গ্রহণ করা হয়নি"],
  ["CLOSED", "বন্ধ"],
];

const PRIORITY_OPTIONS: ReadonlyArray<[SupportTicketPriority, string]> = [
  ["LOW", "কম"],
  ["NORMAL", "স্বাভাবিক"],
  ["HIGH", "উচ্চ"],
  ["URGENT", "জরুরি"],
];

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function createEmptyTicketFilters(): TicketFiltersValue {
  return {
    search: "",
    status: "ALL",
    category: "ALL",
    priority: "ALL",
    queue: "ALL",
    assigneeId: "",
    createdFrom: "",
    createdTo: "",
  };
}

export default function TicketFilters({
  value,
  categories,
  assignees = [],
  queues = [],
  disabled = false,
  loading = false,
  onChange,
  onReset,
  resultCount,
}: TicketFiltersProps) {
  const searchId = useId();
  const statusId = useId();
  const categoryId = useId();
  const priorityId = useId();
  const queueId = useId();
  const assigneeId = useId();
  const fromId = useId();
  const toId = useId();
  const activeFilterCount = useMemo(() => {
    const defaults = createEmptyTicketFilters();
    return Object.entries(value).reduce((count, [key, current]) => count + (current !== defaults[key as keyof TicketFiltersValue] && current !== "" ? 1 : 0), 0);
  }, [value]);

  const patch = (next: Partial<TicketFiltersValue>) => onChange({ ...value, ...next });
  const onText = (field: "search" | "createdFrom" | "createdTo") => (event: ChangeEvent<HTMLInputElement>) => patch({ [field]: event.target.value });

  return (
    <section aria-labelledby={`${searchId}-title`} className="w-full rounded-2xl border border-[color:var(--color-border,#e7d9c6)] bg-[color:var(--color-ivory,#fffaf3)] p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id={`${searchId}-title`} className="text-base font-semibold text-[color:var(--color-text,#241b16)] sm:text-lg">টিকিট খোঁজ ও ফিল্টার</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[color:var(--color-muted,#6d5b4f)]">এই কন্ট্রোলগুলো কেবল queue/read-model-এর ফিল্টার দেয়; authorization বা server-side query policy bypass করে না।</p>
        </div>
        <div className="flex items-center gap-2">
          {resultCount !== undefined ? <span aria-live="polite" className="rounded-full border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 py-1.5 text-xs font-medium text-[color:var(--color-muted,#6d5b4f)]">{resultCount}টি ফল</span> : null}
          {onReset ? <button type="button" onClick={onReset} disabled={disabled || loading || activeFilterCount === 0} className="min-h-10 rounded-lg border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 text-xs font-semibold text-[color:var(--color-text,#241b16)] hover:bg-[color:var(--color-ivory,#fffaf3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-vermilion,#9e2d1b)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">সব পরিষ্কার</button> : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <label htmlFor={searchId} className="mb-2 block text-sm font-semibold text-[color:var(--color-text,#241b16)]">Search</label>
          <input id={searchId} value={value.search} onChange={onText("search")} disabled={disabled || loading} autoComplete="off" placeholder="Reference, subject বা requester search…" className="min-h-11 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15 disabled:bg-slate-50" />
        </div>
        <div>
          <label htmlFor={statusId} className="mb-2 block text-sm font-semibold text-[color:var(--color-text,#241b16)]">Status</label>
          <select id={statusId} value={value.status} onChange={(event: ChangeEvent<HTMLSelectElement>) => patch({ status: event.target.value as TicketFiltersValue["status"] })} disabled={disabled || loading} className="min-h-11 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15 disabled:bg-slate-50">
            <option value="ALL">সব status</option>
            {STATUS_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={priorityId} className="mb-2 block text-sm font-semibold text-[color:var(--color-text,#241b16)]">Priority</label>
          <select id={priorityId} value={value.priority} onChange={(event: ChangeEvent<HTMLSelectElement>) => patch({ priority: event.target.value as TicketFiltersValue["priority"] })} disabled={disabled || loading} className="min-h-11 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15 disabled:bg-slate-50">
            <option value="ALL">সব priority</option>
            {PRIORITY_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={categoryId} className="mb-2 block text-sm font-semibold text-[color:var(--color-text,#241b16)]">Category</label>
          <select id={categoryId} value={value.category} onChange={(event: ChangeEvent<HTMLSelectElement>) => patch({ category: event.target.value as TicketFiltersValue["category"] })} disabled={disabled || loading} className="min-h-11 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15 disabled:bg-slate-50">
            <option value="ALL">সব category</option>
            {categories.map((item) => <option key={item.code} value={item.code}>{item.labelBn}{item.labelEn ? ` · ${item.labelEn}` : ""}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={queueId} className="mb-2 block text-sm font-semibold text-[color:var(--color-text,#241b16)]">Routing queue</label>
          <select id={queueId} value={value.queue} onChange={(event: ChangeEvent<HTMLSelectElement>) => patch({ queue: event.target.value as TicketFiltersValue["queue"] })} disabled={disabled || loading} className="min-h-11 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15 disabled:bg-slate-50">
            <option value="ALL">সব queue</option>
            {queues.map((item) => <option key={item.code} value={item.code}>{item.labelBn}{item.labelEn ? ` · ${item.labelEn}` : ""}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={assigneeId} className="mb-2 block text-sm font-semibold text-[color:var(--color-text,#241b16)]">Assigned staff</label>
          <select id={assigneeId} value={value.assigneeId} onChange={(event: ChangeEvent<HTMLSelectElement>) => patch({ assigneeId: event.target.value })} disabled={disabled || loading} className="min-h-11 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15 disabled:bg-slate-50">
            <option value="">সবাই</option>
            {assignees.map((item) => <option key={item.id} value={item.id}>{item.displayNameBn}{item.displayNameEn ? ` · ${item.displayNameEn}` : ""}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor={fromId} className="mb-2 block text-sm font-semibold text-[color:var(--color-text,#241b16)]">Created from</label>
          <input id={fromId} type="date" value={value.createdFrom} onChange={onText("createdFrom")} disabled={disabled || loading} className={cx("min-h-11 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15", loading && "opacity-70")} />
        </div>
        <div>
          <label htmlFor={toId} className="mb-2 block text-sm font-semibold text-[color:var(--color-text,#241b16)]">Created to</label>
          <input id={toId} type="date" value={value.createdTo} min={value.createdFrom || undefined} onChange={onText("createdTo")} disabled={disabled || loading} className="min-h-11 w-full rounded-xl border border-[color:var(--color-border,#e7d9c6)] bg-white px-3 text-sm outline-none focus:border-[color:var(--color-vermilion,#9e2d1b)] focus:ring-2 focus:ring-[color:var(--color-vermilion,#9e2d1b)]/15" />
        </div>
      </div>
    </section>
  );
}
