'use server'

import { revalidatePath } from 'next/cache'
import { pool } from '@/lib/db'
import { requireEst, type AppSession } from '@/lib/session'
import { act, idOf, int, num, str } from '@/lib/est/act'
import { atLeast, type EstRole } from '@/lib/est/perm'
import { ensureEst, EstError, LOCKED_STATUSES, n } from '@/lib/est/table'
import { getSettings } from '@/lib/est/settings'
import { sArr, sBool, sNum, sStr } from '@/lib/est/settings-defaults'
import { checkPassed, withConfirmText } from '@/lib/est/checks'
import { assertEditable, checkEstimate, cloneEstimate, createDraft, recomputeEstimate, tx } from '@/lib/est/draft'
import { getEstimateDetail, getProject, kstToday, listItems, listQuestions, STAGES, type Stage } from '@/lib/est/data'
import { lineAmount } from '@/lib/est/calc'
import { isAnswered } from '@/lib/est/rules'

type Session = AppSession & { estRole: EstRole }

const refresh = () => revalidatePath('/admin/est', 'layout')

// ---------- 권한 ----------

/** 작성자(writer)는 자기 프로젝트(만든 사람·구성원)만 고침. reviewer 이상은 전부(§8) */
async function assertProjectAccess(s: Session, projectId: number) {
  if (atLeast(s.estRole, 'reviewer')) return
  const { rows } = await pool.query(
    `SELECT 1 FROM est_project p WHERE p.id = $1 AND (p.created_by = $2 OR EXISTS (SELECT 1 FROM est_project_member m WHERE m.project_id = p.id AND m.user_id = $2))`,
    [projectId, s.userId],
  )
  if (!rows[0]) throw new EstError('담당·작성한 견적 건만 고칠 수 있음')
}

async function projectOfEstimate(estimateId: number): Promise<number> {
  const { rows } = await pool.query(`SELECT project_id FROM est_estimate WHERE id = $1`, [estimateId])
  if (!rows[0]) throw new EstError('없는 판임')
  return n(rows[0].project_id)
}

async function lineInfo(lineId: number) {
  const { rows } = await pool.query(
    `SELECT l.*, e.project_id, e.status AS e_status FROM est_line l JOIN est_estimate e ON e.id = l.estimate_id WHERE l.id = $1`,
    [lineId],
  )
  if (!rows[0]) throw new EstError('없는 줄임')
  if (LOCKED_STATUSES.includes(rows[0].e_status)) throw new EstError('승인·제출된(또는 결재 중인) 판이라 고칠 수 없음. 고치려면 새 판으로 복제해야 함')
  return rows[0]
}

// ---------- 접수(S2)·개요 ----------

export type ProjectInput = {
  title: string
  clientId?: number | null
  newClientName?: string
  clientType: string
  siteAddress: string
  inquiryText: string
  quoteRequestId?: number | null
  class1Id?: number | null
  class2Id?: number | null
  managerIds: string[]
  writerId?: string
}

/** 번호 접두(설정)는 트랜잭션 밖에서 읽어 넘김(트랜잭션 안에서 다른 연결을 잡지 않게) */
async function nextNumber(c: import('pg').PoolClient, prefix: string): Promise<string> {
  const yymm = kstToday().slice(2, 7).replace('-', '')
  const { rows } = await c.query(
    `INSERT INTO est_project_seq (yymm, last) VALUES ($1, 1) ON CONFLICT (yymm) DO UPDATE SET last = est_project_seq.last + 1 RETURNING last`,
    [yymm],
  )
  return `${prefix}-${yymm}-${String(rows[0].last).padStart(3, '0')}`
}

async function setMembers(c: import('pg').PoolClient, projectId: number, managerIds: string[], writerId: string | null) {
  await c.query(`DELETE FROM est_project_member WHERE project_id = $1 AND role IN ('manager','writer')`, [projectId])
  const ids = [...new Set(managerIds.map((x) => str(x, 100)).filter(Boolean))]
  for (const [i, uid] of ids.entries()) {
    await c.query(`INSERT INTO est_project_member (project_id, user_id, role, is_primary) VALUES ($1, $2, 'manager', $3) ON CONFLICT DO NOTHING`, [projectId, uid, i === 0])
  }
  if (writerId) await c.query(`INSERT INTO est_project_member (project_id, user_id, role, is_primary) VALUES ($1, $2, 'writer', true) ON CONFLICT DO NOTHING`, [projectId, writerId])
}

function cleanProject(input: ProjectInput) {
  const title = str(input.title, 200)
  if (!title) throw new EstError('제목을 입력해야 함')
  const clientType = ['company', 'public', 'insurer', 'individual', 'gc', 'other'].includes(input.clientType) ? input.clientType : 'company'
  return {
    title,
    clientType,
    siteAddress: str(input.siteAddress),
    inquiryText: str(input.inquiryText, 5000),
    class1Id: input.class1Id ? idOf(input.class1Id) : null,
    class2Id: input.class2Id ? idOf(input.class2Id) : null,
  }
}

async function resolveClient(c: import('pg').PoolClient, input: ProjectInput, siteAddress: string): Promise<number | null> {
  if (input.clientId) return idOf(input.clientId)
  const name = str(input.newClientName, 200)
  if (!name) return null
  const { rows } = await c.query(`INSERT INTO clients (name, site_address, memo) VALUES ($1, $2, '견적 접수에서 등록') RETURNING id`, [name, siteAddress])
  return n(rows[0].id)
}

export async function createProject(input: ProjectInput) {
  return act(async () => {
    const s = await requireEst('writer')
    await ensureEst()
    const p = cleanProject(input)
    const managers = (input.managerIds ?? []).filter(Boolean)
    if (!managers.length) throw new EstError('담당자를 1명 이상 골라야 함')
    const prefix = sStr(await getSettings(), 'doc.number_prefix') || 'NM'
    const id = await tx(async (c) => {
      const number = await nextNumber(c, prefix)
      const clientId = await resolveClient(c, input, p.siteAddress)
      const { rows } = await c.query(
        `INSERT INTO est_project (number, title, client_id, client_type, site_address, inquiry_text, quote_request_id, class1_id, class2_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [number, p.title, clientId, p.clientType, p.siteAddress, p.inquiryText, input.quoteRequestId ? idOf(input.quoteRequestId) : null, p.class1Id, p.class2Id, s.userId],
      )
      const pid = n(rows[0].id)
      await setMembers(c, pid, managers, input.writerId ? str(input.writerId, 100) : s.userId)
      return pid
    })
    refresh()
    return { id }
  })
}

export async function updateProject(projectId: number, input: ProjectInput & { siteSummary?: string; managerVisitsPlanned?: number }) {
  return act(async () => {
    const s = await requireEst('writer')
    await assertProjectAccess(s, projectId)
    const p = cleanProject(input)
    const managers = (input.managerIds ?? []).filter(Boolean)
    if (!managers.length) throw new EstError('담당자를 1명 이상 골라야 함')
    await tx(async (c) => {
      const clientId = await resolveClient(c, input, p.siteAddress)
      await c.query(
        `UPDATE est_project SET title=$2, client_id=$3, client_type=$4, site_address=$5, inquiry_text=$6, class1_id=$7, class2_id=$8,
           site_summary=$9, manager_visits_planned=$10, updated_at=now() WHERE id=$1`,
        [projectId, p.title, clientId, p.clientType, p.siteAddress, p.inquiryText, p.class1Id, p.class2Id, str(input.siteSummary, 5000), Math.max(0, int(input.managerVisitsPlanned))],
      )
      await setMembers(c, projectId, managers, input.writerId ? str(input.writerId, 100) : null)
    })
    refresh()
  })
}

// ---------- 단계(§7.1) ----------

const ORDER: Stage[] = ['P1', 'P2', 'P3', 'P5', 'P6', 'WON', 'EXEC', 'SETTLE', 'CLOSED']

/** 다음 단계로(가드 확인). 경고는 warnings 로 돌려줌 */
export async function moveStage(projectId: number, to: Stage) {
  return act<{ warnings: string[] }>(async () => {
    const s = await requireEst('writer')
    await assertProjectAccess(s, projectId)
    if (!STAGES.includes(to) || to === 'LOST' || to === 'HOLD' || to === 'WON' || to === 'CLOSED') throw new EstError('이 단계는 결과 입력·정산 마감으로 바꿔야 함')
    const p = await getProject(projectId)
    if (!p) throw new EstError('없는 견적 건임')
    const settings = await getSettings()
    const warnings: string[] = []
    const from = p.stage as Stage
    if (from === 'HOLD') {
      // 보류에서 복귀: 결과를 지우고 고른 단계로
    } else if (ORDER.indexOf(to) !== ORDER.indexOf(from) + 1) {
      throw new EstError('바로 다음 단계로만 넘길 수 있음')
    }
    if (to === 'P2' && !p.members.some((m) => m.role === 'manager')) throw new EstError('담당자가 1명 이상 있어야 함')
    if (to === 'P3') {
      const qs = await listQuestions(p.class2Id)
      const { rows } = await pool.query(`SELECT question_id, value, confirm_needed FROM est_check_answer WHERE project_id = $1`, [projectId])
      const done = new Set(rows.filter((r) => isAnswered(r.value) || r.confirm_needed).map((r) => n(r.question_id)))
      const missing = qs.filter((q) => q.required && q.answerType !== 'photo' && !done.has(q.id))
      if (missing.length) throw new EstError(`필수 질문에 답해야 함: ${missing.map((q) => q.label).join(', ')}`)
      const photos = n((await pool.query(`SELECT count(*) AS c FROM est_photo WHERE project_id = $1`, [projectId])).rows[0].c)
      const need = sNum(settings, 'check.required_photos')
      if (photos < need) {
        if (sBool(settings, 'check.block_without_photos')) throw new EstError(`사진이 ${need}장 이상 있어야 함(지금 ${photos}장)`)
        warnings.push(`사진이 ${need}장보다 적음(지금 ${photos}장)`)
      }
    }
    if (to === 'P5') {
      const { rows } = await pool.query(`SELECT 1 FROM est_estimate WHERE project_id = $1 AND check_passed AND status NOT IN ('void','superseded')`, [projectId])
      if (!rows[0]) throw new EstError('자동 검사를 통과한 판이 1개 이상 있어야 함')
    }
    if (to === 'P6') {
      const { rows } = await pool.query(`SELECT 1 FROM est_estimate WHERE project_id = $1 AND status IN ('approved','submitted')`, [projectId])
      if (!rows[0]) throw new EstError('승인된 판이 있어야 함')
    }
    if (to === 'SETTLE') {
      const { rows } = await pool.query(`SELECT count(*) AS c FROM est_order WHERE project_id = $1 AND status NOT IN ('done','canceled')`, [projectId])
      if (n(rows[0].c) > 0) throw new EstError('발주가 모두 완료 또는 취소여야 함')
    }
    await pool.query(
      `UPDATE est_project SET stage = $2, result = CASE WHEN stage = 'HOLD' THEN NULL ELSE result END,
         result_reason = CASE WHEN stage = 'HOLD' THEN NULL ELSE result_reason END, updated_at = now() WHERE id = $1`,
      [projectId, to],
    )
    refresh()
    return { warnings }
  })
}

/** 결과 입력: 수주(제출 판이 있어야)·실패·보류(이유 필수) */
export async function setResult(projectId: number, result: 'won' | 'lost' | 'hold', reason: string) {
  return act(async () => {
    const s = await requireEst('writer')
    await assertProjectAccess(s, projectId)
    const why = str(reason, 2000)
    if (result !== 'won' && !why) throw new EstError('이유를 입력해야 함')
    if (result === 'won') {
      const { rows } = await pool.query(`SELECT 1 FROM est_estimate WHERE project_id = $1 AND status = 'submitted'`, [projectId])
      if (!rows[0]) throw new EstError('제출한 판이 있어야 수주로 바꿀 수 있음')
    }
    const stage = result === 'won' ? 'WON' : result === 'lost' ? 'LOST' : 'HOLD'
    await pool.query(`UPDATE est_project SET result = $2, result_reason = $3, result_at = now(), stage = $4, updated_at = now() WHERE id = $1`, [projectId, result, why || null, stage])
    refresh()
  })
}

// ---------- 현장 확인(S4) ----------

export async function saveAnswer(projectId: number, questionId: number, value: unknown, confirmNeeded: boolean, note?: string) {
  return act(async () => {
    const s = await requireEst('writer')
    await assertProjectAccess(s, projectId)
    const v = value === '' || value === undefined ? null : value
    await pool.query(
      `INSERT INTO est_check_answer (project_id, question_id, value, note, confirm_needed, answered_by, answered_at)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, now())
       ON CONFLICT (project_id, question_id) DO UPDATE SET value = EXCLUDED.value, note = EXCLUDED.note, confirm_needed = EXCLUDED.confirm_needed,
         answered_by = EXCLUDED.answered_by, answered_at = now()`,
      [projectId, idOf(questionId), v === null ? null : JSON.stringify(v), str(note, 1000) || null, Boolean(confirmNeeded), s.userId],
    )
    await pool.query(`UPDATE est_project SET stage = CASE WHEN stage = 'P1' THEN 'P2' ELSE stage END, updated_at = now() WHERE id = $1 AND EXISTS (SELECT 1 FROM est_project_member WHERE project_id = $1 AND role = 'manager')`, [projectId])
    refresh()
  })
}

export async function addVisit(projectId: number, input: { visitedOn: string; purpose: string; hours: number | null; note: string; userId?: string; countsAsManagerDay?: boolean }) {
  return act(async () => {
    const s = await requireEst('writer')
    await assertProjectAccess(s, projectId)
    const purpose = ['survey', 'meeting', 'supervise', 'handover', 'other'].includes(input.purpose) ? input.purpose : 'survey'
    const on = /^\d{4}-\d{2}-\d{2}$/.test(input.visitedOn) ? input.visitedOn : kstToday()
    await pool.query(
      `INSERT INTO est_visit (project_id, user_id, visited_on, purpose, hours, note, counts_as_manager_day) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [projectId, str(input.userId, 100) || s.userId, on, purpose, input.hours ? num(input.hours) : null, str(input.note, 1000) || null, input.countsAsManagerDay !== false],
    )
    refresh()
  })
}

export async function deleteVisit(visitId: number) {
  return act(async () => {
    const s = await requireEst('writer')
    const { rows } = await pool.query(`SELECT project_id FROM est_visit WHERE id = $1`, [idOf(visitId)])
    if (!rows[0]) throw new EstError('없는 방문 기록임')
    await assertProjectAccess(s, n(rows[0].project_id))
    await pool.query(`DELETE FROM est_visit WHERE id = $1`, [visitId])
    refresh()
  })
}

const PHOTO_MAX = 4 * 1024 * 1024

/** 현장 사진 올리기(FormData: projectId, questionId?, caption?, file). DB(bytea)에 둠 */
export async function uploadPhoto(form: FormData) {
  return act<{ id: number }>(async () => {
    const s = await requireEst('writer')
    const projectId = idOf(form.get('projectId'))
    await assertProjectAccess(s, projectId)
    const file = form.get('file')
    if (!(file instanceof File) || !file.size) throw new EstError('사진 파일이 없음')
    if (!/^image\/(jpeg|png|webp|heic|heif|gif)$/.test(file.type)) throw new EstError('사진(jpg·png·webp·heic)만 올릴 수 있음')
    if (file.size > PHOTO_MAX) throw new EstError('사진은 4MB 이하만 올릴 수 있음')
    const q = form.get('questionId')
    const buf = Buffer.from(await file.arrayBuffer())
    const { rows } = await pool.query(
      `INSERT INTO est_photo (project_id, question_id, path, caption, mime, data, taken_at, created_by) VALUES ($1, $2, 'db', $3, $4, $5, now(), $6) RETURNING id`,
      [projectId, q ? idOf(q) : null, str(form.get('caption'), 200), file.type, buf, s.userId],
    )
    refresh()
    return { id: n(rows[0].id) }
  })
}

export async function deletePhoto(photoId: number) {
  return act(async () => {
    const s = await requireEst('writer')
    const { rows } = await pool.query(`SELECT project_id FROM est_photo WHERE id = $1`, [idOf(photoId)])
    if (!rows[0]) throw new EstError('없는 사진임')
    await assertProjectAccess(s, n(rows[0].project_id))
    await pool.query(`DELETE FROM est_photo WHERE id = $1`, [photoId])
    refresh()
  })
}

export async function addEvent(projectId: number, input: { kind: string; title: string; body: string; costImpact: number; occurredOn: string }) {
  return act(async () => {
    const s = await requireEst('writer')
    await assertProjectAccess(s, projectId)
    const title = str(input.title, 200)
    if (!title) throw new EstError('제목을 입력해야 함')
    const kind = ['site', 'client', 'weather', 'safety', 'design', 'other'].includes(input.kind) ? input.kind : 'other'
    const on = /^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn) ? input.occurredOn : kstToday()
    await pool.query(`INSERT INTO est_event (project_id, kind, title, body, cost_impact, occurred_on, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
      projectId, kind, title, str(input.body, 5000), int(input.costImpact), on, s.userId,
    ])
    refresh()
  })
}

// ---------- 판(S5·S6) ----------

export async function createEstimate(input: { projectId: number; templateId: number | null; rateSetId: number | null; managerVisits: number; label: string }) {
  return act<{ id: number }>(async () => {
    const s = await requireEst('writer')
    await assertProjectAccess(s, input.projectId)
    const visits = Math.max(0, int(input.managerVisits))
    const id = await createDraft({ projectId: idOf(input.projectId), templateId: input.templateId || null, rateSetId: input.rateSetId || null, managerVisits: visits, label: str(input.label, 40), userId: s.userId })
    refresh()
    return { id }
  })
}

export async function duplicateEstimate(estimateId: number, label: string) {
  return act<{ id: number }>(async () => {
    const s = await requireEst('writer')
    await assertProjectAccess(s, await projectOfEstimate(estimateId))
    const id = await cloneEstimate(idOf(estimateId), str(label, 40), s.userId)
    refresh()
    return { id }
  })
}

export async function updateEstimateMeta(estimateId: number, input: { label?: string; managerVisits?: number; notesCustomer?: string }) {
  return act(async () => {
    const s = await requireEst('writer')
    const { projectId } = await assertEditable(idOf(estimateId))
    await assertProjectAccess(s, projectId)
    if (input.label !== undefined) await pool.query(`UPDATE est_estimate SET label = $2 WHERE id = $1`, [estimateId, str(input.label, 40)])
    if (input.notesCustomer !== undefined) await pool.query(`UPDATE est_estimate SET notes_customer = $2 WHERE id = $1`, [estimateId, str(input.notesCustomer, 5000)])
    if (input.managerVisits !== undefined) {
      const v = Math.max(0, int(input.managerVisits))
      await pool.query(`UPDATE est_estimate SET manager_visits = $2 WHERE id = $1`, [estimateId, v])
      // 담당자 줄 수량 = 방문 수
      await pool.query(`UPDATE est_line SET qty = $2 WHERE estimate_id = $1 AND grade = 'manager'`, [estimateId, v])
    }
    await recomputeEstimate(estimateId)
    refresh()
  })
}

export type LinePatch = {
  name?: string
  spec?: string
  unit?: string
  qty?: number
  unitPrice?: number
  basisText?: string
  internalMemo?: string
  confirmNeeded?: boolean
  overrideReason?: string
}

export async function updateLine(lineId: number, patch: LinePatch) {
  return act(async () => {
    const s = await requireEst('writer')
    const l = await lineInfo(idOf(lineId))
    await assertProjectAccess(s, n(l.project_id))
    const sets: string[] = []
    const args: unknown[] = [lineId]
    const set = (col: string, v: unknown) => {
      args.push(v)
      sets.push(`${col} = $${args.length}`)
    }
    if (patch.name !== undefined) {
      const name = str(patch.name, 200)
      if (!name) throw new EstError('품명을 비울 수 없음')
      set('name', name)
    }
    if (patch.spec !== undefined) set('spec', str(patch.spec, 200))
    if (patch.unit !== undefined) set('unit', str(patch.unit, 20) || '식')
    if (patch.unitPrice !== undefined) set('unit_price', Math.max(0, int(patch.unitPrice)))
    if (patch.basisText !== undefined) set('basis_text', str(patch.basisText, 2000))
    if (patch.internalMemo !== undefined) set('internal_memo', str(patch.internalMemo, 2000))
    if (patch.confirmNeeded !== undefined) set('confirm_needed', Boolean(patch.confirmNeeded))
    if (patch.qty !== undefined) {
      const qty = Math.max(0, num(patch.qty))
      if (l.grade === 'manager') throw new EstError('담당자 줄 수량은 방문 수로 바꿔야 함')
      set('qty', qty)
      // 규칙·템플릿 산식 수량을 바꾸면 "덧씌움" 표시 + 이유(내부 메모에 남김)
      if (l.qty_rule_snapshot && Number(l.qty) !== qty) {
        const why = str(patch.overrideReason, 300)
        if (!why) throw new EstError('산식 수량을 바꾸려면 이유를 입력해야 함')
        set('qty_overridden', true)
        set('internal_memo', [str(l.internal_memo, 2000), `수량 덧씌움(${l.qty}→${qty}): ${why}`].filter(Boolean).join('\n').slice(0, 2000))
      }
    }
    if (!sets.length) return
    await pool.query(`UPDATE est_line SET ${sets.join(', ')} WHERE id = $1`, args)
    await recomputeEstimate(n(l.estimate_id))
    refresh()
  })
}

export async function removeLine(lineId: number, reason: string, note: string) {
  return act(async () => {
    const s = await requireEst('writer')
    const l = await lineInfo(idOf(lineId))
    await assertProjectAccess(s, n(l.project_id))
    if (l.grade === 'required') throw new EstError('필수 항목은 삭제할 수 없음')
    if (l.grade === 'manager') throw new EstError('담당자 줄은 삭제할 수 없음(방문 수로 조정)')
    if (!['not_applicable', 'client_provides', 'separate_contract', 'other'].includes(reason)) throw new EstError('삭제 이유를 골라야 함')
    if (reason === 'other' && !str(note)) throw new EstError('기타 이유를 적어야 함')
    await pool.query(`UPDATE est_line SET removed = true, removed_reason = $2, removed_note = $3 WHERE id = $1`, [lineId, reason, str(note, 500) || null])
    await recomputeEstimate(n(l.estimate_id))
    refresh()
  })
}

export async function restoreLine(lineId: number) {
  return act(async () => {
    const s = await requireEst('writer')
    const l = await lineInfo(idOf(lineId))
    await assertProjectAccess(s, n(l.project_id))
    await pool.query(`UPDATE est_line SET removed = false, removed_reason = NULL, removed_note = NULL WHERE id = $1`, [lineId])
    await recomputeEstimate(n(l.estimate_id))
    refresh()
  })
}

/** 수기 줄은 아예 지울 수 있음(템플릿·규칙 줄은 삭제 표시만) */
export async function deleteManualLine(lineId: number) {
  return act(async () => {
    const s = await requireEst('writer')
    const l = await lineInfo(idOf(lineId))
    await assertProjectAccess(s, n(l.project_id))
    if (l.origin !== 'manual' || l.grade !== 'manual') throw new EstError('수기로 넣은 줄만 지울 수 있음. 나머지는 삭제 표시(이유)로')
    await pool.query(`DELETE FROM est_line WHERE id = $1`, [lineId])
    await recomputeEstimate(n(l.estimate_id))
    refresh()
  })
}

export async function addLine(estimateId: number, sectionId: number, input: { itemCode?: string; kind?: string; name?: string; spec?: string; unit?: string; qty?: number; unitPrice?: number }) {
  return act(async () => {
    const s = await requireEst('writer')
    const { projectId } = await assertEditable(idOf(estimateId))
    await assertProjectAccess(s, projectId)
    const sec = await pool.query(`SELECT 1 FROM est_section WHERE id = $1 AND estimate_id = $2`, [idOf(sectionId), estimateId])
    if (!sec.rows[0]) throw new EstError('없는 공정임')
    let line: { itemCode: string | null; kind: string; name: string; spec: string; unit: string; unitPrice: number; basisText: string; laborClass?: string | null }
    if (input.itemCode) {
      const it = (await listItems()).find((x) => x.code === input.itemCode)
      if (!it) throw new EstError('없는 품목임')
      line = { itemCode: it.code, kind: it.kind, name: it.name, spec: it.spec, unit: it.unit, unitPrice: it.price, basisText: it.basisText }
    } else {
      const name = str(input.name, 200)
      if (!name) throw new EstError('품명을 입력해야 함')
      const kind = ['자재', '용역', '장비', '노무', '경비'].includes(String(input.kind)) ? String(input.kind) : '자재'
      line = { itemCode: null, kind, name, spec: str(input.spec, 200), unit: str(input.unit, 20) || '식', unitPrice: Math.max(0, int(input.unitPrice)), basisText: '' }
    }
    const qty = Math.max(0, num(input.qty ?? 1))
    const sort = await pool.query(`SELECT COALESCE(max(sort_order), 0) + 10 AS s FROM est_line WHERE section_id = $1 AND (qty_rule_snapshot->>'type') IS DISTINCT FROM 'auto_expense'`, [sectionId])
    await pool.query(
      `INSERT INTO est_line (estimate_id, section_id, item_code, kind, name, spec, unit, qty, unit_price, amount, grade, origin, basis_text, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'manual','manual',$11,$12)`,
      [estimateId, sectionId, line.itemCode, line.kind, line.name, line.spec, line.unit, qty, line.unitPrice, lineAmount({ qty, unitPrice: line.unitPrice, removed: false }), line.basisText, n(sort.rows[0].s)],
    )
    await recomputeEstimate(estimateId)
    refresh()
  })
}

export async function addSection(estimateId: number, name: string, isOption: boolean) {
  return act(async () => {
    const s = await requireEst('writer')
    const { projectId } = await assertEditable(idOf(estimateId))
    await assertProjectAccess(s, projectId)
    const nm = str(name, 100)
    if (!nm) throw new EstError('공정 이름을 입력해야 함')
    await pool.query(
      `INSERT INTO est_section (estimate_id, name, is_option, sort_order) VALUES ($1, $2, $3, (SELECT COALESCE(max(sort_order), 0) + 10 FROM est_section WHERE estimate_id = $1))`,
      [estimateId, nm, Boolean(isOption)],
    )
    await recomputeEstimate(estimateId)
    refresh()
  })
}

export async function updateSection(sectionId: number, input: { name?: string; description?: string; isOption?: boolean; calcMode?: string }) {
  return act(async () => {
    const s = await requireEst('writer')
    const { rows } = await pool.query(`SELECT estimate_id FROM est_section WHERE id = $1`, [idOf(sectionId)])
    if (!rows[0]) throw new EstError('없는 공정임')
    const estimateId = n(rows[0].estimate_id)
    const { projectId } = await assertEditable(estimateId)
    await assertProjectAccess(s, projectId)
    const mode = ['full', 'margin', 'overhead', 'none'].includes(String(input.calcMode)) ? input.calcMode : undefined
    await pool.query(
      `UPDATE est_section SET name = COALESCE($2, name), description = COALESCE($3, description), is_option = COALESCE($4, is_option), calc_mode = COALESCE($5, calc_mode) WHERE id = $1`,
      [sectionId, input.name !== undefined ? str(input.name, 100) || null : null, input.description !== undefined ? str(input.description, 1000) : null, input.isOption ?? null, mode ?? null],
    )
    await recomputeEstimate(estimateId)
    refresh()
  })
}

/** CONFIRM_TEXT 자동 보정: 확인 필요 줄 근거문구 끝에 고객 표기 붙이기 */
export async function fixConfirmText(estimateId: number) {
  return act(async () => {
    const s = await requireEst('writer')
    const { projectId } = await assertEditable(idOf(estimateId))
    await assertProjectAccess(s, projectId)
    const text = sStr(await getSettings(), 'doc.confirm_needed_text')
    const { rows } = await pool.query(`SELECT id, basis_text FROM est_line WHERE estimate_id = $1 AND confirm_needed AND NOT removed`, [estimateId])
    for (const r of rows) {
      const next = withConfirmText(r.basis_text, text)
      if (next !== r.basis_text) await pool.query(`UPDATE est_line SET basis_text = $2 WHERE id = $1`, [r.id, next])
    }
    await recomputeEstimate(estimateId)
    refresh()
  })
}

// ---------- 자동 검사·결재(S8) ----------

async function saveCheck(estimateId: number, userId: string) {
  const d = await getEstimateDetail(estimateId)
  if (!d) throw new EstError('없는 판임')
  const { results } = await checkEstimate(d)
  const passed = checkPassed(results)
  await pool.query(`INSERT INTO est_check_run (estimate_id, results, passed, ran_by) VALUES ($1, $2, $3, $4)`, [estimateId, JSON.stringify(results), passed, userId])
  return { d, results, passed }
}

export async function runCheck(estimateId: number) {
  return act<{ passed: boolean; errors: number; warnings: number }>(async () => {
    const s = await requireEst('writer')
    const { projectId, status } = await assertEditable(idOf(estimateId))
    await assertProjectAccess(s, projectId)
    const { results, passed } = await saveCheck(estimateId, s.userId)
    const next = status === 'rejected' ? 'rejected' : passed ? 'checking' : 'draft'
    await pool.query(`UPDATE est_estimate SET check_passed = $2, status = $3, updated_at = now() WHERE id = $1`, [estimateId, passed, next])
    refresh()
    return { passed, errors: results.filter((r) => r.severity === 'error').length, warnings: results.filter((r) => r.severity === 'warn').length }
  })
}

/** 결재 올리기: 검사 다시 → error 0 이면 단계 만들기(§7.4) */
export async function submitForApproval(estimateId: number) {
  return act<{ approved: boolean }>(async () => {
    const s = await requireEst('writer')
    const { projectId, status } = await assertEditable(idOf(estimateId))
    await assertProjectAccess(s, projectId)
    if (status === 'rejected') throw new EstError('반려된 판은 "수정 시작" 뒤 다시 올려야 함')
    const { d, passed } = await saveCheck(estimateId, s.userId)
    if (!passed) {
      await pool.query(`UPDATE est_estimate SET check_passed = false, status = 'draft' WHERE id = $1`, [estimateId])
      refresh()
      throw new EstError('자동 검사 오류가 있어 올릴 수 없음. 검사 결과를 확인해야 함')
    }
    const settings = await getSettings()
    const steps = sArr(settings, 'approval.steps').filter((x) => x === 'writer' || x === 'reviewer' || x === 'ceo')
    const threshold = sNum(settings, 'approval.ceo_threshold_supply')
    const selfSkip = s.estRole === 'ceo' && sBool(settings, 'approval.ceo_self_skip_review')
    const validDays = sNum(settings, 'doc.valid_days')
    const approved = await tx(async (c) => {
      const r = await c.query(`SELECT COALESCE(max(round), 0) + 1 AS r FROM est_approval WHERE estimate_id = $1`, [estimateId])
      const round = Number(r.rows[0].r)
      type St = { role: string; status: string; decided: boolean; comment: string | null }
      const plan: St[] = steps.map((role) => {
        if (role === 'writer') return { role, status: 'approved', decided: true, comment: '올린 사람 확인' }
        if (role === 'ceo' && d.estimate.supply < threshold) return { role, status: 'skipped', decided: false, comment: '대표 결재 기준 공급가 미만' }
        if (role === 'reviewer' && selfSkip) return { role, status: 'skipped', decided: false, comment: '대표가 직접 올린 판' }
        if (role === 'ceo' && selfSkip) return { role, status: 'approved', decided: true, comment: '대표가 직접 올림' }
        return { role, status: 'waiting', decided: false, comment: null }
      })
      const firstWaiting = plan.findIndex((p) => p.status === 'waiting')
      if (firstWaiting >= 0) plan[firstWaiting].status = 'pending'
      for (const [i, p] of plan.entries()) {
        await c.query(
          `INSERT INTO est_approval (estimate_id, round, step_no, step_role, status, comment, decided_by, decided_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [estimateId, round, i + 1, p.role, p.status, p.comment, p.decided ? s.userId : null, p.decided ? new Date() : null],
        )
      }
      await c.query(`UPDATE est_estimate SET status = 'approving', approval_status = 'pending', check_passed = true, updated_at = now() WHERE id = $1`, [estimateId])
      await c.query(`UPDATE est_project SET stage = CASE WHEN stage IN ('P1','P2','P3') THEN 'P5' ELSE stage END, updated_at = now() WHERE id = $1`, [projectId])
      if (firstWaiting < 0) {
        await finalizeApproval(c, estimateId, validDays)
        return true
      }
      return false
    })
    refresh()
    return { approved }
  })
}

async function finalizeApproval(c: import('pg').PoolClient, estimateId: number, days: number) {
  const { rows } = await c.query(`SELECT e.label, e.version_no, p.number, e.project_id FROM est_estimate e JOIN est_project p ON p.id = e.project_id WHERE e.id = $1`, [estimateId])
  const r = rows[0]
  await c.query(
    `UPDATE est_estimate SET status = 'approved', approval_status = 'approved', approved_at = now(),
       valid_until = (now() AT TIME ZONE 'Asia/Seoul')::date + $2::int, customer_number = $3, updated_at = now() WHERE id = $1`,
    [estimateId, days, `${r.number}-${r.label || `v${r.version_no}`}`],
  )
  await c.query(`UPDATE est_project SET current_estimate_id = $2, updated_at = now() WHERE id = $1`, [r.project_id, estimateId])
}

export async function decideApproval(stepId: number, decision: 'approve' | 'reject', comment: string) {
  return act(async () => {
    const s = await requireEst('reviewer')
    const { rows } = await pool.query(
      `SELECT a.*, e.status AS e_status, e.project_id,
         (SELECT decided_by FROM est_approval w WHERE w.estimate_id = a.estimate_id AND w.round = a.round AND w.step_role = 'writer' LIMIT 1) AS submitter
       FROM est_approval a JOIN est_estimate e ON e.id = a.estimate_id WHERE a.id = $1`,
      [idOf(stepId)],
    )
    const a = rows[0]
    if (!a) throw new EstError('없는 결재 단계임')
    if (a.status !== 'pending' || a.e_status !== 'approving') throw new EstError('지금 결재할 차례가 아님')
    if (a.step_role === 'ceo' && s.estRole !== 'ceo') throw new EstError('대표 단계는 대표만 결재할 수 있음')
    if (a.submitter === s.userId) throw new EstError('자기가 올린 판은 결재할 수 없음')
    const why = str(comment, 2000)
    if (decision === 'reject' && !why) throw new EstError('반려 이유를 입력해야 함')
    const estimateId = n(a.estimate_id)
    const validDays = sNum(await getSettings(), 'doc.valid_days')
    await tx(async (c) => {
      await c.query(`UPDATE est_approval SET status = $2, comment = $3, decided_by = $4, decided_at = now(), approver_id = $4 WHERE id = $1`, [
        stepId,
        decision === 'approve' ? 'approved' : 'rejected',
        why || null,
        s.userId,
      ])
      if (decision === 'reject') {
        await c.query(`UPDATE est_estimate SET status = 'rejected', approval_status = 'rejected', updated_at = now() WHERE id = $1`, [estimateId])
        return
      }
      const next = await c.query(`SELECT id FROM est_approval WHERE estimate_id = $1 AND round = $2 AND status = 'waiting' ORDER BY step_no LIMIT 1`, [estimateId, a.round])
      if (next.rows[0]) await c.query(`UPDATE est_approval SET status = 'pending' WHERE id = $1`, [next.rows[0].id])
      else await finalizeApproval(c, estimateId, validDays)
    })
    refresh()
  })
}

/** 반려된 판 "수정 시작" → draft(줄 보존, 결재 기록은 남음) */
export async function reopenRejected(estimateId: number) {
  return act(async () => {
    const s = await requireEst('writer')
    await assertProjectAccess(s, await projectOfEstimate(idOf(estimateId)))
    const { rowCount } = await pool.query(`UPDATE est_estimate SET status = 'draft', check_passed = NULL, updated_at = now() WHERE id = $1 AND status = 'rejected'`, [estimateId])
    if (!rowCount) throw new EstError('반려된 판만 수정을 시작할 수 있음')
    refresh()
  })
}

// ---------- 제출(S9) ----------

export async function recordSubmission(estimateId: number, input: { channel: string; recipient: string; note: string }) {
  return act(async () => {
    const s = await requireEst('writer')
    const projectId = await projectOfEstimate(idOf(estimateId))
    await assertProjectAccess(s, projectId)
    const { rows } = await pool.query(`SELECT status FROM est_estimate WHERE id = $1`, [estimateId])
    if (!['approved', 'submitted'].includes(rows[0]?.status)) throw new EstError('승인된 판만 제출 기록을 남길 수 있음')
    const channel = ['print', 'pdf', 'email', 'kakao', 'portal', 'other'].includes(input.channel) ? input.channel : 'print'
    const days = sNum(await getSettings(), 'doc.valid_days')
    await tx(async (c) => {
      const v = await c.query(`SELECT ((now() AT TIME ZONE 'Asia/Seoul')::date + $1::int)::text AS d`, [days])
      const validUntil = v.rows[0].d
      await c.query(`INSERT INTO est_submission (estimate_id, submitted_by, channel, recipient, valid_until, note) VALUES ($1,$2,$3,$4,$5,$6)`, [
        estimateId, s.userId, channel, str(input.recipient, 200) || null, validUntil, str(input.note, 1000) || null,
      ])
      // 유효기간은 제출일 기준으로 다시 셈(§7.2)
      await c.query(`UPDATE est_estimate SET status = 'submitted', submitted_at = COALESCE(submitted_at, now()), valid_until = $2, updated_at = now() WHERE id = $1`, [estimateId, validUntil])
      await c.query(`UPDATE est_project SET stage = CASE WHEN stage IN ('P1','P2','P3','P5') THEN 'P6' ELSE stage END, current_estimate_id = $2, updated_at = now() WHERE id = $1`, [projectId, estimateId])
    })
    refresh()
  })
}

// ---------- 토의(S7) ----------

export async function addComment(estimateId: number, body: string, lineId?: number | null) {
  return act(async () => {
    const s = await requireEst('writer')
    const text = str(body, 4000)
    if (!text) throw new EstError('내용을 입력해야 함')
    await projectOfEstimate(idOf(estimateId))
    if (lineId) {
      const l = await pool.query(`SELECT 1 FROM est_line WHERE id = $1 AND estimate_id = $2`, [idOf(lineId), estimateId])
      if (!l.rows[0]) throw new EstError('그 판의 줄이 아님')
    }
    await pool.query(`INSERT INTO est_comment (estimate_id, line_id, user_id, body) VALUES ($1, $2, $3, $4)`, [estimateId, lineId || null, s.userId, text])
    // 토의 중 표시(작성 중인 판만)
    await pool.query(`UPDATE est_estimate SET status = 'discussion' WHERE id = $1 AND status = 'draft'`, [estimateId])
    refresh()
  })
}

export async function resolveComment(commentId: number, resolved: boolean) {
  return act(async () => {
    await requireEst('writer')
    await pool.query(`UPDATE est_comment SET resolved_at = CASE WHEN $2 THEN now() ELSE NULL END WHERE id = $1`, [idOf(commentId), Boolean(resolved)])
    refresh()
  })
}
