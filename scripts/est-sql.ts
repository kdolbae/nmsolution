/** lib/est/ddl.ts·seed.ts → sql/011~016 (pnpm est:sql) */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { EST_SQL_FILES, sqlFileText } from '../lib/est/sql-files'

for (const f of EST_SQL_FILES) {
  writeFileSync(join(process.cwd(), 'sql', f.file), sqlFileText(f))
  console.log('wrote sql/' + f.file)
}
