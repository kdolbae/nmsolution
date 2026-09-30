import { pool } from '@/lib/db'
import { ensureQuoteRequests } from '@/lib/quote-table'

/** 사진 견적 한 건에 붙일 수 있는 사진 수와 크기. 브라우저에서 줄여 보내므로 한 장 수백 KB 정도다. */
export const MAX_PHOTOS = 5
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024
/** Vercel 함수 요청 본문 한도(4.5MB)보다 작게 */
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024

/**
 * 견적 문의에 붙은 현장 사진. quote_requests 와 같은 DB 에 둔다 (sql/006_quote_photos.sql 과 같은 모양).
 * 운영 DB 에 SQL 을 따로 돌리지 않아도 첫 접수·첫 관리자 조회 때 생긴다.
 * 고객 현장 사진이라 공개 경로로는 내보내지 않고, 관리자 로그인 뒤에만 볼 수 있다.
 */
let ready: Promise<void> | null = null

export function ensureQuotePhotos(): Promise<void> {
  if (!ready) {
    ready = ensureQuoteRequests()
      .then(() =>
        pool.query(
          `CREATE TABLE IF NOT EXISTS quote_photos (
             id         serial PRIMARY KEY,
             quote_id   integer NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
             mime       text NOT NULL,
             bytes      integer NOT NULL,
             data       bytea NOT NULL,
             created_at timestamptz NOT NULL DEFAULT now()
           );
           CREATE INDEX IF NOT EXISTS quote_photos_quote_idx ON quote_photos (quote_id);`,
        ),
      )
      .then(() => undefined)
      .catch((e) => {
        ready = null
        throw e
      })
  }
  return ready
}

/** 파일 앞머리로 실제 이미지인지 확인한다. 확장자·Content-Type 은 믿지 않는다. */
export function sniffImage(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP')
    return 'image/webp'
  return null
}

/** 견적 id → 사진 id 목록. 표가 없거나 조회가 실패하면 빈 값. */
export async function photoIdsByQuote(): Promise<Record<number, number[]>> {
  try {
    await ensureQuotePhotos()
    const { rows } = await pool.query<{ id: number; quote_id: number }>('SELECT id, quote_id FROM quote_photos ORDER BY id')
    const out: Record<number, number[]> = {}
    for (const r of rows) (out[r.quote_id] ??= []).push(r.id)
    return out
  } catch (e) {
    console.error('[quote-photos] 조회 실패', e)
    return {}
  }
}
