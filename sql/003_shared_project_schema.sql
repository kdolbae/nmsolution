-- 다른 서비스와 DB를 함께 쓸 때: nmsolution 전용 스키마 만들기
--
-- 하나의 PostgreSQL 안에 여러 서비스를 두면서도 데이터가 섞이지 않게 한다.
-- 모든 테이블을 public 이 아닌 nmsolution 스키마 안에 만들기 때문에,
-- 다른 서비스에 같은 이름의 테이블(projects 등)이 있어도 충돌하지 않는다.
--
-- 실행:
--   psql "$DATABASE_URL" -f sql/003_shared_project_schema.sql
--   또는 Supabase / Neon 의 SQL 편집기에 붙여넣기
--
-- 실행 후 앱의 DATABASE_URL 뒤에 search_path 를 붙여야 한다. sql/README.md 참고.
--
-- 나중에 분리할 때:
--   pg_dump "$DATABASE_URL" --schema=nmsolution > nmsolution.sql
--   psql "$NEW_DATABASE_URL" -f nmsolution.sql
--
-- 여러 번 실행해도 안전하다.

CREATE SCHEMA IF NOT EXISTS nmsolution;

-- ---------- 인증 (Better Auth) ----------
-- 컬럼명은 Better Auth 규약상 camelCase 를 유지해야 한다.

CREATE TABLE IF NOT EXISTS nmsolution."user" (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  image         text,
  "createdAt"   timestamp NOT NULL DEFAULT now(),
  "updatedAt"   timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nmsolution."session" (
  id          text PRIMARY KEY,
  "expiresAt" timestamp NOT NULL,
  token       text NOT NULL UNIQUE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId"    text NOT NULL REFERENCES nmsolution."user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nmsolution."account" (
  id                       text PRIMARY KEY,
  "accountId"              text NOT NULL,
  "providerId"             text NOT NULL,
  issuer                   text NOT NULL DEFAULT '',
  "userId"                 text NOT NULL REFERENCES nmsolution."user"(id) ON DELETE CASCADE,
  "accessToken"            text,
  "refreshToken"           text,
  "idToken"                text,
  "accessTokenExpiresAt"   timestamp,
  "refreshTokenExpiresAt"  timestamp,
  scope                    text,
  password                 text,
  "createdAt"              timestamp NOT NULL DEFAULT now(),
  "updatedAt"              timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nmsolution."verification" (
  id          text PRIMARY KEY,
  identifier  text NOT NULL,
  value       text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp DEFAULT now(),
  "updatedAt" timestamp DEFAULT now()
);

-- ---------- 사이트 콘텐츠 ----------

CREATE TABLE IF NOT EXISTS nmsolution.site_content (
  key        text PRIMARY KEY,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- 시공사례 ----------

CREATE TABLE IF NOT EXISTS nmsolution.projects (
  id          serial PRIMARY KEY,
  title       text NOT NULL,
  category    text NOT NULL,
  location    text NOT NULL DEFAULT '',
  year        text NOT NULL DEFAULT '',
  duration    text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  image_url   text NOT NULL DEFAULT '',
  published   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- 견적 문의 ----------

CREATE TABLE IF NOT EXISTS nmsolution.quote_requests (
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

CREATE INDEX IF NOT EXISTS quote_requests_created_at_idx
  ON nmsolution.quote_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS quote_requests_status_idx
  ON nmsolution.quote_requests (status);
