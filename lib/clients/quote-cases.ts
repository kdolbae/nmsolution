/**
 * 지난 견적에서 새 견적 시작하기 (2026-10-28 kevin "지금까지 내가 만든 견적을 특정해서 견적 만드는 프로세스").
 *
 * 1. 사례: 업체마다 지금 견적서 + 고객 발송본을 '견적 사례'로 본다 (lib/clients/quote-cases-db.ts 가 모음).
 *    새 견적을 저장하거나 발송하면 다음 견적부터 자동으로 사례가 된다.
 * 2. 패턴: 사례마다 공사 종류(태그)·직종별 인·일과 일당·공사 일수·제비율·공급가액을 뽑는다.
 * 3. 찾기: 새 견적 설명(공사명·요청 내용)과 태그·글자 겹침으로 비슷한 사례를 순서대로 보여 준다.
 * 4. 초안: 고른 사례의 공종·줄을 그대로 복사하고, 노무 일당·제비율은 지금 회사 기준으로 바꾸고,
 *    간접노무비는 직접노무비 × 기준 % 로 다시 계산한다. 수량·인원·일수는 그대로 두고 현장에 맞게 고친다.
 * 브라우저·서버 양쪽에서 쓰므로 Node 전용 API 를 쓰지 않는다.
 */

import { calcQuote, newId, type Quote, type QuoteItem, type QuoteRates, type QuoteSection } from './quote'

// ---------- 회사 기준 ----------

/** 직종. match 는 노무비 줄 품명에 거는 식, 위에서부터 먼저 맞는 것을 쓴다 */
export type Trade = { key: string; label: string; match: RegExp; price: number | null; settled: boolean }

/**
 * 노무 일당 기준. settled=false 는 아직 kevin 이 정하지 않아 사례 값을 임시로 쓴 것.
 * 2026-10-26 kevin: 고급기능공 35만, 중급기능공 28만, 용접사 50만, 플랜트배관공 40만, 전기 35만.
 */
export const TRADES: Trade[] = [
  { key: 'indirect', label: '간접노무비', match: /간접노무비/, price: null, settled: true },
  { key: 'leader', label: '팀장·현장 관리자', match: /팀장|관리자급|현장\s*관리자/, price: 400000, settled: false },
  { key: 'safety', label: '안전·신호·화재감시', match: /안전담당|관리감독|신호수|화재감시/, price: null, settled: false },
  { key: 'tig', label: '용접사', match: /^용접사/, price: 500000, settled: true },
  { key: 'steelweld', label: '용접기공 (철골)', match: /용접기공/, price: 350000, settled: false },
  { key: 'pipe', label: '플랜트배관공', match: /배관공|제관/, price: 400000, settled: true },
  { key: 'elec', label: '전기', match: /전기/, price: 350000, settled: true },
  { key: 'rigger', label: '도비', match: /도비/, price: 300000, settled: false },
  { key: 'paint', label: '도장공', match: /도장/, price: 300000, settled: false },
  { key: 'grind', label: '사상 기술자', match: /사상/, price: 300000, settled: false },
  { key: 'mid', label: '중급기능공', match: /중급/, price: 280000, settled: true },
  { key: 'helper', label: '조공', match: /조공|펜스 설치/, price: 250000, settled: false },
  { key: 'senior', label: '고급기능공', match: /고급|기능공|기술자/, price: 350000, settled: true },
]

/** 간접노무비 = 직접노무비 × 이 % (조달청 2026, 10억 미만·6개월 이하) */
export const INDIRECT_LABOR_PCT = 15

/** 제비율 기준 (2026-10-26 kevin: 일반관리비 8%·이윤 15%·안전관리비 3.11%). 구간표는 확정 대기 */
export const STANDARD_RATES: QuoteRates = { injury: 3.56, employment: 1.15, safety: 3.11, overhead: 8, profit: 15 }

/** 현장 경비 기준 (식대·교통·소모품, 투입 인·일당) */
export const STANDARD_EXPENSE = 50000

export function tradeOf(name: string): Trade | null {
  const n = name.trim()
  return TRADES.find((t) => t.match.test(n)) ?? null
}

// ---------- 공사 종류 태그 ----------

const TAGS: [string, RegExp][] = [
  ['배관', /배관(?!·배선)|플랜지|에어벤트|STS|SUS|엘보|레듀서/],
  ['펌프', /펌프/],
  ['전기', /전기|케이블|LED|조명|콘센트|차단기/],
  ['판넬', /판넬|칸막이|천장/],
  ['지붕', /지붕|용마루|칼라강판|물받이/],
  ['외벽', /외벽|후레싱|코너|스커트/],
  ['철골', /철골|H빔|H-\d|기둥|연속보|장선|복층|적치대|브래킷/],
  ['용접', /용접/],
  ['인양', /크레인|인양|도비|안착|회전/],
  ['도장', /도장|방청|상도|하도/],
  ['철거', /철거|해체|폐기물/],
  ['도어', /도어|문틀/],
  ['고소작업', /스카이잭|고소작업|리프트/],
  ['보온', /보온|단열|케이싱/],
]

export function workTags(text: string): string[] {
  return TAGS.filter(([, re]) => re.test(text)).map(([t]) => t)
}

// ---------- 사례 ----------

export type QuoteCase = {
  /** 고유 키 (업체 id + 지금/발송 차수) */
  key: string
  clientId: number
  clientName: string
  /** '지금 견적' 또는 발송 견적번호 */
  source: string
  sentAt?: string
  quote: Quote
}

export type CrewLine = { trade: string; label: string; manDays: number; prices: number[]; amount: number }

export type CasePattern = {
  tags: string[]
  supply: number
  options: number
  /** 공사 기간 (특기사항 '공사 기간' 줄의 첫 'N일') */
  days: number | null
  rates: QuoteRates
  costCalc: boolean
  /** 직종별 인·일 (간접노무비 제외) */
  crew: CrewLine[]
  directLabor: number
  indirectLabor: number
  /** 간접노무비 / 직접노무비 % */
  indirectPct: number | null
  material: number
  /** 노무비·재료비를 뺀 나머지 (장비·운반·안전·경비) */
  expense: number
  /** 현장 경비 1인·일 단가 */
  expensePerDay: number | null
  sections: { name: string; option: boolean; total: number }[]
}

function caseText(q: Quote) {
  return [q.title, ...q.sections.flatMap((s) => [s.name, s.desc, ...s.items.map((i) => `${i.name} ${i.spec}`)])].join(' ')
}

export function quoteDays(notes: string): number | null {
  const line = notes.split('\n').find((l) => /공사\s*기간/.test(l)) ?? ''
  const m = line.match(/(\d+(?:\.\d+)?)\s*일/)
  return m ? Number(m[1]) : null
}

export function casePattern(q: Quote): CasePattern {
  const calc = calcQuote(q)
  const crew = new Map<string, CrewLine>()
  let directLabor = 0
  let indirectLabor = 0
  let material = 0
  let expense = 0
  let expensePerDay: number | null = null
  q.sections.forEach((s) => {
    if (s.option) return
    for (const i of s.items) {
      const amt = Math.round(i.qty * i.price)
      if (i.kind === '재료비') material += amt
      else if (i.kind !== '노무비') {
        expense += amt
        if (/현장\s*경비/.test(i.name) && /인·일/.test(i.unit)) expensePerDay = i.price
      } else {
        const t = tradeOf(i.name)
        if (t?.key === 'indirect') {
          indirectLabor += amt
          continue
        }
        directLabor += amt
        // 직종표에 없는 품명은 품명 그대로 한 줄 (예: '기공', '시공자')
        const key = t?.key ?? `etc:${i.name.trim()}`
        const c = crew.get(key) ?? { trade: key, label: t?.label ?? i.name.trim(), manDays: 0, prices: [], amount: 0 }
        if (/인·일|인일/.test(i.unit)) c.manDays += i.qty
        if (i.price && !c.prices.includes(i.price)) c.prices.push(i.price)
        c.amount += amt
        crew.set(key, c)
      }
    }
  })
  return {
    tags: workTags(caseText(q)),
    supply: calc.supply,
    options: calc.options,
    days: quoteDays(q.notes),
    rates: q.rates,
    costCalc: q.costCalc,
    crew: [...crew.values()].sort((a, b) => b.amount - a.amount),
    directLabor,
    indirectLabor,
    indirectPct: directLabor && indirectLabor ? Math.round((indirectLabor / directLabor) * 1000) / 10 : null,
    material,
    expense,
    expensePerDay,
    sections: q.sections.map((s, i) => ({ name: s.name, option: !!s.option, total: calc.sections[i].total })),
  }
}

// ---------- 찾기 ----------

function grams(text: string) {
  const t = text.replace(/[^0-9A-Za-z가-힣]/g, '')
  const out = new Set<string>()
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2))
  return out
}

export type CaseMatch = { c: QuoteCase; pattern: CasePattern; score: number; sharedTags: string[] }

/** 비슷한 순서. 태그 하나 겹칠 때 3점 + 공사명·공종명 글자 겹침(0~10점) */
export function findSimilar(request: string, cases: QuoteCase[], pickTags: string[] = []): CaseMatch[] {
  const want = new Set([...workTags(request), ...pickTags])
  const rg = grams(request)
  return cases
    .map((c) => {
      const pattern = casePattern(c.quote)
      const sharedTags = pattern.tags.filter((t) => want.has(t))
      const head = grams([c.quote.title, ...c.quote.sections.map((s) => `${s.name} ${s.desc}`)].join(' '))
      let hit = 0
      for (const g of rg) if (head.has(g)) hit++
      const textScore = rg.size ? (hit / rg.size) * 10 : 0
      return { c, pattern, sharedTags, score: Math.round((sharedTags.length * 3 + textScore) * 10) / 10 }
    })
    .sort((a, b) => b.score - a.score || b.pattern.supply - a.pattern.supply)
}

// ---------- 직종 단가 이력 ----------

export type TradeHistory = { trade: Trade; uses: { clientName: string; price: number; manDays: number }[] }

/** 직종마다 어느 견적에 얼마로 몇 인·일 넣었는지. 기준 일당과 다른 값이 보이면 기준을 정할 때 씀 */
export function tradeHistory(cases: QuoteCase[]): TradeHistory[] {
  return TRADES.filter((t) => t.key !== 'indirect')
    .map((trade) => {
      const uses: TradeHistory['uses'] = []
      for (const c of cases) {
        const line = casePattern(c.quote).crew.find((x) => x.trade === trade.key)
        if (line) for (const price of line.prices) uses.push({ clientName: c.clientName, price, manDays: line.manDays })
      }
      return { trade, uses }
    })
    .filter((h) => h.uses.length)
}

// ---------- 초안 ----------

export type DraftOptions = {
  /** 노무 일당을 회사 기준(TRADES 중 settled)으로 바꿈. 기준이 안 정해진 직종은 사례 값 그대로 */
  standardLabor: boolean
  /** 제비율을 STANDARD_RATES 로 바꿈 */
  standardRates: boolean
  /** 선택 항목 공종도 가져옴 */
  withOptions: boolean
  /** 특기사항도 가져옴 (기간·포함·제외는 현장에 맞게 고칠 것) */
  withNotes: boolean
  /** 간접노무비 줄이 없는 공종(예전 견적)에 간접노무비 줄을 넣음 (2026-10-26 kevin: 모든 견적은 직접 + 간접노무비) */
  addIndirect: boolean
}

export const DEFAULT_DRAFT_OPTIONS: DraftOptions = { standardLabor: true, standardRates: true, withOptions: true, withNotes: true, addIndirect: true }

export type DraftChange = { section: string; item: string; from: number; to: number }

function directLaborOf(items: QuoteItem[]) {
  return items
    .filter((i) => i.kind === '노무비' && tradeOf(i.name)?.key !== 'indirect')
    .reduce((a, i) => a + Math.round(i.qty * i.price), 0)
}

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')

/** 공종 하나의 간접노무비 줄을 직접노무비 × pct 로 다시 맞춘다 */
export function refreshIndirect(s: QuoteSection, pct = INDIRECT_LABOR_PCT): QuoteSection {
  const direct = directLaborOf(s.items)
  return {
    ...s,
    items: s.items.map((i) =>
      i.kind === '노무비' && tradeOf(i.name)?.key === 'indirect'
        ? { ...i, qty: 1, unit: '식', price: Math.round((direct * pct) / 100), spec: `현장 관리 인력 (직접노무비 ${won(direct)} × ${pct}%)` }
        : i,
    ),
  }
}

/** 고른 사례로 새 견적의 공종·특기사항·제비율을 만든다. 견적번호·날짜·수신란은 지금 견적 것을 둔다 */
export function draftFromCase(current: Quote, source: Quote, opt: DraftOptions = DEFAULT_DRAFT_OPTIONS) {
  const changes: DraftChange[] = []
  const sections: QuoteSection[] = source.sections
    .filter((s) => opt.withOptions || !s.option)
    .map((s) => {
      const items = s.items.map((i) => {
        let price = i.price
        if (opt.standardLabor && i.kind === '노무비') {
          const t = tradeOf(i.name)
          if (t?.settled && t.price && t.price !== i.price && /인·일|인일/.test(i.unit)) {
            changes.push({ section: s.name, item: i.name, from: i.price, to: t.price })
            price = t.price
          }
        }
        if (opt.standardLabor && i.kind !== '노무비' && /현장\s*경비/.test(i.name) && /인·일/.test(i.unit) && i.price !== STANDARD_EXPENSE) {
          changes.push({ section: s.name, item: i.name, from: i.price, to: STANDARD_EXPENSE })
          price = STANDARD_EXPENSE
        }
        return { ...i, id: newId('i'), price }
      })
      const hasIndirect = items.some((i) => i.kind === '노무비' && tradeOf(i.name)?.key === 'indirect')
      if (opt.addIndirect && !hasIndirect && !s.flat && directLaborOf(items) > 0) {
        const at = items.reduce((a, i, idx) => (i.kind === '노무비' ? idx + 1 : a), 0)
        items.splice(at, 0, { id: newId('i'), kind: '노무비', name: '간접노무비', spec: '', unit: '식', qty: 1, price: 0, note: '' })
        changes.push({ section: s.name, item: '간접노무비 줄 추가', from: 0, to: Math.round((directLaborOf(items) * INDIRECT_LABOR_PCT) / 100) })
      }
      return refreshIndirect({ ...s, id: newId('s'), items })
    })
  const rates = opt.standardRates ? { ...STANDARD_RATES } : { ...source.rates }
  const quote: Quote = {
    ...current,
    title: current.title || source.title,
    sections,
    costCalc: source.costCalc || opt.standardRates,
    rates,
    truncate: source.truncate,
    notes: opt.withNotes ? source.notes : current.notes,
    optionLabel: source.optionLabel,
    deductLabel: source.deductLabel,
    discount: 0,
  }
  return { quote, changes }
}

/** 초안을 만든 뒤 사람이 꼭 다시 볼 것 (현장마다 다른 값) */
export const DRAFT_CHECKS = [
  '재료 수량·규격: 이번 현장 실측·도면 값으로 바꿈',
  '인원·일수: 날짜별 투입 인원표대로 바꿈 (견적 인원은 실제 투입 인원만)',
  '장비·운반: 진입 조건·층수·일수 확인',
  '특기사항: 공사 기간·결제 조건·포함·제외를 이번 공사에 맞춤',
  '간접노무비는 저장 전 줄 수량을 고친 뒤 [간접노무비 다시 계산]을 누름',
]
