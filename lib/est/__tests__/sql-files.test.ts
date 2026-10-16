import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EST_SQL_FILES, sqlFileText } from '../sql-files'

describe('sql/011~016 이 lib/est 정의와 같음 (pnpm est:sql)', () => {
  for (const f of EST_SQL_FILES) {
    it(f.file, () => {
      expect(readFileSync(join(process.cwd(), 'sql', f.file), 'utf8')).toBe(sqlFileText(f))
    })
  }
  it('모든 CREATE TABLE·INDEX 가 IF NOT EXISTS', () => {
    for (const f of EST_SQL_FILES) {
      expect(f.sql).not.toMatch(/CREATE TABLE (?!IF NOT EXISTS)/)
      expect(f.sql).not.toMatch(/CREATE INDEX (?!IF NOT EXISTS)/)
    }
  })
})
