-- 공유 DB를 쓸 때: nm-solution 전용 DB 계정 만들기
--
-- 003 으로 nmsolution 스키마를 만든 뒤 실행한다.
--
-- 이 계정은 nmsolution 스키마만 읽고 쓸 수 있고, public 에 있는 다른 서비스
-- 테이블에는 접근할 수 없다. 접속하면 자동으로 자기 스키마를 바라보므로
-- 연결 문자열에 search_path 옵션을 붙일 필요가 없다 (커넥션 풀러에서도 유지된다).
--
-- 비밀번호는 보안상 이 파일에 적지 않는다. 실행 후 아래 한 줄을 따로 실행한다.
--   ALTER ROLE nmsolution_app LOGIN PASSWORD '직접 정한 비밀번호';
--
-- 여러 번 실행해도 안전하다.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nmsolution_app') THEN
    -- 비밀번호를 설정할 때까지는 접속할 수 없는 상태로 만든다
    CREATE ROLE nmsolution_app NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA nmsolution TO nmsolution_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA nmsolution TO nmsolution_app;
GRANT USAGE, SELECT                 ON ALL SEQUENCES IN SCHEMA nmsolution TO nmsolution_app;

-- 앞으로 nmsolution 에 테이블이 추가돼도 권한이 자동으로 붙는다
ALTER DEFAULT PRIVILEGES IN SCHEMA nmsolution
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nmsolution_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA nmsolution
  GRANT USAGE, SELECT ON SEQUENCES TO nmsolution_app;

-- 다른 서비스가 들어 있는 public 스키마에 직접 부여된 권한 제거
REVOKE ALL ON SCHEMA public FROM nmsolution_app;

-- 접속 시 자기 스키마를 기본으로 바라보게 한다
ALTER ROLE nmsolution_app SET search_path TO nmsolution;

-- 참고: 위 REVOKE 는 이 역할에 직접 부여된 권한만 제거한다.
-- PostgreSQL 이 모든 사용자에게 주는 public 스키마 USAGE 는 남을 수 있다.
-- 다만 테이블 권한이 없으면 데이터는 읽을 수 없다. 아래로 확인한다.
--
--   SELECT has_table_privilege('nmsolution_app', 'public.다른서비스테이블', 'SELECT');
--   -- false 가 나와야 정상
