import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import type { D1Like } from "../../../../../lib/db/client";

type Env = { DB?: D1Like };
type TrackRow = {
  id: string; title_bn: string; title_en: string | null; artist: string | null; singer: string | null;
  composer: string | null; lyricist: string | null; performer: string | null; duration_seconds: number | null;
  cover_image_id: string | null; language: string; source_id: string | null; rights_id: string; event_id: string | null;
  event_type: string | null; festival_id: string | null; amavasya_id: string | null; transcript_id: string | null;
  translation_id: string | null; category: string; publication_status: string; security_scan_status: string;
  format_validation_status: string; metadata_status: string; user_triggered_only: number; autoplay_sound_allowed: number;
  offline_eligible: number; source_provenance_status: string; verification_status: string; published_at: string | null; updated_at: string;
};
type RightsRow = {
  id: string; status: string; allowed_public_playback: number; offline_eligible: number; verification_status: string;
  valid_from: string | null; valid_until: string | null;
};
const HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
function trace(request: Request): string {
  const v = request.headers.get("x-request-id")?.trim();
  return v && v.length <= 128 ? v : crypto.randomUUID();
}
function out(status: number, t: string, data: unknown, error?: { code: string; message: string }): NextResponse {
  return NextResponse.json(error ? { ok: false, error, meta: { traceId: t } } : { ok: true, data, meta: { traceId: t } }, { status, headers: HEADERS });
}
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const t = trace(request);
  const env = getCloudflareContext().env as unknown as Env;
  if (!env.DB) return out(503, t, null, { code: "DEPENDENCY_FAILURE", message: "Music library এখন প্রস্তুত নয়।" });
  const { id } = await params;
  if (!id || id.length > 128) return out(400, t, null, { code: "INVALID_ID", message: "Track ID সঠিক নয়।" });
  try {
    const track = await env.DB.prepare(`SELECT id,title_bn,title_en,artist,singer,composer,lyricist,performer,duration_seconds,cover_image_id,language,source_id,rights_id,event_id,event_type,festival_id,amavasya_id,transcript_id,translation_id,category,publication_status,security_scan_status,format_validation_status,metadata_status,user_triggered_only,autoplay_sound_allowed,offline_eligible,source_provenance_status,verification_status,published_at,updated_at FROM music_tracks WHERE id=? LIMIT 1`).bind(id).first<TrackRow>();
    if (!track) return out(404, t, null, { code: "NOT_FOUND", message: "Music track পাওয়া যায়নি।" });
    const rights = await env.DB.prepare(`SELECT id,status,allowed_public_playback,offline_eligible,verification_status,valid_from,valid_until FROM music_rights WHERE id=? LIMIT 1`).bind(track.rights_id).first<RightsRow>();
    if (
      track.publication_status !== "PUBLISHED" || !rights || rights.allowed_public_playback !== 1 ||
      rights.status === "UNKNOWN_NOT_PUBLISHABLE" || track.security_scan_status !== "PASSED" ||
      track.format_validation_status !== "PASSED" || track.verification_status !== "VERIFIED"
    ) return out(404, t, null, { code: "NOT_PUBLISHED", message: "এই track বর্তমানে প্রকাশিত নয়।" });
    const now = Date.now();
    if ((rights.valid_from && Date.parse(rights.valid_from) > now) || (rights.valid_until && Date.parse(rights.valid_until) < now)) {
      return out(404, t, null, { code: "RIGHTS_NOT_ACTIVE", message: "এই track-এর public playback rights বর্তমানে সক্রিয় নয়।" });
    }
    return out(200, t, {
      track: {
        id: track.id,
        titleBn: track.title_bn,
        titleEn: track.title_en,
        artist: track.artist,
        singer: track.singer,
        composer: track.composer,
        lyricist: track.lyricist,
        performer: track.performer,
        durationSeconds: track.duration_seconds,
        coverImageId: track.cover_image_id,
        language: track.language,
        category: track.category,
        eventId: track.event_id,
        eventType: track.event_type,
        festivalId: track.festival_id,
        amavasyaId: track.amavasya_id,
        transcriptId: track.transcript_id,
        translationId: track.translation_id,
        publishedAt: track.published_at,
        updatedAt: track.updated_at,
        playback: { userTriggeredOnly: true, autoplaySoundAllowed: false, offlineEligible: track.offline_eligible === 1 },
      },
      rights: { publicPlaybackAllowed: true, verified: true, offlineEligible: track.offline_eligible === 1 },
    });
  } catch {
    return out(500, t, null, { code: "INTERNAL_FAILURE", message: "Music track এখন দেখা যাচ্ছে না।" });
  }
}
