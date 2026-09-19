-- 시공사례 초기 등록
--
-- 이 저장소에는 마이그레이션 도구가 없으므로 직접 실행한다.
--   psql "$DATABASE_URL" -f sql/002_seed_projects.sql
-- 또는 Neon / Supabase / Vercel Postgres 의 SQL 편집기에 그대로 붙여넣는다.
--
-- 같은 제목이 이미 있으면 건너뛰므로 여러 번 실행해도 중복되지 않는다.
-- 실행 후 관리자 → 사이트 설정에서 "시공사례 노출"을 켜야 홈에 표시된다.
--
-- 위치 · 연도 · 소요기간은 실제 값을 모르므로 비워 두었다.
-- 관리자 → 시공사례에서 채워 넣으면 된다.

INSERT INTO projects (title, category, description, image_url, sort_order)
SELECT v.title, v.category, v.description, v.image_url, v.sort_order
FROM (VALUES
  ('공장 캐노피 철골 증축', '철골 · 지붕', '기존 공장 측면에 철골 골조를 세우고 지붕 판넬을 덮어 적재·작업 공간을 확보했습니다. 가동 중인 설비 라인을 피해 구간을 나눠 진행했습니다.', '/images/works/steel-canopy-corridor.jpg', 10),
  ('철골 트러스 제작 · 양중 설치', '철골 · 지붕', '현장 치수에 맞춰 트러스를 제작하고 지게차로 양중해 기둥에 접합했습니다.', '/images/works/steel-truss-lifting.jpg', 20),
  ('창고 철골 골조 시공', '철골 · 지붕', '기초 앵커 세팅부터 기둥·보·트러스 조립까지 골조 전체를 세웠습니다.', '/images/works/steel-frame-erected.jpg', 30),
  ('적재장 캐노피 지붕 시공', '철골 · 지붕', '야외 적재장에 캐노피 골조와 지붕을 올려 우천 시 자재 손상을 막았습니다.', '/images/works/steel-canopy-sky.jpg', 40),
  ('공장 벽체 판넬 · 창호 시공', '외벽 · 벽체', '벽체 판넬을 세우고 채광창을 설치한 뒤 실링으로 마감했습니다.', '/images/works/panel-wall-window.jpg', 50),
  ('대형 공장동 지붕 · 벽체 판넬', '외벽 · 벽체', '장스팬 공장동의 지붕 판넬과 측벽 판넬을 시공하고 창호를 설치했습니다.', '/images/works/panel-interior.jpg', 60),
  ('노후 배관 보수 · 슬리브 교체', '설비 · 배관', '누수가 발생한 배관 구간을 절단하고 보수 슬리브와 플랜지로 교체했습니다. 보온재를 되살려 마감했습니다.', '/images/works/pipe-repair-sleeve.jpg', 70),
  ('천장 배관 라인 교체', '설비 · 배관', '천장 배관 라인의 노후 구간을 절단·교체하고 행거를 재설치했습니다.', '/images/works/pipe-line-overhead.jpg', 80),
  ('스텐 고압배관 제작 · 설치', '설비 · 배관', '고압가스 설비의 스테인리스 배관을 현장 치수로 제작해 설치했습니다. 충전 설비 가동에 맞춰 일정을 조율했습니다.', '/images/works/hp-gas-piping.jpg', 90),
  ('스텐 고압배관 매니폴드 제작', '설비 · 배관', '분기 매니폴드를 제작해 용접·연결했습니다.', '/images/works/stainless-manifold.jpg', 100),
  ('스테인리스 탱크 용접 보수', '탱크 · 용접', '탱크 동체의 손상 부위를 절개하고 패치를 대어 용접 보수했습니다. 용접 후 표면을 정리해 마감했습니다.', '/images/works/tank-weld-bead.jpg', 110),
  ('탱크 하부 보강 용접', '탱크 · 용접', '탱크 하부 지지부와 동체 접합부를 보강 용접했습니다.', '/images/works/tank-weld-repair.jpg', 120),
  ('스텐 탱크 분해 · 재조립', '탱크 · 용접', '플랜지 헤드를 분리해 내부를 점검하고, 노즐을 새로 제작해 재조립했습니다.', '/images/works/tank-flange-parts.jpg', 130),
  ('스텐 탱크 제작 · 설치 완료', '탱크 · 용접', '동체와 플랜지 헤드를 제작·조립해 현장에 설치했습니다.', '/images/works/tank-assembled.jpg', 140),
  ('스텐 작업대 제작', '스텐 제작', '작업 동선에 맞춰 스테인리스 작업대와 상부 선반을 제작해 반입했습니다.', '/images/works/stainless-worktable.jpg', 150),
  ('스텐 3단 적재 선반 제작', '스텐 제작', '물류 동선에 맞춘 스테인리스 적재 선반을 제작했습니다.', '/images/works/stainless-rack.jpg', 160),
  ('옥외 소화전 · 소방배관 교체', '기타', '포장면을 절단·굴착해 매설 배관을 교체하고 옥외 소화전을 재설치했습니다.', '/images/works/hydrant-replacement.jpg', 170),
  ('공장 외부 계단 · 난간 설치', '기타', '콘크리트 계단에 맞춰 난간을 제작·설치했습니다.', '/images/works/stair-handrail.jpg', 180)
) AS v(title, category, description, image_url, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM projects p WHERE p.title = v.title
);
