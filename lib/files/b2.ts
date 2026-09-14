/**
 * Server-only Backblaze B2 S3-compatible adapter.
 * No permanent credentials or direct provider URLs are returned to callers.
 */

import { STORAGE_BUCKET, STORAGE_ENDPOINT, STORAGE_REGION, STORAGE_PROVIDER, assertB2Config, assertSafeObjectKeySegment } from './policy';

export interface B2Config {
  readonly provider: typeof STORAGE_PROVIDER;
  readonly bucket: string;
  readonly region: string;
  readonly endpoint: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
}

export interface B2PutInput {
  readonly objectKey: string;
  readonly body: BodyInit;
  readonly mimeType: string;
  readonly contentLength?: number;
  readonly checksumSha256Hex?: string;
  readonly metadata?: Readonly<Record<string, string>>;
  readonly contentDisposition?: 'inline' | 'attachment';
  readonly ifNoneMatch?: string;
}

export interface B2ObjectHead {
  readonly etag: string | null;
  readonly contentLength: number | null;
  readonly contentType: string | null;
}

export interface B2SignedUrl {
  readonly url: string;
  readonly expiresAt: string;
}

export interface B2FetchResult {
  readonly status: number;
  readonly headers: Headers;
  readonly body: ReadableStream<Uint8Array> | null;
}

export function loadB2Config(env: Record<string, string | undefined>): B2Config {
  const accessKeyId = env.B2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.B2_SECRET_ACCESS_KEY?.trim();
  const config: B2Config = {
    provider: STORAGE_PROVIDER,
    bucket: env.B2_BUCKET_NAME?.trim() || STORAGE_BUCKET,
    region: env.B2_REGION?.trim() || STORAGE_REGION,
    endpoint: env.B2_S3_ENDPOINT?.trim() || STORAGE_ENDPOINT,
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  };
  assertB2Config(config);
  if (!config.accessKeyId || !config.secretAccessKey) {
    throw new Error('B2 credentials are required server-side');
  }
  return config;
}

export class B2Client {
  private readonly config: B2Config;

  constructor(config: B2Config) {
    assertB2Config(config);
    if (!config.accessKeyId || !config.secretAccessKey) throw new Error('B2 credentials are required');
    this.config = config;
  }

  async putObject(input: B2PutInput): Promise<B2ObjectHead> {
    const objectKey = normalizeObjectKey(input.objectKey);
    const headers = new Headers();
    headers.set('content-type', input.mimeType);
    if (input.contentLength !== undefined) headers.set('content-length', String(input.contentLength));
    if (input.contentDisposition) headers.set('content-disposition', input.contentDisposition);
    if (input.checksumSha256Hex) headers.set('x-amz-checksum-sha256', normalizeSha256(input.checksumSha256Hex));
    if (input.ifNoneMatch) headers.set('if-none-match', input.ifNoneMatch);
    for (const [key, value] of Object.entries(input.metadata ?? {})) {
      headers.set(`x-amz-meta-${sanitizeHeaderName(key)}`, value);
    }
    const response = await this.signedRequest('PUT', objectKey, headers, input.body);
    await require2xx(response, 'put object');
    return {
      etag: response.headers.get('etag'),
      contentLength: parseContentLength(response.headers.get('content-length')),
      contentType: response.headers.get('content-type'),
    };
  }

  async headObject(objectKey: string): Promise<B2ObjectHead | null> {
    const response = await this.signedRequest('HEAD', normalizeObjectKey(objectKey), new Headers());
    if (response.status === 404) return null;
    await require2xx(response, 'head object');
    return {
      etag: response.headers.get('etag'),
      contentLength: parseContentLength(response.headers.get('content-length')),
      contentType: response.headers.get('content-type'),
    };
  }

  async getObject(objectKey: string, range?: string): Promise<B2FetchResult> {
    const headers = new Headers();
    if (range) headers.set('range', range);
    const response = await this.signedRequest('GET', normalizeObjectKey(objectKey), headers);
    if (![200, 206, 304, 404].includes(response.status) && !response.ok) {
      await require2xx(response, 'get object');
    }
    return { status: response.status, headers: response.headers, body: response.body };
  }

  async deleteObject(objectKey: string): Promise<void> {
    const response = await this.signedRequest('DELETE', normalizeObjectKey(objectKey), new Headers());
    if (response.status === 404) return;
    await require2xx(response, 'delete object');
  }

  async createSignedGetUrl(objectKey: string, expiresInSeconds = 300): Promise<B2SignedUrl> {
    if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 1 || expiresInSeconds > 900) {
      throw new Error('signed URL TTL must be between 1 and 900 seconds');
    }
    return this.presign('GET', normalizeObjectKey(objectKey), expiresInSeconds);
  }

  async createSignedPutUrl(objectKey: string, mimeType: string, expiresInSeconds = 300): Promise<B2SignedUrl> {
    if (!mimeType.trim()) throw new Error('mimeType is required for signed PUT');
    if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 1 || expiresInSeconds > 900) {
      throw new Error('signed URL TTL must be between 1 and 900 seconds');
    }
    return this.presign('PUT', normalizeObjectKey(objectKey), expiresInSeconds, { 'content-type': mimeType });
  }

  private async signedRequest(method: string, objectKey: string, headers: Headers, body?: BodyInit): Promise<Response> {
    const url = new URL(`${encodeObjectKey(objectKey)}`, `${this.config.endpoint.replace(/\/$/, '')}/${encodeURIComponent(this.config.bucket)}/`);
    const payloadHash = body === undefined ? 'UNSIGNED-PAYLOAD' : 'UNSIGNED-PAYLOAD';
    const signedHeaders = headersToCanonical(headers);
    const now = new Date();
    const amzDate = toAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    headers.set('host', url.host);
    headers.set('x-amz-date', amzDate);
    headers.set('x-amz-content-sha256', payloadHash);
    const canonical = buildCanonicalRequest(method, url, headers, payloadHash);
    const authorization = await buildAuthorization(this.config, method, url, headers, canonical, dateStamp, now);
    const requestHeaders = new Headers(headers);
    requestHeaders.set('authorization', authorization);
    return fetch(url, { method, headers: requestHeaders, body });
  }

  private async presign(method: string, objectKey: string, expiresInSeconds: number, extraHeaders: Record<string, string> = {}): Promise<B2SignedUrl> {
    const url = new URL(`${encodeObjectKey(objectKey)}`, `${this.config.endpoint.replace(/\/$/, '')}/${encodeURIComponent(this.config.bucket)}/`);
    const now = new Date();
    const amzDate = toAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const credential = `${this.config.accessKeyId}/${dateStamp}/${this.config.region}/s3/aws4_request`;
    url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
    url.searchParams.set('X-Amz-Credential', credential);
    url.searchParams.set('X-Amz-Date', amzDate);
    url.searchParams.set('X-Amz-Expires', String(expiresInSeconds));
    const headers = new Headers({ host: url.host, ...extraHeaders });
    const signedHeaderNames = Array.from(headers.keys()).map((name) => name.toLowerCase()).sort();
    url.searchParams.set('X-Amz-SignedHeaders', signedHeaderNames.join(';'));
    const canonical = buildCanonicalRequest(method, url, headers, 'UNSIGNED-PAYLOAD', true);
    const signature = await signCanonical(this.config.secretAccessKey, this.config.region, dateStamp, amzDate, canonical);
    url.searchParams.set('X-Amz-Signature', signature);
    return { url: url.toString(), expiresAt: new Date(now.getTime() + expiresInSeconds * 1000).toISOString() };
  }
}

export function normalizeObjectKey(raw: string): string {
  const value = raw.trim();
  if (!value || value.startsWith('/') || value.includes('\\') || value.includes('\0') || value.split('/').some((segment) => segment === '..' || segment === '.')) {
    throw new Error('unsafe storage object key');
  }
  const segments = value.split('/').map((segment) => assertSafeObjectKeySegment(segment, 'objectKey'));
  return segments.join('/');
}

function encodeObjectKey(key: string): string {
  return key.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function sanitizeHeaderName(value: string): string {
  const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64);
  if (!sanitized) throw new Error('metadata key is empty after sanitization');
  return sanitized;
}

function normalizeSha256(value: string): string {
  const hex = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error('checksum_sha256 must be a 64-character hex digest');
  return hex;
}

function parseContentLength(value: string | null): number | null {
  if (value === null) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

async function require2xx(response: Response, operation: string): Promise<void> {
  if (response.ok) return;
  throw new Error(`${operation} failed with provider status ${response.status}`);
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function headersToCanonical(headers: Headers): string {
  return Array.from(headers.keys()).map((name) => name.toLowerCase()).sort().join(';');
}

function canonicalQuery(url: URL, presigned: boolean): string {
  const entries = Array.from(url.searchParams.entries())
    .filter(([key]) => !(!presigned && key.toLowerCase() === 'authorization'))
    .sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(b));
  return entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
}

function buildCanonicalRequest(method: string, url: URL, headers: Headers, payloadHash: string, presigned = false): string {
  const canonicalHeaders = Array.from(headers.keys()).map((name) => name.toLowerCase()).sort().map((name) => `${name}:${headers.get(name)?.trim().replace(/\s+/g, ' ') ?? ''}\n`).join('');
  const signedHeaders = Array.from(headers.keys()).map((name) => name.toLowerCase()).sort().join(';');
  const path = url.pathname.split('/').map((segment) => encodeURIComponent(decodeURIComponent(segment))).join('/');
  return [method, path || '/', canonicalQuery(url, presigned), canonicalHeaders, signedHeaders, payloadHash].join('\n');
}

async function buildAuthorization(config: B2Config, method: string, url: URL, headers: Headers, canonicalRequest: string, dateStamp: string, now: Date): Promise<string> {
  const amzDate = headers.get('x-amz-date') || toAmzDate(now);
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;
  const signingKey = await deriveSigningKey(config.secretAccessKey, dateStamp, config.region, 's3');
  const signature = await hmacHex(signingKey, stringToSign);
  const signedHeaders = Array.from(headers.keys()).map((name) => name.toLowerCase()).sort().join(';');
  return `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

async function signCanonical(secretAccessKey: string, region: string, dateStamp: string, amzDate: string, canonicalRequest: string): Promise<string> {
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;
  const signingKey = await deriveSigningKey(secretAccessKey, dateStamp, region, 's3');
  return hmacHex(signingKey, stringToSign);
}

async function deriveSigningKey(secret: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmac(`AWS4${secret}`, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

async function hmac(key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const keyData = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function hmacHex(key: ArrayBuffer, data: string): Promise<string> {
  return bytesToHex(new Uint8Array(await hmac(key, data)));
}

async function sha256Hex(value: string): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}
