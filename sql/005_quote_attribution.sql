-- 견적 문의에 광고 유입 출처 열을 추가한다.
--
-- 이 열이 없으면 광고를 켜도 어느 키워드·어느 광고가 문의를 가져왔는지 알 수 없고,
-- 나중에 소급해서 알아낼 방법도 없다. 광고 집행 전에 먼저 실행한다.
--
--   psql "$DATABASE_URL" -f sql/005_quote_attribution.sql
--
-- 공유 DB(B안)를 쓰는 경우 먼저 실행한다:
--   SET search_path TO nmsolution;
--
-- 여러 번 실행해도 안전하다.

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS utm_source   text NOT NULL DEFAULT '',  -- naver | google | meta | direct | 리퍼러 호스트
  ADD COLUMN IF NOT EXISTS utm_medium   text NOT NULL DEFAULT '',  -- cpc | organic 등
  ADD COLUMN IF NOT EXISTS utm_campaign text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_term     text NOT NULL DEFAULT '',  -- 검색광고 키워드
  ADD COLUMN IF NOT EXISTS utm_content  text NOT NULL DEFAULT '',  -- 광고그룹·소재
  ADD COLUMN IF NOT EXISTS click_id     text NOT NULL DEFAULT '',  -- gclid / fbclid 등
  ADD COLUMN IF NOT EXISTS landing_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS referrer     text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz;              -- 광고를 처음 클릭한 시각

-- "이번 달 네이버 광고로 들어온 문의" 같은 집계를 위한 인덱스
CREATE INDEX IF NOT EXISTS quote_requests_source_created_idx
  ON quote_requests (utm_source, created_at DESC);
