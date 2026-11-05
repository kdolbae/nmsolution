/** 지출(원가) 기록 형식 — 어드민 화면·서버 공용(DB 없음). 저장은 lib/expenses/table.ts */

export const EXPENSE_CATEGORIES = ['자재', '인건비', '장비·운반', '외주', '경비', '기타'] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export type ExpenseItem = {
  id: string
  name: string
  spec: string
  qty: number
  unit: string
  /** 단가(VAT 별도) */
  price: number
}

export type ExpenseInput = {
  date: string
  category: ExpenseCategory
  /** 거래처(새롬판넬, 철물점, 인력 …) */
  supplier: string
  /** 내용 한 줄 (거래명세서·영수증 제목) */
  title: string
  /** 공급가(VAT 별도). 품목이 있으면 품목 합계로 맞춘다 */
  supply: number
  vat: number
  /** 지급 끝 */
  paid: boolean
  paidAt: string
  items: ExpenseItem[]
  note: string
  /** 근거 서류 이름 (거래명세서 파일명 등) */
  doc: string
}

export type Expense = ExpenseInput & { id: number; total: number; createdAt: string; updatedAt: string; updatedBy: string }

export const newExpenseItemId = () => `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const emptyExpenseItem = (): ExpenseItem => ({ id: newExpenseItemId(), name: '', spec: '', qty: 1, unit: '개', price: 0 })

export const todayKst = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)

export const emptyExpense = (): ExpenseInput => ({
  date: todayKst(),
  category: '자재',
  supplier: '',
  title: '',
  supply: 0,
  vat: 0,
  paid: false,
  paidAt: '',
  items: [],
  note: '',
  doc: '',
})

export const itemAmount = (it: ExpenseItem) => Math.round(it.qty * it.price)
export const itemsSupply = (items: ExpenseItem[]) => items.reduce((a, it) => a + itemAmount(it), 0)

const t = (v: unknown, n = 200) => String(v ?? '').trim().slice(0, n)
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)

export function normalizeExpense(raw: unknown): ExpenseInput {
  const x = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const items: ExpenseItem[] = (Array.isArray(x.items) ? x.items.slice(0, 300) : [])
    .map((r: Record<string, unknown>) => ({
      id: t(r?.id, 40) || newExpenseItemId(),
      name: t(r?.name),
      spec: t(r?.spec, 300),
      qty: Math.round(num(r?.qty) * 1000) / 1000,
      unit: t(r?.unit, 20) || '개',
      price: Math.round(num(r?.price)),
    }))
    .filter((r) => r.name)
  const supply = items.length ? itemsSupply(items) : Math.round(num(x.supply))
  const vatRaw = x.vat === '' || x.vat == null ? null : Math.round(num(x.vat))
  const category = (EXPENSE_CATEGORIES as readonly string[]).includes(String(x.category)) ? (x.category as ExpenseCategory) : '기타'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(t(x.date)) ? t(x.date) : todayKst()
  return {
    date,
    category,
    supplier: t(x.supplier, 100),
    title: t(x.title, 200),
    supply,
    vat: vatRaw ?? Math.round(supply * 0.1),
    paid: !!x.paid,
    paidAt: /^\d{4}-\d{2}-\d{2}$/.test(t(x.paidAt)) ? t(x.paidAt) : '',
    items,
    note: t(x.note, 2000),
    doc: t(x.doc, 200),
  }
}

export const fmtWon = (n: number) => Math.round(n).toLocaleString('ko-KR')
