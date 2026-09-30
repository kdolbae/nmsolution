-- 견적 문의에 붙은 현장 사진 (누수 사진 견적 /leak 등).
-- 앱(lib/quote-photos.ts)이 표가 없으면 스스로 만든다. 여러 번 실행해도 안전하다.
-- 공유 DB(B 방식)에서는 SET search_path TO nmsolution; 을 먼저 실행한다.
CREATE TABLE IF NOT EXISTS quote_photos (
  id         serial PRIMARY KEY,
  quote_id   integer NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  mime       text NOT NULL,
  bytes      integer NOT NULL,
  data       bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quote_photos_quote_idx ON quote_photos (quote_id);
