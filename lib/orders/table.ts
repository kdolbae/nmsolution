import { pool } from '@/lib/db'
import { emptyOrder, emptyParty, emptyPoItem, normalizeOrder, normalizeParty, todayKst, type PoItem, type PoParty, type PoPartyRow, type PurchaseOrder } from './doc'
import { FL_SEOUL_SET } from './flashing'

/**
 * 발주서 표. 운영 DB 에 SQL 을 따로 돌리지 않아도 첫 조회 때 생긴다(lib/clients/table.ts 와 같은 방식).
 * - po_parties: 발주 사업자(issuer)·발주처(supplier) 기본값. 발주서를 만들 때 골라 복사한다.
 * - purchase_orders: 발주서. 사업자 정보는 발주서 안에 복사해 두므로 나중에 기본값을 고쳐도 지난 발주서는 그대로다.
 * 사업자번호·주소 같은 값은 어드민에서 넣는다(공개 저장소라 코드에 두지 않음).
 */
let ready: Promise<void> | null = null

const SEED_PARTIES: { kind: 'issuer' | 'supplier'; party: PoParty }[] = [
  { kind: 'issuer', party: { ...emptyParty('엔엠솔루션'), ceo: '김성배', address: '경기도 평택시 고덕동 도시지원로 121 지식공장아이타워 906호', phone: '1800-5901' } },
  { kind: 'issuer', party: { ...emptyParty('프레치제'), ceo: '김성배' } },
  { kind: 'supplier', party: { ...emptyParty('(주)새롬판넬 화성공장') } },
]

export function ensureOrders(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await pool.query(`CREATE TABLE IF NOT EXISTS po_parties (
        id         bigint generated always as identity primary key,
        kind       text not null,
        data       jsonb not null default '{}'::jsonb,
        sort_order int not null default 0,
        created_at timestamptz not null default now()
      )`)
      await pool.query(`CREATE TABLE IF NOT EXISTS purchase_orders (
        id         bigint generated always as identity primary key,
        no         text,
        data       jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`)
      await pool.query(`CREATE TABLE IF NOT EXISTS po_seeds (key text primary key, created_at timestamptz not null default now())`)
      const { rowCount } = await pool.query(`INSERT INTO po_seeds (key) VALUES ('parties-v1') ON CONFLICT DO NOTHING`)
      if (rowCount) {
        let i = 0
        for (const s of SEED_PARTIES)
          await pool.query(`INSERT INTO po_parties (kind, data, sort_order) VALUES ($1, $2, $3)`, [s.kind, JSON.stringify(s.party), i++])
      }
      // 2026-11-04 kevin: 서울 상가 처마 판넬+후레싱 발주서를 목록에 저장해 두고 어드민에서 고쳐 쓰게 함 (한 번만 넣음)
      const seoul = await pool.query(`INSERT INTO po_seeds (key) VALUES ('seoul-eaves-po-v1') ON CONFLICT DO NOTHING`)
      if (seoul.rowCount) {
        const o = await seoulEavesOrder()
        o.no = await nextNo(o.date)
        await pool.query(`INSERT INTO purchase_orders (no, data) VALUES ($1, $2)`, [o.no, JSON.stringify(o)])
      }
      // 2026-11-04 새롬판넬 거래명세서(서울 화곡동 처마) 기준: 발주처 정보·발주 메모 갱신, 서울 발주서를 실제 납품 내역·발주 완료로 (한 번만)
      const saerom = await pool.query(`INSERT INTO po_seeds (key) VALUES ('saerom-261104') ON CONFLICT DO NOTHING`)
      if (saerom.rowCount) await applySaerom261104()
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

/** 서울 화곡동 상가 처마: 발주 사업자 프레치제, 발주처 새롬판넬. 판넬 2줄 + 후레싱 제안 9종 (후레싱 길이·수량은 비움) */
async function seoulEavesOrder(): Promise<PurchaseOrder> {
  const { rows } = await pool.query<{ kind: string; data: unknown }>(`SELECT kind, data FROM po_parties ORDER BY sort_order, id`)
  const pick = (kind: string, name: RegExp) => {
    const r = rows.find((x) => x.kind === kind && name.test(normalizeParty(x.data).name)) ?? rows.find((x) => x.kind === kind)
    return r ? normalizeParty(r.data) : emptyParty()
  }
  const o = emptyOrder()
  o.issuer = pick('issuer', /프레치제/)
  o.supplier = pick('supplier', /새롬/)
  o.form = 'panel'
  o.siteName = '서울 화곡동 상가 처마'
  o.items = [
    { ...emptyPoItem(), name: '지붕판넬', spec: '100T · 청색 · 난연(성적서 無)', lengthMm: 2400, qty: 14 },
    { ...emptyPoItem(), name: '벽체판넬 (소골)', spec: '100T · 아이보리 · 난연(성적서 無)', lengthMm: 2900, qty: 14, note: '수량 확인' },
    ...FL_SEOUL_SET.map((x) => ({ ...emptyPoItem(), name: x.name, note: x.note, fl: structuredClone(x.fl) })),
  ]
  return o
}

/** 새롬판넬 거래명세서 2026-11-04 (프레치제 ← (주)새롬판넬). 사업자번호·계좌는 코드에 두지 않는다(어드민에서 입력) */
const SAEROM_MEMO = `출고: 판넬·C/S 후레싱·도어·부자재 = 파주공장, G/I 1.6T 후레싱·선홈통 = 김포-인천공장
운임 신용(별도 과세): 5톤 190,000 / 1톤 120,000 (2026-11-04 서울 화곡동)
성적서: 난연 2급 성적서 없음(성적서 X). 결제: 외상 → 세금계산서·입금(계좌는 어드민 입력)
지난 단가(2026-11-04, VAT 별도): 100T EPS 난연2급 지붕 4골 청색 19,000/m² · 소골 아이보리 17,000/m² (양면 0.35T)
C/S 후레싱 0.4T 판넬색: 부착형 물받이 150·250·150·120·50 23,700/EA, 외부 앵글 80·350 14,400/EA, 유바 40·100·40 5,500/EA, 물끊기 120·200 각140° 9,600/EA
G/I 1.6T 앵글 50·100 각96° 14,500/EA · 100T S/W 도어 4면 900×2100 125,000/SET · SDS 볼트 180 260 · 지붕캡 220 · 리벳 4.8×16 30 · 슁글 선홈통 12,000`

async function applySaerom261104() {
  const { rows } = await pool.query<{ id: string; data: unknown }>(`SELECT id, data FROM po_parties WHERE kind = 'supplier' ORDER BY sort_order, id`)
  const found = rows.find((r) => /새롬/.test(normalizeParty(r.data).name))
  const base = found ? normalizeParty(found.data) : emptyParty()
  const party: PoParty = {
    ...base,
    name: '(주)새롬판넬',
    ceo: base.ceo || '정만영',
    address: base.address || '인천광역시 검단구 원당대로 245-6 (오류동)',
    phone: base.phone || '032-566-8686',
    fax: base.fax || '032-566-8684',
    manager: base.manager || '한진주',
    memo: [base.memo, SAEROM_MEMO].filter(Boolean).join('\n'),
  }
  if (found) await pool.query(`UPDATE po_parties SET data = $2 WHERE id = $1`, [found.id, JSON.stringify(party)])
  else await pool.query(`INSERT INTO po_parties (kind, data, sort_order) VALUES ('supplier', $1, (SELECT coalesce(max(sort_order), 0) + 1 FROM po_parties))`, [JSON.stringify(party)])

  // 서울 발주서: 아직 '작성 중'이면 실제 납품 내역으로 바꾸고 발주 완료 처리. 어드민에서 이미 손댄(발주 완료·취소) 것은 두고 새로 넣는다
  const po = await pool.query<{ id: string; data: unknown }>(`SELECT id, data FROM purchase_orders ORDER BY id`)
  const seoul = po.rows.map((r) => ({ id: r.id, o: normalizeOrder(r.data) })).find((x) => /서울 화곡동/.test(x.o.siteName))
  const o = seoul && seoul.o.status === '작성 중' ? seoul.o : emptyOrder()
  if (!seoul || seoul.o.status !== '작성 중') {
    o.form = 'panel'
    const issuers = await pool.query<{ data: unknown }>(`SELECT data FROM po_parties WHERE kind = 'issuer' ORDER BY sort_order, id`)
    const issuer = issuers.rows.map((r) => normalizeParty(r.data)).find((p) => /프레치제/.test(p.name))
    if (issuer) o.issuer = issuer
  }
  o.supplier = party
  o.date = '2026-11-04'
  o.status = '발주 완료'
  o.siteName = '서울 화곡동 상가 처마'
  o.siteAddress = o.siteAddress || '서울 강서구 화곡동 371-59'
  o.deliveryPlace = o.deliveryPlace || '현장 (서울 강서구 화곡동 371-59)'
  o.payment = o.payment || '외상 (세금계산서 후 입금)'
  const ea = (name: string, spec: string, qty: number, price: number, unit = 'EA', note = ''): PoItem => ({ ...emptyPoItem(), name, spec, qty, unit, basis: 'ea', price, note })
  o.items = [
    { ...emptyPoItem(), name: '지붕판넬 4골', spec: '100T EPS 난연2급 청색 · 양면 0.35T (성적서 無)', lengthMm: 2350, qty: 16, price: 19000, note: '파주공장' },
    { ...emptyPoItem(), name: '지붕판넬 4골', spec: '100T EPS 난연2급 청색 · 양면 0.35T (성적서 無)', lengthMm: 3000, qty: 1, price: 19000 },
    { ...emptyPoItem(), name: '벽체판넬 (소골)', spec: '100T EPS 난연2급 아이보리 · 양면 0.35T (성적서 無)', lengthMm: 2700, qty: 12, price: 17000 },
    { ...emptyPoItem(), name: '벽체판넬 (소골)', spec: '100T EPS 난연2급 아이보리 · 양면 0.35T (성적서 無)', lengthMm: 3000, qty: 3, price: 17000 },
    ea('부착형 물받이', 'C/S 후레싱 청색 0.4T · 150·250·150·120·50', 6, 23700),
    ea('외부 앵글', 'C/S 후레싱 청색 0.4T · 80·350', 5, 14400),
    ea('유바', 'C/S 후레싱 아이보리 0.4T · 40·100·40', 16, 5500),
    ea('물끊기', 'C/S 후레싱 아이보리 0.4T · 120·200 각 140°', 5, 9600),
    ea('앵글', 'G/I 후레싱 1.6T · 50·100 각 96°', 6, 14500, 'EA', '김포-인천공장'),
    ea('100T S/W DOOR 4면 아이보리', '900×2100', 2, 125000, 'SET'),
    ea('S.D.S 볼트', '180mm', 100, 260),
    ea('지붕캡 청색', '', 50, 220),
    ea('리벳', '4.8×16', 200, 30),
    ea('슁글용 선홈통', '징크블랙', 1, 12000),
    ea('운임 (신용)', '5톤 1대 + 1톤 1대', 1, 310000, '식'),
  ]
  o.notes = [o.notes, '2026-11-04 새롬판넬 거래명세서 기준 (공급가 2,527,273 · 매출할인 -127 포함 · VAT 별도). 성적서 없음.'].filter(Boolean).join('\n')
  if (seoul && seoul.o.status === '작성 중') await pool.query(`UPDATE purchase_orders SET data = $2, updated_at = now() WHERE id = $1`, [seoul.id, JSON.stringify(o)])
  else {
    o.no = await nextNo(o.date)
    await pool.query(`INSERT INTO purchase_orders (no, data) VALUES ($1, $2)`, [o.no, JSON.stringify(o)])
  }
}

type PartyDbRow = { id: string; kind: string; data: unknown; sort_order: number }
const toParty = (r: PartyDbRow): PoPartyRow => ({
  ...normalizeParty(r.data),
  id: Number(r.id),
  kind: r.kind === 'supplier' ? 'supplier' : 'issuer',
  sortOrder: r.sort_order,
})

export async function listParties(): Promise<PoPartyRow[]> {
  await ensureOrders()
  const { rows } = await pool.query<PartyDbRow>(`SELECT id, kind, data, sort_order FROM po_parties ORDER BY kind, sort_order, id`)
  return rows.map(toParty)
}

export async function saveParty(id: number | null, kind: 'issuer' | 'supplier', party: PoParty): Promise<number> {
  await ensureOrders()
  const data = JSON.stringify(normalizeParty(party))
  if (id) {
    await pool.query(`UPDATE po_parties SET data = $2 WHERE id = $1`, [id, data])
    return id
  }
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO po_parties (kind, data, sort_order) VALUES ($1, $2, (SELECT coalesce(max(sort_order), 0) + 1 FROM po_parties)) RETURNING id`,
    [kind, data],
  )
  return Number(rows[0].id)
}

export async function deleteParty(id: number) {
  await ensureOrders()
  await pool.query(`DELETE FROM po_parties WHERE id = $1`, [id])
}

export type OrderRow = { id: number; order: PurchaseOrder; createdAt: Date; updatedAt: Date }
type OrderDbRow = { id: string; data: unknown; created_at: Date; updated_at: Date }
const toOrder = (r: OrderDbRow): OrderRow => ({ id: Number(r.id), order: normalizeOrder(r.data), createdAt: r.created_at, updatedAt: r.updated_at })

export async function listOrders(): Promise<OrderRow[]> {
  await ensureOrders()
  const { rows } = await pool.query<OrderDbRow>(`SELECT id, data, created_at, updated_at FROM purchase_orders ORDER BY id DESC LIMIT 500`)
  return rows.map(toOrder)
}

export async function getOrder(id: number): Promise<OrderRow | null> {
  if (!Number.isFinite(id)) return null
  await ensureOrders()
  const { rows } = await pool.query<OrderDbRow>(`SELECT id, data, created_at, updated_at FROM purchase_orders WHERE id = $1`, [id])
  return rows[0] ? toOrder(rows[0]) : null
}

/** 발주번호 PO-YYMM-순번 (발주일자 기준 달) */
async function nextNo(date: string): Promise<string> {
  const d = /^\d{4}-\d{2}/.test(date) ? date : todayKst()
  const prefix = `PO-${d.slice(2, 4)}${d.slice(5, 7)}-`
  const { rows } = await pool.query<{ no: string }>(`SELECT no FROM purchase_orders WHERE no LIKE $1`, [prefix + '%'])
  const max = rows.reduce((m, r) => Math.max(m, Number(r.no.slice(prefix.length)) || 0), 0)
  return prefix + String(max + 1).padStart(2, '0')
}

export async function insertOrder(order: PurchaseOrder): Promise<number> {
  await ensureOrders()
  const o = normalizeOrder(order)
  o.no = o.no || (await nextNo(o.date))
  const { rows } = await pool.query<{ id: string }>(`INSERT INTO purchase_orders (no, data) VALUES ($1, $2) RETURNING id`, [o.no, JSON.stringify(o)])
  return Number(rows[0].id)
}

export async function updateOrder(id: number, order: PurchaseOrder): Promise<PurchaseOrder> {
  await ensureOrders()
  const o = normalizeOrder(order)
  if (!o.no) o.no = await nextNo(o.date)
  await pool.query(`UPDATE purchase_orders SET no = $2, data = $3, updated_at = now() WHERE id = $1`, [id, o.no, JSON.stringify(o)])
  return o
}

export async function removeOrder(id: number) {
  await ensureOrders()
  await pool.query(`DELETE FROM purchase_orders WHERE id = $1`, [id])
}
