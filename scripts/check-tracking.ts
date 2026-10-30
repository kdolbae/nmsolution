import { readdirSync, readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

/**
 * 고객용 페이지에 접속 기록이 빠짐없이 붙어 있는지 빌드 전에 확인한다 (package.json prebuild).
 * 하나라도 빠지면 빌드를 멈춰서 기록 없는 업체 페이지가 운영에 올라가지 않게 한다.
 *
 * - app/<주소>/route.ts (업체용 링크)는 portalGet·portalPost 를 그대로 써야 한다
 * - lib/clients/portal-route.ts 는 열람 HTML 을 trackedHtml 로, 로그인·PDF 를 logAccess 로 남겨야 한다
 * - public/js/pv.js 와 app/api/pv/route.ts 가 있어야 한다
 */
const root = process.cwd()
const read = (p: string) => readFileSync(path.join(root, p), 'utf8')
const problems: string[] = []

// 업체용 링크가 아닌 최상위 폴더(사이트 화면·API·어드민·포털)
const NOT_CLIENT = new Set(['about', 'actions', 'admin', 'api', 'leak', 'portal', 'services'])
for (const name of readdirSync(path.join(root, 'app'), { withFileTypes: true })) {
  if (!name.isDirectory() || NOT_CLIENT.has(name.name) || name.name.startsWith('(') || name.name.startsWith('_')) continue
  const route = path.join('app', name.name, 'route.ts')
  if (!existsSync(path.join(root, route))) {
    // page.tsx 로 만든 고객용 화면이면 직접 확인해야 한다
    const page = path.join('app', name.name, 'page.tsx')
    if (existsSync(path.join(root, page)) && !/logAccess|trackedHtml|pv\.js/.test(read(page)))
      problems.push(`${page}: 고객용 화면인데 접속 기록(logAccess + /js/pv.js)이 없음. 업체용 링크면 route.ts 로 portalGet/portalPost 를 쓸 것`)
    continue
  }
  const src = read(route)
  if (!/portalGet\(/.test(src) || !/portalPost\(/.test(src)) problems.push(`${route}: portalGet/portalPost 를 쓰지 않음 (접속 기록이 빠짐)`)
}

const pr = read('lib/clients/portal-route.ts')
if (!/trackedHtml\(/.test(pr)) problems.push('lib/clients/portal-route.ts: 열람 HTML 에 trackedHtml 이 없음')
for (const kind of ['login_page', 'pdf', 'login_ok', 'login_fail'])
  if (!pr.includes(`'${kind}'`)) problems.push(`lib/clients/portal-route.ts: '${kind}' 기록이 없음`)
if (!existsSync(path.join(root, 'public/js/pv.js'))) problems.push('public/js/pv.js 없음')
if (!existsSync(path.join(root, 'app/api/pv/route.ts'))) problems.push('app/api/pv/route.ts 없음')
for (const f of ['app/portal/page.tsx', 'app/api/portal/print/route.ts', 'app/api/portal/files/[file]/route.ts'])
  if (!/logAccess\(/.test(read(f))) problems.push(`${f}: logAccess 가 없음`)

if (problems.length) {
  console.error('[check-tracking] 접속 기록이 빠진 곳:\n - ' + problems.join('\n - '))
  process.exit(1)
}
console.log('[check-tracking] 고객용 페이지 접속 기록 확인 완료')
