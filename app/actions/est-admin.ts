'use server'

import { revalidatePath } from 'next/cache'
import { pool } from '@/lib/db'
import { requireEst } from '@/lib/session'
import { act, idOf, int, jsonOf, num, str } from '@/lib/est/act'
import { isEstRole } from '@/lib/est/perm'
import { EstError, n } from '@/lib/est/table'
import { kstToday } from '@/lib/est/data'
import { saveSetting } from '@/lib/est/settings'
import { SETTING_DEFAULT_MAP } from '@/lib/est/settings-defaults'
import { tx } from '@/lib/est/draft'

/** 마스터·요율·규칙·설정은 대표(ceo)만 고침(§8). 로컬 관리자는 ceo 로 봄 */
const refresh = () => revalidatePath('/admin/est', 'layout')
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const KINDS = ['자재', '용역', '장비', '노무', '경비']
const QTY_TYPES = ['fixed', 'area_factor', 'people_days', 'rule', 'answer', 'answer_mul', 'visits']

// ---------- 품목·단가 ----------

export type ItemInput = {
  code: string
  kind: string
  name: string
  spec: string
  unit: string
  qtyRuleType: string
  qtyRule: string
  basisText: string
  internalMemo: string
  laborClass: string
  isActive: boolean
  /** 새 품목이거나 단가를 바꿀 때 */
  price?: number | null
}

export async function saveItem(input: ItemInput, isNew: boolean) {
  return act(async () => {
    const s = await requireEst('ceo')
    const code = str(input.code, 60).toUpperCase()
    if (!/^[A-Z0-9][A-Z0-9_-]{1,59}$/.test(code)) throw new EstError('품목 코드는 영문 대문자·숫자·하이픈으로 2자 이상')
    const name = str(input.name, 200)
    if (!name) throw new EstError('품명을 입력해야 함')
    const kind = KINDS.includes(input.kind) ? input.kind : '자재'
    const qtyType = QTY_TYPES.includes(input.qtyRuleType) ? input.qtyRuleType : 'fixed'
    const qtyRule = jsonOf(input.qtyRule, '수량 산식') ?? {}
    const laborClass = ['our_staff', 'daily', 'partner'].includes(input.laborClass) ? input.laborClass : null
    await tx(async (c) => {
      if (isNew) {
        const { rowCount } = await c.query(
          `INSERT INTO est_item (code, kind, name, spec, unit, qty_rule_type, qty_rule, basis_text, internal_memo, labor_class, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (code) DO NOTHING`,
          [code, kind, name, str(input.spec, 200), str(input.unit, 20) || '식', qtyType, JSON.stringify(qtyRule), str(input.basisText, 2000), str(input.internalMemo, 2000), laborClass, input.isActive !== false],
        )
        if (!rowCount) throw new EstError('이미 있는 품목 코드임')
      } else {
        const { rowCount } = await c.query(
          `UPDATE est_item SET kind=$2, name=$3, spec=$4, unit=$5, qty_rule_type=$6, qty_rule=$7, basis_text=$8, internal_memo=$9, labor_class=$10, is_active=$11, updated_at=now() WHERE code=$1`,
          [code, kind, name, str(input.spec, 200), str(input.unit, 20) || '식', qtyType, JSON.stringify(qtyRule), str(input.basisText, 2000), str(input.internalMemo, 2000), laborClass, input.isActive !== false],
        )
        if (!rowCount) throw new EstError('없는 품목임')
      }
      if (input.price !== undefined && input.price !== null && String(input.price) !== '') {
        await c.query(`INSERT INTO est_item_price (item_code, price, effective_from, note, source, created_by) VALUES ($1,$2,$3,$4,'manual',$5)`, [
          code, Math.max(0, int(input.price)), kstToday(), isNew ? '품목 등록' : '단가 변경', s.userId,
        ])
      }
    })
    refresh()
  })
}

export async function addItemPrice(itemCode: string, price: number, effectiveFrom: string, note: string) {
  return act(async () => {
    const s = await requireEst('ceo')
    const p = int(price)
    if (p < 0) throw new EstError('단가는 0 이상')
    await pool.query(`INSERT INTO est_item_price (item_code, price, effective_from, note, source, created_by) VALUES ($1,$2,$3,$4,'manual',$5)`, [
      str(itemCode, 60), p, isDate(effectiveFrom) ? effectiveFrom : kstToday(), str(note, 300) || null, s.userId,
    ])
    refresh()
  })
}

// ---------- 실단가 관측·노무 실단가 ----------

export async function addActualCost(input: { itemCode: string; source: string; unitPrice: number; vendor: string; observedOn: string; note: string }) {
  return act(async () => {
    const s = await requireEst('ceo')
    const price = int(input.unitPrice)
    if (!(price > 0)) throw new EstError('실단가를 입력해야 함')
    const src = ['purchase', 'rental', 'subcontract_quote', 'subcontract_contract', 'labor', 'expense', 'manual'].includes(input.source) ? input.source : 'manual'
    await pool.query(
      `INSERT INTO est_actual_cost (item_code, source, unit_price, vendor, observed_on, note, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [str(input.itemCode, 60), src, price, str(input.vendor, 200) || null, isDate(input.observedOn) ? input.observedOn : kstToday(), str(input.note, 500) || null, s.userId],
    )
    refresh()
  })
}

export async function deleteActualCost(id: number) {
  return act(async () => {
    await requireEst('ceo')
    await pool.query(`DELETE FROM est_actual_cost WHERE id = $1`, [idOf(id)])
    refresh()
  })
}

export async function addLaborRate(input: { laborClass: string; itemCode: string; dayRate: number; overtimeFactor: number; nightFactor: number; effectiveFrom: string; note: string }) {
  return act(async () => {
    await requireEst('ceo')
    const cls = ['our_staff', 'daily', 'partner'].includes(input.laborClass) ? input.laborClass : null
    if (!cls) throw new EstError('구분을 골라야 함')
    const rate = int(input.dayRate)
    if (!(rate > 0)) throw new EstError('1일 단가를 입력해야 함')
    await pool.query(
      `INSERT INTO est_labor_rate (labor_class, item_code, day_rate, overtime_factor, night_factor, effective_from, note) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [cls, str(input.itemCode, 60) || null, rate, num(input.overtimeFactor) || 1.5, num(input.nightFactor) || 1.5, isDate(input.effectiveFrom) ? input.effectiveFrom : kstToday(), str(input.note, 300) || null],
    )
    refresh()
  })
}

// ---------- 요율 세트 ----------

export async function saveRateSet(input: { id?: number | null; code: string; name: string; mode: string; rates: Record<string, number>; truncateUnit: number; expensePerCrewDay: number; isActive: boolean }) {
  return act(async () => {
    await requireEst('ceo')
    const code = str(input.code, 40).toUpperCase()
    if (!/^[A-Z0-9_]{2,40}$/.test(code)) throw new EstError('요율 코드는 영문 대문자·숫자·밑줄')
    const name = str(input.name, 100)
    if (!name) throw new EstError('이름을 입력해야 함')
    const mode = input.mode === 'simple' ? 'simple' : 'full'
    const keys = mode === 'full' ? ['injury', 'employment', 'safety', 'overhead', 'profit'] : ['misc', 'profit']
    const rates: Record<string, number> = {}
    for (const k of keys) {
      const v = num(input.rates?.[k])
      if (v < 0 || v > 100) throw new EstError('요율은 0~100(%)')
      rates[k] = v
    }
    const args = [code, name, mode, JSON.stringify(rates), Math.max(0, int(input.truncateUnit)), Math.max(0, int(input.expensePerCrewDay)), input.isActive !== false]
    if (input.id) {
      await pool.query(
        `UPDATE est_rate_set SET code=$2, name=$3, mode=$4, rates=$5, truncate_unit=$6, expense_per_crew_day=$7, is_active=$8, is_sample=false, updated_at=now() WHERE id=$1`,
        [idOf(input.id), ...args],
      )
    } else {
      const { rowCount } = await pool.query(
        `INSERT INTO est_rate_set (code, name, mode, rates, truncate_unit, expense_per_crew_day, is_active, is_sample) VALUES ($1,$2,$3,$4,$5,$6,$7,false) ON CONFLICT (code) DO NOTHING`,
        args,
      )
      if (!rowCount) throw new EstError('이미 있는 요율 코드임')
    }
    refresh()
  })
}

// ---------- 규칙 ----------

export async function saveRule(input: { id?: number | null; code: string; class1Id: number | null; name: string; condition: string; action: string; message: string; severity: string; isActive: boolean; sortOrder: number }) {
  return act(async () => {
    await requireEst('ceo')
    const code = str(input.code, 60).toUpperCase()
    if (!/^[A-Z0-9_-]{2,60}$/.test(code)) throw new EstError('규칙 코드는 영문 대문자·숫자·밑줄')
    const name = str(input.name, 200)
    if (!name) throw new EstError('이름을 입력해야 함')
    const condition = jsonOf(input.condition, '조건')
    if (!condition || typeof condition !== 'object') throw new EstError('조건을 입력해야 함(예: {"question":"hot_work","op":"truthy"})')
    const action = jsonOf(input.action, '동작') ?? {}
    if (typeof action !== 'object') throw new EstError('동작 JSON 이 객체가 아님')
    const add = (action as Record<string, unknown>).add_item
    if (add) {
      const { rows } = await pool.query(`SELECT 1 FROM est_item WHERE code = $1`, [add])
      if (!rows[0]) throw new EstError(`동작의 품목 코드(${String(add)})가 없음`)
    }
    const args = [code, input.class1Id || null, name, JSON.stringify(condition), JSON.stringify(action), str(input.message, 500) || null, input.severity === 'warn' ? 'warn' : 'error', input.isActive !== false, int(input.sortOrder)]
    if (input.id) {
      await pool.query(
        `UPDATE est_rule SET code=$2, class1_id=$3, name=$4, condition=$5, action=$6, message=$7, severity=$8, is_active=$9, sort_order=$10, is_sample=false WHERE id=$1`,
        [idOf(input.id), ...args],
      )
    } else {
      const { rowCount } = await pool.query(
        `INSERT INTO est_rule (code, class1_id, name, condition, action, message, severity, is_active, sort_order, is_sample) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false) ON CONFLICT (code) DO NOTHING`,
        args,
      )
      if (!rowCount) throw new EstError('이미 있는 규칙 코드임')
    }
    refresh()
  })
}

// ---------- 기준 설정(S14) ----------

/** value 는 JSON 문자열(화면 폼이 타입에 맞게 만듦). 기본값과 타입이 다르면 거절 */
export async function saveEstSetting(key: string, valueJson: string) {
  return act(async () => {
    const s = await requireEst('ceo')
    const k = str(key, 100)
    if (!(k in SETTING_DEFAULT_MAP)) throw new EstError('없는 설정 항목임')
    const v = jsonOf(valueJson, '설정값')
    const d = SETTING_DEFAULT_MAP[k]
    const kind = (x: unknown) => (Array.isArray(x) ? 'array' : x === null ? 'null' : typeof x)
    if (kind(d) !== kind(v)) throw new EstError('설정값 형식이 기본값과 다름')
    if (typeof v === 'number' && !Number.isFinite(v)) throw new EstError('숫자가 아님')
    await saveSetting(k, v, s.name || s.email)
    refresh()
  })
}

// ---------- 사용자 견적 역할 ----------

export async function setUserEstRole(userId: string, role: string | null) {
  return act(async () => {
    await requireEst('ceo')
    if (role !== null && !isEstRole(role)) throw new EstError('역할이 올바르지 않음')
    const { rows } = await pool.query(`SELECT role FROM "user" WHERE id = $1`, [str(userId, 100)])
    if (!rows[0]) throw new EstError('없는 사용자임')
    if (rows[0].role === 'partner') throw new EstError('협력업체 계정에는 견적 역할을 줄 수 없음')
    await pool.query(`UPDATE "user" SET est_role = $2 WHERE id = $1`, [userId, role])
    refresh()
  })
}

// ---------- 마스터 갱신 후보(S15) ----------

/** 적용 = 견적단가 새 줄(source variance). 단가는 기본 실단가, 화면에서 고쳐 넣을 수 있음 */
export async function decideVariance(flagId: number, decision: 'apply' | 'ignore', price?: number) {
  return act(async () => {
    const s = await requireEst('ceo')
    await tx(async (c) => {
      const { rows } = await c.query(`SELECT * FROM est_variance_flag WHERE id = $1 FOR UPDATE`, [idOf(flagId)])
      const f = rows[0]
      if (!f) throw new EstError('없는 후보임')
      if (f.status !== 'new') throw new EstError('이미 처리한 후보임')
      if (decision === 'apply') {
        await c.query(`INSERT INTO est_item_price (item_code, price, effective_from, note, source, created_by) VALUES ($1,$2,$3,$4,'variance',$5)`, [
          f.item_code, price !== undefined && int(price) > 0 ? int(price) : n(f.actual_price), kstToday(), `정산 실단가 반영(차이 ${f.variance_pct}%)`, s.userId,
        ])
      }
      await c.query(`UPDATE est_variance_flag SET status = $2, decided_by = $3, decided_at = now() WHERE id = $1`, [flagId, decision === 'apply' ? 'applied' : 'ignored', s.userId])
    })
    refresh()
  })
}
