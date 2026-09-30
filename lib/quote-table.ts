import { pool } from '@/lib/db'

/**
 * 견적 문의 표(quote_requests)가 없으면 만든다 (sql/001_quote_requests.sql 과 같은 모양).
 *
 * 2026-10-01: 운영 DB 에 이 표가 처음부터 없었다. 견적폼 접수가 전부 실패했고
 * (관리자 → 견적 문의 · 마케팅 상황판도 이 표를 찾다 비어 보였다). SQL 을 따로 돌리지 않아도
 * 첫 접수 · 첫 관리자 조회 때 생기게 한다. 인스턴스마다 한 번만 시도하고 실패하면 다음에 다시.
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
         CREATE INDEX IF NOT EXISTS quote_requests_status_idx ON quote_requests (status);`,
      )
      .then(() => undefined)
      .catch((e) => {
        ready = null
        throw e
      })
  }
  return ready
}
