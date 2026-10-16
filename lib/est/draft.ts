/**
 * 판 만들기: 자동 초안(템플릿 + 규칙 + 현장 답 → 줄), 복제, 합계 다시 계산, 자동 검사 입력 모으기.
 * 계산은 lib/est/compute.ts·calc.ts·rules.ts·checks.ts (순수 함수), 여기는 DB 읽기·쓰기만.
 */
import type { PoolClient } from 'pg'
import { pool } from '@/lib/db'
import { actualStats, lineAmount } from './calc'
import { runChecks, type CheckResult } from './checks'
import { autoExpenseAction, computeEstimate, settingsSnapshot, type RateSnap, type SettingsSnap } from './compute'
import {
  answerMap,
  getEstimateDetail,
  getProject,
  listAnswers,
  listItems,
  listRateSets,
  listRules,
  listTemplateItems,
  listTemplates,
  listClasses,
  rateSnapOf,
  type EstimateDetail,
  type ItemRow,
} from './data'
import { autoExpenseDraftLine, buildDraft, type Condition, type DraftLine, type ItemMaster, type RuleDef } from './rules'
import { getSettings } from './settings'
import { sNum, sStr, type Settings } from './settings-defaults'
import { SAMPLE_DRAFT_KEY, SAMPLE_DRAFT_PROJECT } from './seed'
import { EstError, LOCKED_MESSAGE, LOCKED_STATUSES, n } from './table'

export async function tx<T>(run: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect()
  try {
    await c.query('BEGIN')
    const out = await run(c)
    await c.query('COMMIT')
    return out
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    c.release()
  }
}

/** 품목 실단가 범위(설정 actual.window_count·typ_method). 관측이 없는 노무는 노무 실단가(분류 기본) */
export async function actualRanges(codes: string[], items: ItemRow[], settings: Settings) {
  const out: Record<string, { min: number; typ: number; max: number; source: string; n: number }> = {}
  if (!codes.length) return out
  const { rows } = await pool.query(`SELECT id, item_code, unit_price, observed_on::text AS on FROM est_actual_cost WHERE item_code = ANY($1)`, [codes])
  const win = sNum(settings, 'actual.window_count')
  const method = sStr(settings, 'actual.typ_method') === 'median' ? 'median' : 'last'
  const by = new Map<string, { unitPrice: number; observedOn: string; id: number }[]>()
  for (const r of rows) {
    const list = by.get(r.item_code) ?? []
    list.push({ unitPrice: n(r.unit_price), observedOn: r.on, id: n(r.id) })
    by.set(r.item_code, list)
  }
  const labor = await pool.query(
    `SELECT DISTINCT ON (labor_class, COALESCE(item_code, '')) labor_class, item_code, day_rate FROM est_labor_rate
     WHERE effective_from <= (now() AT TIME ZONE 'Asia/Seoul')::date ORDER BY labor_class, COALESCE(item_code, ''), effective_from DESC, id DESC`,
  )
  for (const code of codes) {
    const s = actualStats(by.get(code) ?? [], win, method)
    if (s) {
      out[code] = { ...s, source: `관측 ${s.n}건` }
      continue
    }
    const it = items.find((i) => i.code === code)
    if (it?.kind === '노무' && it.laborClass) {
      const r = labor.rows.find((x) => x.item_code === code && x.labor_class === it.laborClass) ?? labor.rows.find((x) => !x.item_code && x.labor_class === it.laborClass)
      if (r) out[code] = { min: n(r.day_rate), typ: n(r.day_rate), max: n(r.day_rate), source: '노무 실단가', n: 0 }
    }
  }
  return out
}

async function nextVersionNo(c: PoolClient, projectId: number): Promise<number> {
  const { rows } = await c.query(`SELECT COALESCE(max(version_no), 0) + 1 AS v FROM est_estimate WHERE project_id = $1`, [projectId])
  return Number(rows[0].v)
}

async function insertLines(c: PoolClient, estimateId: number, sectionId: number, lines: DraftLine[], startSort = 0) {
  let sort = startSort
  for (const l of lines) {
    sort += 10
    await c.query(
      `INSERT INTO est_line (estimate_id, section_id, item_code, kind, name, spec, unit, qty, unit_price, amount, grade, origin, qty_rule_snapshot,
         basis_text, internal_memo, confirm_needed, removed, removed_reason, removed_note, actual_min, actual_typ, actual_max, actual_source, crew_days, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
      [
        estimateId,
        sectionId,
        l.itemCode,
        l.kind,
        l.name,
        l.spec,
        l.unit,
        l.qty,
        l.unitPrice,
        lineAmount({ qty: l.qty, unitPrice: l.unitPrice, removed: false }),
        l.grade,
        l.origin,
        l.qtyRuleSnapshot ? JSON.stringify(l.qtyRuleSnapshot) : null,
        l.basisText,
        l.internalMemo,
        l.confirmNeeded,
        l.removed,
        l.removedReason,
        l.removedNote,
        l.actual?.min ?? null,
        l.actual?.typ ?? null,
        l.actual?.max ?? null,
        l.actualSource,
        l.crewDays,
        sort,
      ],
    )
  }
}

/** 새 판을 만들면 승인됐지만 제출 안 된 옛 판은 superseded(제출된 판은 그대로) */
async function supersedeOld(c: PoolClient, projectId: number, keepId: number) {
  await c.query(`UPDATE est_estimate SET status = 'superseded', updated_at = now() WHERE project_id = $1 AND id <> $2 AND status = 'approved'`, [projectId, keepId])
}

export type DraftOptions = { projectId: number; templateId: number | null; rateSetId: number | null; managerVisits: number; label: string; userId: string }

/** 자동 초안(S5): 템플릿 전체 → 규칙 → 수량 → 실단가 스냅샷 → 담당자 줄 → 경비 자동 줄 */
export async function createDraft(o: DraftOptions): Promise<number> {
  const project = await getProject(o.projectId)
  if (!project) throw new EstError('없는 프로젝트임')
  const [settings, items, rateSets, templates, classes, answers] = await Promise.all([
    getSettings(),
    listItems(),
    listRateSets(),
    listTemplates(),
    listClasses(),
    listAnswers(o.projectId),
  ])
  const template = o.templateId ? templates.find((t) => t.id === o.templateId) ?? null : null
  // 요율: 고른 것 → 템플릿 → 대분류 meta.rate_set → 설정 rates.default
  const class1 = classes.find((c) => c.id === project.class1Id)
  const rateSet =
    rateSets.find((r) => r.id === o.rateSetId) ??
    rateSets.find((r) => r.id === template?.rateSetId) ??
    rateSets.find((r) => r.code === (class1?.meta?.rate_set as string)) ??
    rateSets.find((r) => r.code === sStr(settings, 'rates.default')) ??
    rateSets[0]
  if (!rateSet) throw new EstError('요율 세트가 없음. 마스터에서 요율 세트를 먼저 만들어야 함')
  const rateSnap = rateSnapOf(rateSet)
  const sSnap = settingsSnapshot(settings)
  const tItems = template ? await listTemplateItems(template.id) : []
  const rules = await listRules(project.class1Id, true)
  const codes = [...new Set([...tItems.map((t) => t.itemCode), ...rules.map((r) => r.action.add_item as string).filter(Boolean)])]
  const actual = await actualRanges(codes, items, settings)
  const masters: Record<string, ItemMaster> = {}
  for (const it of items) {
    masters[it.code] = { ...it, actual: actual[it.code] ? { min: actual[it.code].min, typ: actual[it.code].typ, max: actual[it.code].max } : null, actualSource: actual[it.code]?.source ?? null }
  }
  const { values, unconfirmed } = answerMap(answers)
  const classMap: Record<number, { code: string; name: string; sort: number }> = {}
  for (const c of classes) if (c.level === 3) classMap[c.id] = { code: c.code, name: c.name, sort: c.sortOrder }

  const draft = buildDraft({
    templateItems: tItems.map((t) => ({
      itemCode: t.itemCode,
      grade: t.grade,
      condition: (t.condition as Condition) ?? null,
      removeIf: (t.removeIf as never) ?? null,
      qtyRuleType: t.qtyRuleType,
      qtyRule: t.qtyRule,
      class3Id: t.class3Id,
      sortOrder: t.sortOrder,
    })),
    items: masters,
    rules: rules.map(toRuleDef),
    answers: values,
    confirmNeeded: unconfirmed,
    classes: classMap,
    manager: { itemCode: sSnap.manager.itemCode, visits: o.managerVisits, dayRateCustomer: sSnap.manager.dayRateCustomer, kind: sSnap.manager.kind, lineName: sSnap.manager.lineName },
    rateSet: { mode: rateSnap.mode, rates: rateSnap.rates as never, truncateUnit: rateSnap.truncateUnit, expensePerCrewDay: rateSnap.expensePerCrewDay },
    confirmText: sStr(settings, 'doc.confirm_needed_text'),
  })

  const id = await tx(async (c) => {
    const version = await nextVersionNo(c, o.projectId)
    const label = o.label.trim() || `${String.fromCharCode(64 + Math.min(version, 26))}안`
    const { rows } = await c.query(
      `INSERT INTO est_estimate (project_id, version_no, label, status, template_id, rate_set_id, rates_snapshot, settings_snapshot, manager_visits, notes_customer, created_by)
       VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [o.projectId, version, label, template?.id ?? null, rateSet.id, JSON.stringify(rateSnap), JSON.stringify(sSnap), o.managerVisits, defaultNotes(), o.userId],
    )
    const estimateId = n(rows[0].id)
    let sort = 0
    for (const s of draft.sections) {
      sort += 10
      const sec = await c.query(
        `INSERT INTO est_section (estimate_id, class3_id, name, calc_mode, sort_order) VALUES ($1, $2, $3, 'full', $4) RETURNING id`,
        [estimateId, s.class3Id, s.name, sort],
      )
      await insertLines(c, estimateId, n(sec.rows[0].id), s.lines)
    }
    await c.query(
      `UPDATE est_project SET current_estimate_id = $2, manager_visits_planned = $3, stage = CASE WHEN stage IN ('P1','P2') THEN 'P3' ELSE stage END, updated_at = now() WHERE id = $1`,
      [o.projectId, estimateId, o.managerVisits],
    )
    await supersedeOld(c, o.projectId, estimateId)
    return estimateId
  })
  await recomputeEstimate(id)
  return id
}

function defaultNotes() {
  return ['공사 기간: 협의', '결제 조건: 협의', '부가가치세 별도 금액은 견적서 합계를 따름'].join('\n')
}

export function toRuleDef(r: { code: string; name: string; condition: unknown; action: Record<string, unknown>; message: string | null; severity: 'error' | 'warn' }): RuleDef {
  return { code: r.code, name: r.name, condition: r.condition as Condition, action: r.action as RuleDef['action'], message: r.message, severity: r.severity }
}

/** 판 복제(새 판). 옛 판은 그대로(승인 판은 superseded). 줄·공정을 복사하고 상태는 draft */
export async function cloneEstimate(sourceId: number, label: string, userId: string): Promise<number> {
  const src = await getEstimateDetail(sourceId)
  if (!src) throw new EstError('없는 판임')
  const e = src.estimate
  const id = await tx(async (c) => {
    const version = await nextVersionNo(c, e.projectId)
    const { rows } = await c.query(
      `INSERT INTO est_estimate (project_id, version_no, label, parent_id, status, template_id, rate_set_id, rates_snapshot, settings_snapshot, manager_visits, notes_customer, created_by)
       VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [e.projectId, version, label.trim() || `${String.fromCharCode(64 + Math.min(version, 26))}안`, e.id, e.templateId, e.rateSetId, JSON.stringify(e.rateSnap), JSON.stringify(e.settingsSnap), e.managerVisits, e.notesCustomer, userId],
    )
    const newId = n(rows[0].id)
    for (const s of src.sections) {
      const sec = await c.query(
        `INSERT INTO est_section (estimate_id, class3_id, name, description, calc_mode, is_option, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [newId, s.class3Id, s.name, s.description, s.calcMode, s.isOption, s.sortOrder],
      )
      const secId = n(sec.rows[0].id)
      for (const l of s.lines) {
        await c.query(
          `INSERT INTO est_line (estimate_id, section_id, item_code, kind, name, spec, unit, qty, unit_price, amount, grade, origin, qty_rule_snapshot, qty_overridden,
             basis_text, internal_memo, confirm_needed, removed, removed_reason, removed_note, actual_min, actual_typ, actual_max, actual_source, crew_days, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)`,
          [
            newId, secId, l.itemCode, l.kind, l.name, l.spec, l.unit, l.qty, l.unitPrice, l.amount, l.grade, l.origin,
            l.qtyRuleSnapshot ? JSON.stringify(l.qtyRuleSnapshot) : null, l.qtyOverridden, l.basisText, l.internalMemo, l.confirmNeeded,
            l.removed, l.removedReason, l.removedNote, l.actual?.min ?? null, l.actual?.typ ?? null, l.actual?.max ?? null, l.actualSource, l.crewDays, l.sortOrder,
          ],
        )
      }
    }
    await c.query(`UPDATE est_project SET current_estimate_id = $2, updated_at = now() WHERE id = $1`, [e.projectId, newId])
    await supersedeOld(c, e.projectId, newId)
    return newId
  })
  await recomputeEstimate(id)
  return id
}

/** 판이 잠겼으면(승인·제출·결재 중) 거절 */
export async function assertEditable(estimateId: number): Promise<{ projectId: number; status: string }> {
  const { rows } = await pool.query(`SELECT project_id, status FROM est_estimate WHERE id = $1`, [estimateId])
  if (!rows[0]) throw new EstError('없는 판임')
  if (LOCKED_STATUSES.includes(rows[0].status)) throw new EstError(LOCKED_MESSAGE)
  return { projectId: n(rows[0].project_id), status: rows[0].status }
}

/**
 * 판 합계 다시 계산해 저장(목록용 칸). 경비 자동 줄을 맞추고, 줄 금액·노무 인·일도 다시 씀.
 * 고친 뒤 검사를 통과했던 판(checking)은 작성 중(draft)으로 돌림.
 */
export async function recomputeEstimate(estimateId: number, opts: { keepStatus?: boolean } = {}) {
  let d = await getEstimateDetail(estimateId)
  if (!d) return
  const act = autoExpenseAction(d.sections, d.estimate.rateSnap)
  if (act.kind !== 'none' && !LOCKED_STATUSES.includes(d.estimate.status)) {
    if (act.kind === 'remove') await pool.query(`DELETE FROM est_line WHERE id = $1`, [act.lineId])
    if (act.kind === 'update') await pool.query(`UPDATE est_line SET qty = $2, unit_price = $3 WHERE id = $1`, [act.lineId, act.qty, act.unitPrice])
    if (act.kind === 'insert') {
      const c = await pool.connect()
      try {
        await insertLines(c, estimateId, Number(act.sectionId), [autoExpenseDraftLine(act.qty, act.unitPrice)], 100000)
      } finally {
        c.release()
      }
    }
    d = (await getEstimateDetail(estimateId))!
  }
  const r = computeEstimate({ rateSnap: d.estimate.rateSnap, settingsSnap: d.estimate.settingsSnap, managerVisits: d.estimate.managerVisits, sections: d.sections })
  await pool.query(
    `UPDATE est_line SET amount = CASE WHEN removed THEN 0 ELSE round(qty * unit_price)::bigint END,
       crew_days = CASE WHEN kind = '노무' THEN qty ELSE crew_days END
     WHERE estimate_id = $1`,
    [estimateId],
  )
  await pool.query(
    `UPDATE est_estimate SET supply = $2, vat = $3, total = $4, cost_min = $5, cost_typ = $6, cost_max = $7, expected_profit = $8, margin_pct = $9,
       incentive_expected = $10, updated_at = now(),
       status = CASE WHEN $11 OR status <> 'checking' THEN status ELSE 'draft' END,
       check_passed = CASE WHEN $11 THEN check_passed ELSE NULL END
     WHERE id = $1`,
    [estimateId, r.calc.supply, r.calc.vat, r.calc.total, r.cost.min, r.cost.typ, r.cost.max, r.profit.typ, r.profit.marginPct, r.cost.incentive, Boolean(opts.keepStatus)],
  )
}

/** 자동 검사 입력을 모아 검사 (S6 패널·검사 실행·결재 올리기 공용) */
export async function checkEstimate(d: EstimateDetail, settings?: Settings): Promise<{ results: CheckResult[]; marginPct: number }> {
  const s = settings ?? (await getSettings())
  const e = d.estimate
  const project = await getProject(e.projectId)
  if (!project) throw new EstError('없는 프로젝트임')
  const [answers, rules, items, tItems] = await Promise.all([
    listAnswers(project.id),
    listRules(project.class1Id, true),
    listItems(),
    e.templateId ? listTemplateItems(e.templateId) : Promise.resolve([]),
  ])
  const lines = d.sections.filter((x) => !x.isOption).flatMap((x) => x.lines)
  const codes = [...new Set(lines.map((l) => l.itemCode).filter(Boolean) as string[])]
  const counts: Record<string, number> = {}
  if (codes.length) {
    const { rows } = await pool.query(`SELECT item_code, count(*)::int AS c FROM est_actual_cost WHERE item_code = ANY($1) GROUP BY item_code`, [codes])
    for (const r of rows) counts[r.item_code] = r.c
  }
  const { profit } = computeEstimate({ rateSnap: e.rateSnap, settingsSnap: e.settingsSnap, managerVisits: e.managerVisits, sections: d.sections })
  const { values } = answerMap(answers)
  const itemName = new Map(items.map((i) => [i.code, i.name]))
  const results = runChecks({
    managerCount: project.members.filter((m) => m.role === 'manager').length,
    managerVisits: e.managerVisits,
    lines: lines.map((l) => ({
      id: String(l.id),
      itemCode: l.itemCode,
      kind: l.kind,
      name: l.name,
      spec: l.spec,
      basisText: l.basisText,
      qty: l.qty,
      unitPrice: l.unitPrice,
      grade: l.grade,
      removed: l.removed,
      confirmNeeded: l.confirmNeeded,
      actual: l.actual,
      isManager: l.grade === 'manager',
      isAutoExpense: (l.qtyRuleSnapshot as { type?: string } | null)?.type === 'auto_expense',
    })),
    notesCustomer: e.notesCustomer,
    answers: values,
    rules: rules.map(toRuleDef),
    conditionalItems: tItems.filter((t) => t.grade === 'conditional').map((t) => ({ itemCode: t.itemCode, name: itemName.get(t.itemCode) ?? t.itemCode, condition: (t.condition as Condition) ?? null })),
    itemPrices: Object.fromEntries(items.map((i) => [i.code, i.price])),
    actualCounts: counts,
    marginPct: profit.marginPct,
    settings: s,
  })
  return { results, marginPct: profit.marginPct }
}

/** S01 샘플 A안 초안을 한 번 만듦(est_seed). 템플릿은 그 소분류 최신판 */
export async function ensureSampleDraft() {
  const { rowCount } = await pool.query(`INSERT INTO est_seed (key) VALUES ($1) ON CONFLICT DO NOTHING`, [SAMPLE_DRAFT_KEY])
  if (!rowCount) return
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.class2_id, p.manager_visits_planned, (SELECT count(*) FROM est_estimate e WHERE e.project_id = p.id) AS cnt FROM est_project p WHERE p.number = $1`,
      [SAMPLE_DRAFT_PROJECT],
    )
    const p = rows[0]
    if (!p || n(p.cnt) > 0) return
    const t = await pool.query(`SELECT id FROM est_template WHERE class2_id = $1 AND is_active ORDER BY version DESC LIMIT 1`, [p.class2_id])
    await createDraft({ projectId: n(p.id), templateId: t.rows[0] ? n(t.rows[0].id) : null, rateSetId: null, managerVisits: Number(p.manager_visits_planned) || 1, label: 'A안', userId: 'system' })
  } catch (e) {
    await pool.query(`DELETE FROM est_seed WHERE key = $1`, [SAMPLE_DRAFT_KEY]).catch(() => {})
    throw e
  }
}

export type { RateSnap, SettingsSnap }
export { settingsSnapshot }
