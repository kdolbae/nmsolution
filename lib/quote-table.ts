import { pool } from '@/lib/db'

/**
 * 견적 문의 표(quote_requests)가 없으면 만든다 (sql/001_quote_requests.sql 과 같은 모양).
 *
 * 2026-10-01: 운영 DB 에 이 표가 처음부터 없었다. 견적폼 접수가 전부 실패했고
 * (관리자 → 견적 문의 · 마케팅 상황판도 이 표를 찾다 비어 보였다). SQL 을 따로 돌리지 않아도
 * 첫 접수 · 첫 관리자 조회 때 생기게 한다. 인스턴스마다 한 번만 시도하고 실패하면 다음에 다시.
 *
 * 광고 유입 출처 열(sql/007_quote_attribution.sql 과 같은 모양)도 여기서 붙인다.
 * 접수 코드가 그 열에 값을 넣으므로, 열이 없으면 접수가 위와 똑같이 전부 실패한다.
 * 이미 있는 표에는 ADD COLUMN IF NOT EXISTS 가 아무것도 하지 않는다.
 */
let ready: Promise<void> | null = null

export function ensureQuoteRequests(): Promise<void> {
  if (!ready) {
    ready = pool
      .query(
        `CREATE TABLE IF NOT EXISTS quote_requests (
           id          serial PRIMARY KEY,
           name        text NOT NULL,
           phone       text NOT NULL,
           company     text NOT NULL DEFAULT '',
           location    text NOT NULL DEFAULT '',
           categories  text NOT NULL DEFAULT '',
           message     text NOT NULL DEFAULT '',
           status      text NOT NULL DEFAULT 'new',
           memo        text NOT NULL DEFAULT '',
           created_at  timestamptz NOT NULL DEFAULT now(),
           updated_at  timestamptz NOT NULL DEFAULT now()
         );
         CREATE INDEX IF NOT EXISTS quote_requests_created_at_idx ON quote_requests (created_at DESC);
         CREATE INDEX IF NOT EXISTS quote_requests_status_idx ON quote_requests (status);
         ALTER TABLE quote_requests
           ADD COLUMN IF NOT EXISTS utm_source    text NOT NULL DEFAULT '',
           ADD COLUMN IF NOT EXISTS utm_medium    text NOT NULL DEFAULT '',
           ADD COLUMN IF NOT EXISTS utm_campaign  text NOT NULL DEFAULT '',
           ADD COLUMN IF NOT EXISTS utm_term      text NOT NULL DEFAULT '',
           ADD COLUMN IF NOT EXISTS utm_content   text NOT NULL DEFAULT '',
           ADD COLUMN IF NOT EXISTS click_id      text NOT NULL DEFAULT '',
           ADD COLUMN IF NOT EXISTS landing_path  text NOT NULL DEFAULT '',
           ADD COLUMN IF NOT EXISTS referrer      text NOT NULL DEFAULT '',
           ADD COLUMN IF NOT EXISTS first_seen_at timestamptz;
         CREATE INDEX IF NOT EXISTS quote_requests_source_created_idx
           ON quote_requests (utm_source, created_at DESC);`,
      )
      .then(() => undefined)
      .catch((e) => {
        ready = null
        throw e
      })
  }
  return ready
}
