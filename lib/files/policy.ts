/**
 * Batch 012 — centralized file/storage policy.
 * Server-only library: never import this module from a client component.
 */

export const STORAGE_PROVIDER = 'B2' as const;
export const STORAGE_VISIBILITY = 'PRIVATE' as const;
export const STORAGE_BUCKET = 'raksha-kali-mandir-storage' as const;
export const STORAGE_REGION = 'eu-central-003' as const;
export const STORAGE_ENDPOINT = 'https://s3.eu-central-003.backblazeb2.com' as const;

export const MIME = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WEBP: 'image/webp',
  PDF: 'application/pdf',
  MP4: 'video/mp4',
  WEBM: 'video/webm',
  WAV: 'audio/wav',
  MP3: 'audio/mpeg',
  TXT: 'text/plain',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;

export type UploadPolicyKind = 'PUBLIC_GRIEVANCE' | 'COMMITTEE_PHOTO' | 'COMMITTEE_VIDEO' | 'COMMITTEE_AUDIO' | 'COMMITTEE_DOCUMENT';

export interface UploadPolicy {
  readonly kind: UploadPolicyKind;
  readonly maxFiles: number;
  readonly maxPerFileBytes: number;
  readonly maxTotalBytes: number;
  readonly allowedMimeTypes: readonly string[];
}

export const FILE_POLICIES: Record<UploadPolicyKind, UploadPolicy> = {
  PUBLIC_GRIEVANCE: {
    kind: 'PUBLIC_GRIEVANCE',
    maxFiles: 3,
    maxPerFileBytes: 5 * 1024 * 1024,
    maxTotalBytes: 10 * 1024 * 1024,
    allowedMimeTypes: [MIME.JPEG, MIME.PNG, MIME.WEBP, MIME.PDF],
  },
  COMMITTEE_PHOTO: {
    kind: 'COMMITTEE_PHOTO',
    maxFiles: 10,
    maxPerFileBytes: 5 * 1024 * 1024,
    maxTotalBytes: 50 * 1024 * 1024,
    allowedMimeTypes: [MIME.JPEG, MIME.PNG, MIME.WEBP],
  },
  COMMITTEE_VIDEO: {
    kind: 'COMMITTEE_VIDEO',
    maxFiles: 2,
    maxPerFileBytes: 50 * 1024 * 1024,
    maxTotalBytes: 100 * 1024 * 1024,
    allowedMimeTypes: [MIME.MP4, MIME.WEBM],
  },
  COMMITTEE_AUDIO: {
    kind: 'COMMITTEE_AUDIO',
    maxFiles: 2,
    maxPerFileBytes: 25 * 1024 * 1024,
    maxTotalBytes: 50 * 1024 * 1024,
    allowedMimeTypes: [MIME.WAV, MIME.MP3],
  },
  COMMITTEE_DOCUMENT: {
    kind: 'COMMITTEE_DOCUMENT',
    maxFiles: 5,
    maxPerFileBytes: 15 * 1024 * 1024,
    maxTotalBytes: 75 * 1024 * 1024,
    allowedMimeTypes: [MIME.PDF, MIME.DOCX, MIME.XLSX, MIME.TXT],
  },
};

export interface FileCandidate {
  readonly size: number;
  readonly mimeType: string;
}

export type PolicyErrorCode =
  | 'FILE_COUNT_EXCEEDED'
  | 'FILE_TOO_LARGE'
  | 'TOTAL_SIZE_EXCEEDED'
  | 'MIME_NOT_ALLOWED'
  | 'VIDEO_NOT_ALLOWED'
  | 'INVALID_SIZE';

export class StoragePolicyError extends Error {
  readonly code: PolicyErrorCode;

  constructor(code: PolicyErrorCode, message: string) {
    super(message);
    this.name = 'StoragePolicyError';
    this.code = code;
  }
}

export function getUploadPolicy(kind: UploadPolicyKind): UploadPolicy {
  return FILE_POLICIES[kind];
}

export function validateUploadBatch(kind: UploadPolicyKind, files: readonly FileCandidate[]): void {
  const policy = getUploadPolicy(kind);
  if (files.length === 0) {
    return;
  }
  if (files.length > policy.maxFiles) {
    throw new StoragePolicyError('FILE_COUNT_EXCEEDED', `${kind} permits at most ${policy.maxFiles} files`);
  }

  let total = 0;
  for (const file of files) {
    if (!Number.isSafeInteger(file.size) || file.size < 0) {
      throw new StoragePolicyError('INVALID_SIZE', 'file size must be a non-negative safe integer');
    }
    total += file.size;
    if (file.size > policy.maxPerFileBytes) {
      throw new StoragePolicyError('FILE_TOO_LARGE', `${kind} file exceeds the per-file limit`);
    }
    if (!policy.allowedMimeTypes.includes(file.mimeType.toLowerCase())) {
      if (kind === 'PUBLIC_GRIEVANCE' && file.mimeType.toLowerCase().startsWith('video/')) {
        throw new StoragePolicyError('VIDEO_NOT_ALLOWED', 'video uploads are disabled for public grievance attachments');
      }
      throw new StoragePolicyError('MIME_NOT_ALLOWED', `${file.mimeType} is not allowed for ${kind}`);
    }
  }
  if (total > policy.maxTotalBytes) {
    throw new StoragePolicyError('TOTAL_SIZE_EXCEEDED', `${kind} batch exceeds the aggregate limit`);
  }
}

export function assertSafeObjectKeySegment(value: string, fieldName: string): string {
  if (!value || value.length > 128 || value === '.' || value === '..' || value.includes('/') || value.includes('\\') || value.includes('\0') || value.includes('..')) {
    throw new StoragePolicyError('MIME_NOT_ALLOWED', `${fieldName} contains an unsafe path segment`);
  }
  return value;
}

export function assertB2Config(config: { provider: string; bucket: string; region: string; endpoint: string }): void {
  if (config.provider !== STORAGE_PROVIDER) throw new Error('storage provider must be B2');
  if (config.bucket !== STORAGE_BUCKET) throw new Error('storage bucket does not match production policy');
  if (config.region !== STORAGE_REGION) throw new Error('storage region does not match production policy');
  if (config.endpoint !== STORAGE_ENDPOINT) throw new Error('storage endpoint does not match production policy');
}
