/**
 * Safe storage URL builders. Raw B2 URLs are never emitted to public callers.
 */

import { assertSafeObjectKeySegment } from './policy';

export type StorageAudience = 'ADMIN' | 'PUBLIC';
export type StorageRouteKind = 'MEDIA' | 'DOCUMENT' | 'SUPPORT_ATTACHMENT';

export interface StorageRouteReference {
  readonly kind: StorageRouteKind;
  readonly objectId: string;
}

export interface StorageUrlOptions {
  readonly origin: string;
  readonly audience: StorageAudience;
  readonly ttlSeconds?: number;
}

export function buildAuthorizedStoragePath(reference: StorageRouteReference): string {
  const id = assertSafeObjectKeySegment(reference.objectId, 'objectId');
  switch (reference.kind) {
    case 'MEDIA':
      return `/api/media/serve/${encodeURIComponent(id)}`;
    case 'DOCUMENT':
      return `/api/documents/serve/${encodeURIComponent(id)}`;
    case 'SUPPORT_ATTACHMENT':
      return `/api/tickets/attachment/serve/${encodeURIComponent(id)}`;
    default:
      return assertNever(reference.kind);
  }
}

export function buildStorageUrl(reference: StorageRouteReference, options: StorageUrlOptions): string {
  const origin = normalizeOrigin(options.origin);
  const path = buildAuthorizedStoragePath(reference);
  const url = new URL(path, origin);
  if (options.audience === 'ADMIN') {
    const ttl = options.ttlSeconds ?? 300;
    if (!Number.isInteger(ttl) || ttl <= 0 || ttl > 900) {
      throw new Error('admin storage URL TTL must be between 1 and 900 seconds');
    }
    url.searchParams.set('ttl', String(ttl));
  }
  return url.toString();
}

export function buildPublicStorageUrl(reference: StorageRouteReference, origin: string): string {
  return buildStorageUrl(reference, { origin, audience: 'PUBLIC' });
}

export function buildAdminStorageUrl(reference: StorageRouteReference, origin: string, ttlSeconds = 300): string {
  return buildStorageUrl(reference, { origin, audience: 'ADMIN', ttlSeconds });
}

function normalizeOrigin(origin: string): string {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error('origin must be an absolute URL');
  }
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error('storage URL origin must use HTTPS outside localhost');
  }
  parsed.pathname = '/';
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

function assertNever(value: never): never {
  throw new Error(`unsupported storage route: ${String(value)}`);
}
