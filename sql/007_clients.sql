-- 업체 관리 (제안서·견적서). 관리자 → 업체 관리.
-- 앱이 첫 조회 때 같은 표를 자동으로 만들고 금강변압기를 첫 업체로 넣으므로(lib/clients/table.ts)
-- 이 파일은 직접 만들어 두고 싶을 때만 실행한다(이 경우 금강변압기는 자동으로 들어가지 않는다). 여러 번 실행해도 안전하다.
CREATE TABLE IF NOT EXISTS clients (
  id             bigint generated always as identity primary key,
  name           text not null,
  contact_person text,
  phone          text,
  email          text,
  site_address   text,
  memo           text,
  proposal_html  text,   -- 제안서 HTML 문서 한 장 (영상·이미지 포함)
  quote          jsonb,  -- 견적서 (lib/clients/quote.ts 의 Quote)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
