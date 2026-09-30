import Link from 'next/link'
import { PageHeader } from '@/components/admin/form'
import { pool } from '@/lib/db'
import { ensureSiteEvents } from '@/lib/site-events-table'
import { ensureQuoteRequests } from '@/lib/quote-table'
import { cn } from '@/lib/utils'
import { BoardSyncButton } from '@/components/admin/board-sync-button'
import { BOARD_ADS_URL, BOARD_STATS_URL } from '@/lib/board-urls'

export const dynamic = 'force-dynamic'

/*
 * 자체 방문 기록 — 이 사이트 DB 만으로 그리는 간단한 표.
 * 2026-09-30 부터 '마케팅 상황판'은 나노마스터 관리 화면의 같은 상황판(?brand=nmsolution)이다(lib/board-sync.ts).
 * 이 화면은 그 사본이 제대로 가는지 견줘 보고, 지난 기록을 다시 보내는 곳으로 남긴다.
 *
 * (원래 설명) 나노마스터(nanomaster.co.kr/admin/stats)와 같은 방식.
 * 사이트가 직접 남긴 방문·유입·문의 기록(site_events, lib/site-events.ts)으로
 * 어느 채널·광고 그룹·검색어로 들어온 사람이 얼마나 읽고 연락했는지 본다.
 * 광고비·클릭·순위는 네이버 쪽 숫자라 '검색광고 상황판'(/admin/ads)에 있다.
 */

type Ev = {
  created_at: Date
  type: 'pageview' | 'leave' | 'call' | 'kakao' | 'form'
  label: string | null
  path: string | null
  source: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_content: string | null
  ad_query: string | null
  ad_rank: number | null
  session_id: string | null
  visitor_id: string | null
  seconds: number | null
  scroll: number | null
}

const DAYS = [1, 7, 30, 90]
const GROUPS: Record<string, string> = {
  'NM-01': '사고·긴급',
  'NM-02': '철골·증축·지붕·벽체',
  'NM-03': '설비·배관·용접',
  'NM-04': '누수 복구·보험',
  'NM-05': '결로·곰팡이',
  'NM-06': '지역',
  'NM-07': '정보탐색',
  'NM-08': '클린룸·방음·파티션',
  'NM-09': '배관 수리·누수',
}
const CONV = ['call', 'kakao', 'form'] as const
const CONV_LABEL: Record<string, string> = { call: '전화', kakao: '카톡', form: '견적' }

function channelOf(e: Ev): string {
  const u = (e.utm_source || '').toLowerCase()
  if (u === 'naver' && (e.utm_medium || '').toLowerCase() === 'cpc') return '네이버 광고'
  if (u) return u === 'naver' ? '네이버(기타 링크)' : u
  const s = (e.source || '').toLowerCase()
  if (s === 'naver') return '네이버 검색'
  if (s === 'google') return '구글'
  if (s === 'daum') return '다음·카카오'
  if (s === 'direct' || !s) return '직접 방문'
  return '기타'
}

type Person = {
  who: string
  channel: string
  group: string | null
  query: string | null
  first: Date
  seconds: number
  scroll: number
  pages: Set<string>
  conv: Record<string, number>
}

function people(events: Ev[]): Person[] {
  const map = new Map<string, Person>()
  for (const e of events) {
    const who = e.visitor_id || e.session_id || `x${e.created_at.getTime()}`
    let p = map.get(who)
    if (!p) {
      p = {
        who,
        channel: channelOf(e),
        group: e.utm_content,
        query: e.ad_query,
        first: e.created_at,
        seconds: 0,
        scroll: 0,
        pages: new Set(),
        conv: {},
      }
      map.set(who, p)
    }
    if (e.type === 'pageview' && e.path) p.pages.add(e.path)
    if (e.type === 'leave') {
      p.seconds += e.seconds || 0
      p.scroll = Math.max(p.scroll, e.scroll || 0)
    }
    if (CONV.includes(e.type as (typeof CONV)[number])) p.conv[e.type] = (p.conv[e.type] || 0) + 1
    if (!p.query && e.ad_query) p.query = e.ad_query
    if (!p.group && e.utm_content) p.group = e.utm_content
  }
  return [...map.values()]
}

const meaningful = (p: Person) => p.seconds >= 30 || p.scroll >= 60 || p.pages.size >= 2 || Object.keys(p.conv).length > 0
const converted = (p: Person) => Object.keys(p.conv).length > 0

type Row = { key: string; people: number; engaged: number; conv: number; call: number; kakao: number; form: number; secs: number[] }
function rollup(ps: Person[], keyOf: (p: Person) => string | null): Row[] {
  const m = new Map<string, Row>()
  for (const p of ps) {
    const k = keyOf(p)
    if (!k) continue
    const r = m.get(k) || { key: k, people: 0, engaged: 0, conv: 0, call: 0, kakao: 0, form: 0, secs: [] }
    r.people++
    if (meaningful(p)) r.engaged++
    if (converted(p)) r.conv++
    for (const c of CONV) if (p.conv[c]) r[c]++
    r.secs.push(p.seconds)
    m.set(k, r)
  }
  return [...m.values()].sort((a, b) => b.conv - a.conv || b.people - a.people)
}
const median = (xs: number[]) => {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}
const kst = (d: Date) => new Date(d.getTime() + 9 * 3600_000)
const ymd = (d: Date) => kst(d).toISOString().slice(0, 10)
const hm = (d: Date) => kst(d).toISOString().slice(5, 16).replace('T', ' ')
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')

async function load(days: number) {
  const since = new Date(Date.now() - days * 86400_000)
  // 방문 기록과 견적 수는 따로 읽는다. 한쪽 표가 없어도 다른 쪽은 보이게 (10/1 견적 표가 없어 상황판 전체가 비었다).
  let events: Ev[] = []
  let quotes = 0
  let error: string | null = null
  try {
    await ensureSiteEvents()
    const ev = await pool.query<Ev>(
      `SELECT created_at,type,label,path,source,utm_source,utm_medium,utm_content,ad_query,ad_rank,session_id,visitor_id,seconds,scroll
         FROM site_events WHERE created_at >= $1 ORDER BY created_at ASC LIMIT 50000`,
      [since],
    )
    events = ev.rows
  } catch (e) {
    console.error('[admin/stats] 방문 기록 조회 실패', e)
    error = '방문 기록을 불러오지 못했습니다.'
  }
  try {
    await ensureQuoteRequests()
    const q = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM quote_requests WHERE created_at >= $1`, [since])
    quotes = q.rows[0]?.n ?? 0
  } catch (e) {
    console.error('[admin/stats] 견적 수 조회 실패', e)
  }
  return { events, quotes, error }
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams
  const days = DAYS.includes(Number(sp.days)) ? Number(sp.days) : 7
  const { events, quotes, error } = await load(days)
  const ps = people(events)
  const total = ps.length
  const engaged = ps.filter(meaningful).length
  const conv = ps.filter(converted).length
  const adPeople = ps.filter((p) => p.channel === '네이버 광고')

  const byChannel = rollup(ps, (p) => p.channel)
  const byGroup = rollup(adPeople, (p) => (p.group ? `${p.group}${GROUPS[p.group] ? ` ${GROUPS[p.group]}` : ''}` : '(그룹 표시 없음)'))
  const byQuery = rollup(adPeople, (p) => p.query).slice(0, 30)
  const byPage = rollup(ps, (p) => [...p.pages][0] || null).slice(0, 15)
  const byDay = rollup(ps, (p) => ymd(p.first)).sort((a, b) => (a.key < b.key ? 1 : -1))
  const recent = events.filter((e) => CONV.includes(e.type as (typeof CONV)[number])).slice(-30).reverse()

  return (
    <>
      <PageHeader
        title="자체 방문 기록"
        description="사이트가 직접 남긴 방문·유입·문의 기록입니다. 같은 사람(같은 기기)은 한 명으로 셉니다. 관리자 화면을 연 기기는 기록하지 않습니다."
      >
        <div className="flex gap-px bg-border">
          {DAYS.map((d) => (
            <Link
              key={d}
              href={`/admin/stats?days=${d}`}
              className={cn('px-3 py-2 text-sm font-medium', d === days ? 'bg-navy text-navy-foreground' : 'bg-background hover:bg-secondary')}
            >
              {d === 1 ? '오늘까지 24시간' : `최근 ${d}일`}
            </Link>
          ))}
        </div>
      </PageHeader>

      <div className="mb-6 flex flex-col gap-3 bg-background p-5 ring-1 ring-border">
        <p className="text-sm leading-relaxed">
          <b>마케팅 상황판은 나노마스터 관리 화면과 같은 화면으로 봅니다.</b> 유입 경로·지역·검색어·전환·광고비까지 나노마스터 상황판과
          같은 계산입니다. 이 사이트가 방문·문의를 적을 때마다 그쪽으로 사본이 갑니다(문의는 건수·시각만, 이름·연락처는 안 갑니다).
          나노마스터 관리자 계정으로 로그인해 엽니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={BOARD_STATS_URL} target="_blank" rel="noopener" className="bg-navy px-3 py-2 text-sm font-semibold text-navy-foreground hover:opacity-90">
            마케팅 상황판 열기
          </a>
          <a href={BOARD_ADS_URL} target="_blank" rel="noopener" className="bg-background px-3 py-2 text-sm font-medium ring-1 ring-border hover:bg-secondary">
            검색광고 상황판 열기
          </a>
        </div>
        <p className="text-xs text-muted-foreground">연동 전에 쌓인 기록은 아래 단추로 한 번 보내면 그쪽에도 나옵니다. 여러 번 눌러도 중복되지 않습니다.</p>
        <BoardSyncButton />
      </div>

      {error && <p className="mb-6 bg-background p-4 text-sm text-destructive ring-1 ring-border">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
        <Tile label="방문한 사람" value={`${total}명`} sub={`네이버 광고로 ${adPeople.length}명`} />
        <Tile label="의미 있는 방문" value={`${engaged}명`} sub={`30초 이상·스크롤 60%·2페이지·문의 중 하나 · ${pct(engaged, total)}`} />
        <Tile label="문의 버튼 누른 사람" value={`${conv}명`} sub={`전화·카톡·견적 · 방문의 ${pct(conv, total)}`} />
        <Tile label="견적 문의 접수" value={`${quotes}건`} sub="견적 문의 메뉴에 들어온 건수" />
      </div>

      <Table
        title="채널별"
        description="어디서 들어왔는지. 네이버 광고는 광고 주소에 붙은 utm 으로, 나머지는 들어오기 전 페이지로 나눕니다."
        rows={byChannel}
        keyLabel="채널"
      />
      <Table
        title="네이버 광고 — 광고 그룹별"
        description="광고 키워드마다 붙여 둔 그룹 코드(utm_content)로 나눕니다."
        rows={byGroup}
        keyLabel="광고 그룹"
      />
      <Table
        title="네이버 광고 — 실제 검색어별"
        description="네이버 검색광고 '자동 추적 파라미터'가 켜져 있어야 검색어가 남습니다. 비어 있으면 광고 시스템 > 도구에서 켜 주세요."
        rows={byQuery}
        keyLabel="검색어"
        empty="아직 검색어가 남은 방문이 없습니다."
      />
      <Table title="처음 들어온 페이지" rows={byPage} keyLabel="페이지" decode />
      <Table title="날짜별" rows={byDay} keyLabel="날짜 (한국)" />

      <section className="mb-6 bg-background p-6 ring-1 ring-border lg:p-8">
        <h2 className="mb-1 text-lg font-bold tracking-tight">최근 문의 버튼 기록</h2>
        <p className="mb-4 text-sm text-muted-foreground">누른 시각을 전화·카톡 내역과 맞춰 보면 어느 광고로 온 손님인지 알 수 있습니다.</p>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">이 기간에 누른 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">시각</th>
                  <th className="py-2 pr-3 font-medium">종류</th>
                  <th className="py-2 pr-3 font-medium">채널</th>
                  <th className="py-2 pr-3 font-medium">광고 그룹 · 검색어</th>
                  <th className="py-2 pr-3 font-medium">누른 곳</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((e, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 pr-3 font-mono tabular-nums">{hm(e.created_at)}</td>
                    <td className="py-2 pr-3 font-semibold">{CONV_LABEL[e.type]}</td>
                    <td className="py-2 pr-3">{channelOf(e)}</td>
                    <td className="py-2 pr-3">{[e.utm_content, e.ad_query].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {safeDecode(e.path || '')} {e.label ? `(${e.label})` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1 bg-background p-6">
      <span className="text-kicker text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  )
}

function Table({
  title,
  description,
  rows,
  keyLabel,
  empty = '이 기간에 기록이 없습니다.',
  decode = false,
}: {
  title: string
  description?: string
  rows: Row[]
  keyLabel: string
  empty?: string
  decode?: boolean
}) {
  return (
    <section className="mb-6 bg-background p-6 ring-1 ring-border lg:p-8">
      <h2 className="mb-1 text-lg font-bold tracking-tight">{title}</h2>
      {description && <p className="mb-4 text-sm text-muted-foreground">{description}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-right text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 text-left font-medium">{keyLabel}</th>
                <th className="py-2 pr-3 font-medium">방문</th>
                <th className="py-2 pr-3 font-medium">의미 있는 방문</th>
                <th className="py-2 pr-3 font-medium">머문 시간(중간)</th>
                <th className="py-2 pr-3 font-medium">전화</th>
                <th className="py-2 pr-3 font-medium">카톡</th>
                <th className="py-2 pr-3 font-medium">견적</th>
                <th className="py-2 font-medium">문의율</th>
              </tr>
            </thead>
            <tbody className="text-right tabular-nums">
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-border">
                  <td className="py-2 pr-3 text-left">{decode ? safeDecode(r.key) : r.key}</td>
                  <td className="py-2 pr-3">{r.people}</td>
                  <td className="py-2 pr-3">
                    {r.engaged} <span className="text-xs text-muted-foreground">({pct(r.engaged, r.people)})</span>
                  </td>
                  <td className="py-2 pr-3">{median(r.secs)}초</td>
                  <td className="py-2 pr-3">{r.call || ''}</td>
                  <td className="py-2 pr-3">{r.kakao || ''}</td>
                  <td className="py-2 pr-3">{r.form || ''}</td>
                  <td className={cn('py-2', r.conv > 0 && 'font-bold text-electric')}>{pct(r.conv, r.people)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
