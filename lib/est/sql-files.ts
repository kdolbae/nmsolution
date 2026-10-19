import { SQL_011, SQL_012, SQL_013, SQL_014, SQL_015 } from './ddl'
import { seedSql } from './seed'

const HEAD = (n: string) =>
  `-- ${n}: 견적·원가·이익 시스템 (기획서 v1 §4). 이 파일은 scripts/est-sql.ts 가 lib/est/ddl.ts·seed.ts 로 만듦 — 고치려면 그 파일을 고치고 pnpm est:sql.\n` +
  `-- 실행: search_path=nmsolution(sql/README.md B안) 또는 전용 DB. 여러 번 실행해도 안전. 앱도 첫 조회 때 같은 SQL 을 돌림(lib/est/table.ts).\n`

/** sql 파일 이름 → 내용. 적용 순서: 015(user.est_role·SSO) 는 011 보다 먼저 돌아도 됨(서로 의존 없음) */
export const EST_SQL_FILES: { file: string; sql: string }[] = [
  { file: '011_est_settings_masters.sql', sql: SQL_011 },
  { file: '012_est_project.sql', sql: SQL_012 },
  { file: '013_est_estimate.sql', sql: SQL_013 },
  { file: '014_est_actual.sql', sql: SQL_014 },
  { file: '015_sso.sql', sql: SQL_015 },
  { file: '016_est_seed_sample.sql', sql: seedSql() },
]

export function sqlFileText(f: { file: string; sql: string }) {
  return HEAD(f.file.replace(/\.sql$/, '')) + f.sql
}
