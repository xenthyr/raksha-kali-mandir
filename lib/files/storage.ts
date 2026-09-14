/**
 * Storage domain seam. Consumers depend on this interface rather than B2 details.
 */

import { B2Client, B2Config, B2FetchResult, B2PutInput, B2SignedUrl, loadB2Config, normalizeObjectKey } from './b2';
import { StorageRouteKind, buildAdminStorageUrl, buildPublicStorageUrl } from './urls';
import { STORAGE_BUCKET, STORAGE_ENDPOINT, STORAGE_PROVIDER, STORAGE_REGION, STORAGE_VISIBILITY } from './policy';

export type StorageLifecycleState =
  | 'PENDING_UPLOAD' | 'UPLOADING' | 'UPLOADED' | 'VERIFIED' | 'QUARANTINED'
  | 'AVAILABLE' | 'ARCHIVED' | 'DELETE_PENDING' | 'DELETED' | 'RECONCILIATION_REQUIRED' | 'FAILED';

export interface StorageObjectRecord {
  readonly id: string;
  readonly objectKey: string;
  readonly objectClass: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly mimeType: string;
  readonly byteSize: number;
  readonly checksumSha256: string | null;
  readonly lifecycleState: StorageLifecycleState;
  readonly provider: typeof STORAGE_PROVIDER;
  readonly bucketName: typeof STORAGE_BUCKET;
  readonly visibility: typeof STORAGE_VISIBILITY;
}

export interface StorageUploadRequest {
  readonly objectId: string;
  readonly objectKey: string;
  readonly mimeType: string;
  readonly expectedByteSize?: number;
  readonly expectedChecksumSha256?: string;
  readonly expiresInSeconds?: number;
}

export interface StorageUploadAuthorization {
  readonly objectId: string;
  readonly method: 'PUT';
  readonly url: string;
  readonly expiresAt: string;
}

export interface StorageGateway {
  issueUploadAuthorization(request: StorageUploadRequest): Promise<StorageUploadAuthorization>;
  put(input: B2PutInput): Promise<void>;
  head(objectKey: string): Promise<{ etag: string | null; contentLength: number | null; contentType: string | null } | null>;
  get(objectKey: string, range?: string): Promise<B2FetchResult>;
  delete(objectKey: string): Promise<void>;
  issueDownloadAuthorization(objectKey: string, expiresInSeconds?: number): Promise<B2SignedUrl>;
}

export class B2StorageGateway implements StorageGateway {
  private readonly b2: B2Client;
  private readonly origin: string;

  constructor(config: B2Config, origin: string) {
    this.b2 = new B2Client(config);
    this.origin = origin;
  }

  static fromEnvironment(env: Record<string, string | undefined>, origin: string): B2StorageGateway {
    return new B2StorageGateway(loadB2Config(env), origin);
  }

  async issueUploadAuthorization(request: StorageUploadRequest): Promise<StorageUploadAuthorization> {
    const objectKey = normalizeObjectKey(request.objectKey);
    const signed = await this.b2.createSignedPutUrl(objectKey, request.mimeType, request.expiresInSeconds ?? 300);
    return { objectId: request.objectId, method: 'PUT', url: signed.url, expiresAt: signed.expiresAt };
  }

  async put(input: B2PutInput): Promise<void> {
    await this.b2.putObject(input);
  }

  async head(objectKey: string) {
    return this.b2.headObject(objectKey);
  }

  async get(objectKey: string, range?: string) {
    return this.b2.getObject(objectKey, range);
  }

  async delete(objectKey: string): Promise<void> {
    await this.b2.deleteObject(objectKey);
  }

  async issueDownloadAuthorization(objectKey: string, expiresInSeconds = 300): Promise<B2SignedUrl> {
    return this.b2.createSignedGetUrl(objectKey, expiresInSeconds);
  }

  publicUrl(reference: { kind: StorageRouteKind; objectId: string }): string {
    return buildPublicStorageUrl(reference, this.origin);
  }

  adminUrl(reference: { kind: StorageRouteKind; objectId: string }, ttlSeconds = 300): string {
    return buildAdminStorageUrl(reference, this.origin, ttlSeconds);
  }
}


export type StorageObjectClass =
  | 'MEDIA_ORIGINAL'
  | 'MEDIA_PROCESSED'
  | 'MEDIA_THUMBNAIL'
  | 'MEDIA_OG'
  | 'MEDIA_POSTER'
  | 'DOCUMENT_PRIVATE'
  | 'DOCUMENT_PUBLIC'
  | 'SUPPORT_ATTACHMENT_PRIVATE'
  | 'BACKUP_PRIVATE'
  | 'OTHER_PRIVATE';

export interface GeneratedObjectKeyInput {
  readonly objectClass: StorageObjectClass;
  readonly objectId: string;
  readonly extension?: string;
}

/** Generate object keys inside the server storage boundary; caller input cannot control directories. */
export function generateObjectKey(input: GeneratedObjectKeyInput): string {
  const safeId = normalizeObjectKey(input.objectId);
  if (safeId.includes('/')) throw new Error('objectId must be a single canonical identifier');
  if (!/^[A-Z0-9-]+$/i.test(safeId)) throw new Error('objectId contains unsupported characters');
  const prefix: Record<StorageObjectClass, string> = {
    MEDIA_ORIGINAL: 'media/originals',
    MEDIA_PROCESSED: 'media/processed',
    MEDIA_THUMBNAIL: 'media/thumbnails',
    MEDIA_OG: 'media/og',
    MEDIA_POSTER: 'media/posters',
    DOCUMENT_PRIVATE: 'documents/private',
    DOCUMENT_PUBLIC: 'documents/public',
    SUPPORT_ATTACHMENT_PRIVATE: 'support/private',
    BACKUP_PRIVATE: 'backups/private',
    OTHER_PRIVATE: 'private',
  };
  const ext = input.extension ? input.extension.trim().toLowerCase().replace(/^\./, '') : '';
  if (ext && !/^[a-z0-9]{1,12}$/.test(ext)) throw new Error('extension is invalid');
  return `${prefix[input.objectClass]}/${safeId}${ext ? `.${ext}` : ''}`;
}

export function productionStorageIdentity(): Readonly<{
  provider: typeof STORAGE_PROVIDER;
  bucket: typeof STORAGE_BUCKET;
  region: typeof STORAGE_REGION;
  endpoint: typeof STORAGE_ENDPOINT;
  visibility: typeof STORAGE_VISIBILITY;
  applicationAccess: 'SERVER_ONLY';
}> {
  return {
    provider: STORAGE_PROVIDER,
    bucket: STORAGE_BUCKET,
    region: STORAGE_REGION,
    endpoint: STORAGE_ENDPOINT,
    visibility: STORAGE_VISIBILITY,
    applicationAccess: 'SERVER_ONLY',
  };
}

export function assertCanonicalStorageRecord(record: StorageObjectRecord): void {
  if (record.provider !== 'B2') throw new Error('storage provider drift: only B2 is permitted');
  if (record.bucketName !== STORAGE_BUCKET) throw new Error('storage bucket drift');
  if (record.visibility !== 'PRIVATE') throw new Error('storage visibility drift');
  if (!Number.isSafeInteger(record.byteSize) || record.byteSize < 0) throw new Error('invalid storage byte size');
  normalizeObjectKey(record.objectKey);
  if (record.lifecycleState === 'AVAILABLE' && !record.checksumSha256) {
    throw new Error('available storage object must have a recorded checksum');
  }
}
