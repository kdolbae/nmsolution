import { pool } from '@/lib/db'

/**
 * site_events 표가 없으면 만든다 (sql/005_site_events.sql 과 같은 모양).
 * 운영 DB 에 SQL 을 따로 돌리지 않아도 첫 기록·첫 상황판 조회 때 생긴다.
 * 스키마를 적지 않으므로 연결 계정이 바라보는 곳(전용 DB 면 public, 공유 DB 면 nmsolution)에 생긴다.
 * 인스턴스마다 한 번만 시도하고, 실패하면 다음 요청에서 다시 시도한다.
 */
let ready: Promise<void> | null = null

export function ensureSiteEvents(): Promise<void> {
  if (!ready) {
    ready = pool
      .query(
        `CREATE TABLE IF NOT EXISTS site_events (
           id           bigint generated always as identity primary key,
           created_at   timestamptz not null default now(),
           type         text not null check (type in ('pageview','leave','call','kakao','form')),
           label        text,
           path         text,
           referrer     text,
           source       text,
           utm_source   text,
           utm_medium   text,
           utm_campaign text,
           utm_content  text,
           utm_term     text,
           ad_query     text,
           ad_rank      integer,
           session_id   text,
           visitor_id   text,
           seconds      integer,
           scroll       integer,
           ua           text
         );
         CREATE INDEX IF NOT EXISTS site_events_created_idx ON site_events (created_at desc);
         CREATE INDEX IF NOT EXISTS site_events_visitor_idx ON site_events (visitor_id);
         -- 2026-09-30 나노마스터 상황판 연동(lib/board-sync.ts)에 필요한 칸
         ALTER TABLE site_events ADD COLUMN IF NOT EXISTS ad_group text;
         ALTER TABLE site_events ADD COLUMN IF NOT EXISTS is_new   boolean;
         ALTER TABLE site_events ADD COLUMN IF NOT EXISTS country  text;
         ALTER TABLE site_events ADD COLUMN IF NOT EXISTS region   text;
         ALTER TABLE site_events ADD COLUMN IF NOT EXISTS city     text;`,
      )
      .then(() => undefined)
      .catch((e) => {
        ready = null
        throw e
      })
  }
  return ready
}
