-- 우측 하단 간단 문의(3문답)용 열. 앱(lib/quote-table.ts)이 첫 접수·첫 관리자 조회 때 스스로 붙이므로
-- 반드시 돌려야 하는 것은 아니다. 여러 번 실행해도 안전하다.
--
--   psql "$DATABASE_URL" -f sql/013_quick_inquiry.sql

ALTER TABLE quote_requests
  ADD COLUMN IF NOT EXISTS search_query text NOT NULL DEFAULT '',  -- 손님이 실제로 친 검색어 (네이버 n_query · 리퍼러)
  ADD COLUMN IF NOT EXISTS form         text NOT NULL DEFAULT '';  -- quick | form | leak_photo 등 접수 창구
