-- 견적 문의 접수 테이블
--
-- 이 저장소에는 마이그레이션 도구가 없으므로 직접 실행한다.
--   psql "$DATABASE_URL" -f sql/001_quote_requests.sql
--
-- 여러 번 실행해도 안전하다.

CREATE TABLE IF NOT EXISTS quote_requests (
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

-- 관리자 목록은 최신순으로만 조회한다
CREATE INDEX IF NOT EXISTS quote_requests_created_at_idx
  ON quote_requests (created_at DESC);

-- 미처리 건을 먼저 찾기 위한 인덱스
CREATE INDEX IF NOT EXISTS quote_requests_status_idx
  ON quote_requests (status);
