/**
 * 견적 시스템 읽기 질의. 화면(서버 컴포넌트)·서버 액션이 씀. 합계·이익 계산은 하지 않음(lib/est/compute.ts).
 */
import { pool } from '@/lib/db'
import type { CalcMode, Kind } from './calc'
import type { RateSnap, SettingsSnap } from './compute'
import { ensureEst, n, nOrNull } from './table'

export const STAGES = ['P1', 'P2', 'P3', 'P5', 'P6', 'WON', 'EXEC', 'SETTLE', 'CLOSED', 'LOST', 'HOLD'] as const
export type Stage = (typeof STAGES)[number]
export const STAGE_LABEL: Record<string, string> = {
  P1: '접수',
  P2: '현장 확인',
  P3: '초안',
  P5: '검사·결재',
  P6: '제출',
  WON: '수주',
  EXEC: '실행',
  SETTLE: '정산',
  CLOSED: '마감',
  LOST: '실패',
  HOLD: '보류',
}
export const ESTIMATE_STATUS_LABEL: Record<string, string> = {
  draft: '작성 중',
  discussion: '토의',
  checking: '검사',
  approving: '결재 중',
  approved: '승인',
  rejected: '반려',
  submitted: '제출',
  superseded: '대체됨',
  void: '무효',
}
export const CLIENT_TYPES: Record<string, string> = { company: '기업', public: '공공', insurer: '보험사', individual: '개인', gc: '원청(종합건설)', other: '기타' }
export const REMOVED_REASONS: Record<string, string> = { not_applicable: '해당 없음', client_provides: '발주처 제공', separate_contract: '별도 계약', other: '기타' }
export const GRADE_LABEL: Record<string, string> = { required: '필수', basic: '기본', conditional: '조건부', rule: '규칙', manual: '수기', manager: '담당자' }
export const VISIT_PURPOSE: Record<string, string> = { survey: '현장 조사', meeting: '협의', supervise: '공사 관리', handover: '인수인계', other: '기타' }
export const EVENT_KIND: Record<string, string> = { site: '현장', client: '발주처', weather: '날씨', safety: '안전', design: '설계 변경', other: '기타' }
export const LABOR_CLASS: Record<string, string> = { our_staff: '우리 직원', daily: '일용', partner: '협력사' }
export const ORDER_STATUS: Record<string, string> = { draft: '준비', ordered: '발주', done: '완료', canceled: '취소' }
export const RECEIPT_KIND: Record<string, string> = { advance: '선금', interim: '중도금', balance: '잔금', extra: '추가', refund: '환불' }
export const CHANNELS: Record<string, string> = { print: '인쇄', pdf: 'PDF', email: '메일', kakao: '카카오톡', portal: '포털', other: '기타' }

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null)
const dateStr = (v: unknown): string | null => {
  if (!v) return null
  if (v instanceof Date) {
    // date 칸은 pg 가 로컬 자정 Date 로 줌 → 그날 그대로
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(v).slice(0, 10)
}

/** KST 오늘 YYYY-MM-DD */
export function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}

// ---------- 사람 ----------

export type EstUser = { id: string; name: string; email: string; role: string; estRole: string | null }

/** 견적 시스템에 들어올 수 있는 사람(로컬 관리자 + 견적 역할이 있는 사람) */
export async function listEstUsers(): Promise<EstUser[]> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT id, name, email, role, est_role FROM "user" WHERE role = 'admin' OR est_role IS NOT NULL ORDER BY name`)
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role, estRole: r.role === 'admin' ? 'ceo' : r.est_role }))
}

/** 마스터 → 사용자 탭: 협력업체가 아닌 계정 + SSO 연결 여부 */
export async function listUsersForRoles(): Promise<(EstUser & { sso: boolean })[]> {
  await ensureEst()
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.est_role, (s.user_id IS NOT NULL) AS sso FROM "user" u LEFT JOIN sso_identity s ON s.user_id = u.id
     WHERE u.role IS DISTINCT FROM 'partner' ORDER BY u.name`,
  )
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.email, role: r.role, estRole: r.est_role, sso: Boolean(r.sso) }))
}

// ---------- 분류·질문 ----------

export type EstClass = { id: number; level: number; parentId: number | null; code: string; name: string; sortOrder: number; isActive: boolean; meta: Record<string, unknown> }

export async function listClasses(): Promise<EstClass[]> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT * FROM est_class ORDER BY level, sort_order, id`)
  return rows.map((r) => ({ id: n(r.id), level: r.level, parentId: nOrNull(r.parent_id), code: r.code, name: r.name, sortOrder: r.sort_order, isActive: r.is_active, meta: r.meta ?? {} }))
}

export type Question = { id: number; code: string; class2Id: number | null; label: string; answerType: string; options: { value: string; label: string }[]; unit: string | null; required: boolean; sortOrder: number; isActive: boolean }

const toQuestion = (r: Record<string, unknown>): Question => ({
  id: n(r.id),
  code: r.code as string,
  class2Id: nOrNull(r.class2_id),
  label: r.label as string,
  answerType: r.answer_type as string,
  options: Array.isArray(r.options) ? (r.options as Question['options']) : [],
  unit: (r.unit as string) ?? null,
  required: Boolean(r.required),
  sortOrder: Number(r.sort_order),
  isActive: Boolean(r.is_active),
})

export async function listQuestions(class2Id?: number | null, all = false): Promise<Question[]> {
  await ensureEst()
  const { rows } = all
    ? await pool.query(`SELECT * FROM est_check_question ORDER BY class2_id NULLS FIRST, sort_order, id`)
    : await pool.query(`SELECT * FROM est_check_question WHERE is_active AND (class2_id IS NULL OR class2_id = $1) ORDER BY class2_id NULLS FIRST, sort_order, id`, [class2Id ?? null])
  return rows.map(toQuestion)
}

// ---------- 프로젝트 ----------

export type ProjectListRow = {
  id: number
  number: string
  title: string
  stage: string
  result: string | null
  clientName: string | null
  managers: { id: string; name: string }[]
  updatedAt: string
  current: { id: number; label: string; versionNo: number; status: string; supply: number; total: number; marginPct: number; expectedProfit: number } | null
  pendingApprovals: number
}

export async function listProjects(): Promise<ProjectListRow[]> {
  await ensureEst()
  const { rows } = await pool.query(
    `SELECT p.id, p.number, p.title, p.stage, p.result, p.updated_at, c.name AS client_name,
       COALESCE((SELECT json_agg(json_build_object('id', u.id, 'name', u.name) ORDER BY m.is_primary DESC, u.name)
                 FROM est_project_member m JOIN "user" u ON u.id = m.user_id WHERE m.project_id = p.id AND m.role = 'manager'), '[]') AS managers,
       e.id AS e_id, e.label, e.version_no, e.status AS e_status, e.supply, e.total, e.margin_pct, e.expected_profit,
       (SELECT count(*) FROM est_approval a JOIN est_estimate x ON x.id = a.estimate_id WHERE x.project_id = p.id AND x.status = 'approving' AND a.status = 'pending') AS pending
     FROM est_project p
     LEFT JOIN clients c ON c.id = p.client_id
     LEFT JOIN est_estimate e ON e.id = p.current_estimate_id
     WHERE p.deleted_at IS NULL
     ORDER BY p.updated_at DESC`,
  )
  return rows.map((r) => ({
    id: n(r.id),
    number: r.number,
    title: r.title,
    stage: r.stage,
    result: r.result,
    clientName: r.client_name,
    managers: r.managers,
    updatedAt: iso(r.updated_at)!,
    current: r.e_id
      ? { id: n(r.e_id), label: r.label, versionNo: r.version_no, status: r.e_status, supply: n(r.supply), total: n(r.total), marginPct: n(r.margin_pct), expectedProfit: n(r.expected_profit) }
      : null,
    pendingApprovals: n(r.pending),
  }))
}

export type Project = {
  id: number
  number: string
  title: string
  clientId: number | null
  client: { id: number; name: string; bizNumber: string | null; siteAddress: string | null } | null
  clientType: string
  siteAddress: string
  inquiryText: string
  quoteRequestId: number | null
  class1Id: number | null
  class2Id: number | null
  class1Name: string | null
  class2Name: string | null
  stage: string
  result: string | null
  resultReason: string | null
  resultAt: string | null
  siteSummary: string
  managerVisitsPlanned: number
  currentEstimateId: number | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  members: { userId: string; name: string; role: string; isPrimary: boolean }[]
}

export async function getProject(id: number): Promise<Project | null> {
  await ensureEst()
  const { rows } = await pool.query(
    `SELECT p.*, c.name AS client_name, c.biz_number, c.site_address AS client_site, c1.name AS class1_name, c2.name AS class2_name,
       COALESCE((SELECT json_agg(json_build_object('userId', u.id, 'name', u.name, 'role', m.role, 'isPrimary', m.is_primary) ORDER BY m.role, m.is_primary DESC, u.name)
                 FROM est_project_member m JOIN "user" u ON u.id = m.user_id WHERE m.project_id = p.id), '[]') AS members
     FROM est_project p
     LEFT JOIN clients c ON c.id = p.client_id
     LEFT JOIN est_class c1 ON c1.id = p.class1_id
     LEFT JOIN est_class c2 ON c2.id = p.class2_id
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [id],
  )
  const r = rows[0]
  if (!r) return null
  return {
    id: n(r.id),
    number: r.number,
    title: r.title,
    clientId: nOrNull(r.client_id),
    client: r.client_id ? { id: n(r.client_id), name: r.client_name, bizNumber: r.biz_number, siteAddress: r.client_site } : null,
    clientType: r.client_type,
    siteAddress: r.site_address,
    inquiryText: r.inquiry_text,
    quoteRequestId: r.quote_request_id,
    class1Id: nOrNull(r.class1_id),
    class2Id: nOrNull(r.class2_id),
    class1Name: r.class1_name,
    class2Name: r.class2_name,
    stage: r.stage,
    result: r.result,
    resultReason: r.result_reason,
    resultAt: iso(r.result_at),
    siteSummary: r.site_summary,
    managerVisitsPlanned: r.manager_visits_planned,
    currentEstimateId: nOrNull(r.current_estimate_id),
    createdBy: r.created_by,
    createdAt: iso(r.created_at)!,
    updatedAt: iso(r.updated_at)!,
    members: r.members,
  }
}

export type Answer = { questionId: number; code: string; value: unknown; note: string | null; confirmNeeded: boolean; answeredAt: string }

export async function listAnswers(projectId: number): Promise<Answer[]> {
  await ensureEst()
  const { rows } = await pool.query(
    `SELECT a.*, q.code FROM est_check_answer a JOIN est_check_question q ON q.id = a.question_id WHERE a.project_id = $1`,
    [projectId],
  )
  return rows.map((r) => ({ questionId: n(r.question_id), code: r.code, value: r.value, note: r.note, confirmNeeded: r.confirm_needed, answeredAt: iso(r.answered_at)! }))
}

/** 답 → {질문 코드: 값} (확인 못함은 값이 있어도 따로) */
export function answerMap(answers: Answer[]): { values: Record<string, unknown>; unconfirmed: string[] } {
  const values: Record<string, unknown> = {}
  const unconfirmed: string[] = []
  for (const a of answers) {
    if (a.value !== null && a.value !== undefined) values[a.code] = a.value
    if (a.confirmNeeded) unconfirmed.push(a.code)
  }
  return { values, unconfirmed }
}

export type Visit = { id: number; userId: string; userName: string; visitedOn: string; purpose: string; hours: number | null; note: string | null; countsAsManagerDay: boolean }

export async function listVisits(projectId: number): Promise<Visit[]> {
  await ensureEst()
  const { rows } = await pool.query(
    `SELECT v.*, u.name AS user_name FROM est_visit v JOIN "user" u ON u.id = v.user_id WHERE v.project_id = $1 ORDER BY v.visited_on DESC, v.id DESC`,
    [projectId],
  )
  return rows.map((r) => ({
    id: n(r.id),
    userId: r.user_id,
    userName: r.user_name,
    visitedOn: dateStr(r.visited_on)!,
    purpose: r.purpose,
    hours: r.hours === null ? null : n(r.hours),
    note: r.note,
    countsAsManagerDay: r.counts_as_manager_day,
  }))
}

export type PhotoMeta = { id: number; questionId: number | null; visitId: number | null; caption: string; forCustomer: boolean; createdAt: string }

export async function listPhotos(projectId: number): Promise<PhotoMeta[]> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT id, question_id, visit_id, caption, for_customer, created_at FROM est_photo WHERE project_id = $1 ORDER BY id`, [projectId])
  return rows.map((r) => ({ id: n(r.id), questionId: nOrNull(r.question_id), visitId: nOrNull(r.visit_id), caption: r.caption, forCustomer: r.for_customer, createdAt: iso(r.created_at)! }))
}

export type EstEvent = { id: number; kind: string; title: string; body: string; costImpact: number; occurredOn: string; createdBy: string | null }

export async function listEvents(projectId: number): Promise<EstEvent[]> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT * FROM est_event WHERE project_id = $1 ORDER BY occurred_on DESC, id DESC`, [projectId])
  return rows.map((r) => ({ id: n(r.id), kind: r.kind, title: r.title, body: r.body, costImpact: n(r.cost_impact), occurredOn: dateStr(r.occurred_on)!, createdBy: r.created_by }))
}

// ---------- 판 ----------

export type EstimateRow = {
  id: number
  projectId: number
  versionNo: number
  label: string
  parentId: number | null
  status: string
  templateId: number | null
  rateSetId: number | null
  rateSnap: RateSnap
  settingsSnap: SettingsSnap
  managerVisits: number
  supply: number
  vat: number
  total: number
  costMin: number
  costTyp: number
  costMax: number
  expectedProfit: number
  marginPct: number
  incentiveExpected: number
  checkPassed: boolean | null
  approvalStatus: string | null
  approvedAt: string | null
  submittedAt: string | null
  validUntil: string | null
  customerNumber: string | null
  notesCustomer: string
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export function toEstimate(r: Record<string, unknown>): EstimateRow {
  return {
    id: n(r.id),
    projectId: n(r.project_id),
    versionNo: Number(r.version_no),
    label: r.label as string,
    parentId: nOrNull(r.parent_id),
    status: r.status as string,
    templateId: nOrNull(r.template_id),
    rateSetId: nOrNull(r.rate_set_id),
    rateSnap: r.rates_snapshot as RateSnap,
    settingsSnap: r.settings_snapshot as SettingsSnap,
    managerVisits: Number(r.manager_visits),
    supply: n(r.supply),
    vat: n(r.vat),
    total: n(r.total),
    costMin: n(r.cost_min),
    costTyp: n(r.cost_typ),
    costMax: n(r.cost_max),
    expectedProfit: n(r.expected_profit),
    marginPct: n(r.margin_pct),
    incentiveExpected: n(r.incentive_expected),
    checkPassed: r.check_passed as boolean | null,
    approvalStatus: r.approval_status as string | null,
    approvedAt: iso(r.approved_at),
    submittedAt: iso(r.submitted_at),
    validUntil: dateStr(r.valid_until),
    customerNumber: r.customer_number as string | null,
    notesCustomer: r.notes_customer as string,
    createdBy: r.created_by as string | null,
    createdAt: iso(r.created_at)!,
    updatedAt: iso(r.updated_at)!,
  }
}

export async function listEstimates(projectId: number): Promise<EstimateRow[]> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT * FROM est_estimate WHERE project_id = $1 ORDER BY version_no`, [projectId])
  return rows.map(toEstimate)
}

export async function getEstimate(id: number): Promise<EstimateRow | null> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT * FROM est_estimate WHERE id = $1`, [id])
  return rows[0] ? toEstimate(rows[0]) : null
}

export type SectionRow = { id: number; class3Id: number | null; name: string; description: string; calcMode: CalcMode; isOption: boolean; sortOrder: number }

export type LineRow = {
  id: number
  sectionId: number
  itemCode: string | null
  kind: Kind
  name: string
  spec: string
  unit: string
  qty: number
  unitPrice: number
  amount: number
  grade: string
  origin: string
  qtyRuleSnapshot: unknown
  qtyOverridden: boolean
  basisText: string
  internalMemo: string
  confirmNeeded: boolean
  removed: boolean
  removedReason: string | null
  removedNote: string | null
  actual: { min: number; typ: number; max: number } | null
  actualSource: string | null
  crewDays: number | null
  sortOrder: number
}

export function toLine(r: Record<string, unknown>): LineRow {
  return {
    id: n(r.id),
    sectionId: n(r.section_id),
    itemCode: (r.item_code as string) ?? null,
    kind: r.kind as Kind,
    name: r.name as string,
    spec: r.spec as string,
    unit: r.unit as string,
    qty: n(r.qty),
    unitPrice: n(r.unit_price),
    amount: n(r.amount),
    grade: r.grade as string,
    origin: r.origin as string,
    qtyRuleSnapshot: r.qty_rule_snapshot ?? null,
    qtyOverridden: Boolean(r.qty_overridden),
    basisText: r.basis_text as string,
    internalMemo: r.internal_memo as string,
    confirmNeeded: Boolean(r.confirm_needed),
    removed: Boolean(r.removed),
    removedReason: (r.removed_reason as string) ?? null,
    removedNote: (r.removed_note as string) ?? null,
    actual: r.actual_typ === null || r.actual_typ === undefined ? null : { min: n(r.actual_min), typ: n(r.actual_typ), max: n(r.actual_max) },
    actualSource: (r.actual_source as string) ?? null,
    crewDays: r.crew_days === null || r.crew_days === undefined ? null : n(r.crew_days),
    sortOrder: Number(r.sort_order),
  }
}

export type EstimateDetail = { estimate: EstimateRow; sections: (SectionRow & { lines: LineRow[] })[] }

export async function getEstimateDetail(id: number): Promise<EstimateDetail | null> {
  const estimate = await getEstimate(id)
  if (!estimate) return null
  const [s, l] = await Promise.all([
    pool.query(`SELECT * FROM est_section WHERE estimate_id = $1 ORDER BY is_option, sort_order, id`, [id]),
    pool.query(`SELECT * FROM est_line WHERE estimate_id = $1 ORDER BY sort_order, id`, [id]),
  ])
  const lines = l.rows.map(toLine)
  return {
    estimate,
    sections: s.rows.map((r) => ({
      id: n(r.id),
      class3Id: nOrNull(r.class3_id),
      name: r.name,
      description: r.description,
      calcMode: r.calc_mode,
      isOption: r.is_option,
      sortOrder: r.sort_order,
      lines: lines.filter((x) => x.sectionId === n(r.id)),
    })),
  }
}

// ---------- 토의·결재·검사 ----------

export type Comment = { id: number; estimateId: number; lineId: number | null; lineName: string | null; userId: string; userName: string; body: string; resolvedAt: string | null; createdAt: string }

export async function listComments(projectId: number): Promise<Comment[]> {
  await ensureEst()
  const { rows } = await pool.query(
    `SELECT c.*, u.name AS user_name, l.name AS line_name FROM est_comment c
     JOIN est_estimate e ON e.id = c.estimate_id JOIN "user" u ON u.id = c.user_id LEFT JOIN est_line l ON l.id = c.line_id
     WHERE e.project_id = $1 ORDER BY c.created_at`,
    [projectId],
  )
  return rows.map((r) => ({
    id: n(r.id),
    estimateId: n(r.estimate_id),
    lineId: nOrNull(r.line_id),
    lineName: r.line_name,
    userId: r.user_id,
    userName: r.user_name,
    body: r.body,
    resolvedAt: iso(r.resolved_at),
    createdAt: iso(r.created_at)!,
  }))
}

export type ApprovalStep = { id: number; estimateId: number; round: number; stepNo: number; stepRole: string; status: string; comment: string | null; decidedBy: string | null; decidedByName: string | null; decidedAt: string | null }

export async function listApprovals(projectId: number): Promise<ApprovalStep[]> {
  await ensureEst()
  const { rows } = await pool.query(
    `SELECT a.*, u.name AS decided_name FROM est_approval a JOIN est_estimate e ON e.id = a.estimate_id LEFT JOIN "user" u ON u.id = a.decided_by
     WHERE e.project_id = $1 ORDER BY a.estimate_id, a.round DESC, a.step_no`,
    [projectId],
  )
  return rows.map((r) => ({
    id: n(r.id),
    estimateId: n(r.estimate_id),
    round: r.round,
    stepNo: r.step_no,
    stepRole: r.step_role,
    status: r.status,
    comment: r.comment,
    decidedBy: r.decided_by,
    decidedByName: r.decided_name,
    decidedAt: iso(r.decided_at),
  }))
}

/** 내 역할로 결재할 차례인 건 수(상단바 배지) */
export async function pendingApprovalCount(estRole: string | null, userId: string): Promise<number> {
  if (!estRole || estRole === 'writer') return 0
  await ensureEst()
  const roles = estRole === 'ceo' ? ['reviewer', 'ceo'] : ['reviewer']
  const { rows } = await pool.query(
    `SELECT count(*)::int AS c FROM est_approval a JOIN est_estimate e ON e.id = a.estimate_id
     WHERE a.status = 'pending' AND e.status = 'approving' AND a.step_role = ANY($1) AND (e.created_by IS DISTINCT FROM $2 OR $3)`,
    [roles, userId, estRole === 'ceo'],
  )
  return rows[0]?.c ?? 0
}

export type PendingApproval = { stepId: number; stepRole: string; estimateId: number; label: string; supply: number; projectId: number; number: string; title: string; submittedAt: string | null }

/** 내 역할로 결재할 차례인 단계(견적 현황 결재 탭) */
export async function listPendingApprovals(estRole: string | null, userId: string): Promise<PendingApproval[]> {
  if (!estRole || estRole === 'writer') return []
  await ensureEst()
  const roles = estRole === 'ceo' ? ['reviewer', 'ceo'] : ['reviewer']
  const { rows } = await pool.query(
    `SELECT a.id, a.step_role, e.id AS e_id, e.label, e.supply, p.id AS p_id, p.number, p.title,
       (SELECT w.decided_at FROM est_approval w WHERE w.estimate_id = a.estimate_id AND w.round = a.round AND w.step_role = 'writer' LIMIT 1) AS submitted_at
     FROM est_approval a JOIN est_estimate e ON e.id = a.estimate_id JOIN est_project p ON p.id = e.project_id
     WHERE a.status = 'pending' AND e.status = 'approving' AND a.step_role = ANY($1) AND p.deleted_at IS NULL
     ORDER BY a.id`,
    [roles],
  )
  return rows.map((r) => ({ stepId: n(r.id), stepRole: r.step_role, estimateId: n(r.e_id), label: r.label, supply: n(r.supply), projectId: n(r.p_id), number: r.number, title: r.title, submittedAt: iso(r.submitted_at) }))
}

export type CheckRun = { id: number; estimateId: number; results: { code: string; severity: string; message: string; lineId?: string }[]; passed: boolean; ranAt: string }

export async function lastCheckRun(estimateId: number): Promise<CheckRun | null> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT * FROM est_check_run WHERE estimate_id = $1 ORDER BY id DESC LIMIT 1`, [estimateId])
  const r = rows[0]
  return r ? { id: n(r.id), estimateId, results: r.results, passed: r.passed, ranAt: iso(r.ran_at)! } : null
}

export type Submission = { id: number; estimateId: number; submittedAt: string; channel: string; recipient: string | null; validUntil: string; note: string | null; byName: string | null }

export async function listSubmissions(projectId: number): Promise<Submission[]> {
  await ensureEst()
  const { rows } = await pool.query(
    `SELECT s.*, u.name AS by_name FROM est_submission s JOIN est_estimate e ON e.id = s.estimate_id LEFT JOIN "user" u ON u.id = s.submitted_by
     WHERE e.project_id = $1 ORDER BY s.submitted_at DESC`,
    [projectId],
  )
  return rows.map((r) => ({ id: n(r.id), estimateId: n(r.estimate_id), submittedAt: iso(r.submitted_at)!, channel: r.channel, recipient: r.recipient, validUntil: dateStr(r.valid_until)!, note: r.note, byName: r.by_name }))
}

// ---------- 마스터 ----------

export type ItemRow = {
  code: string
  kind: Kind
  name: string
  spec: string
  unit: string
  class3Id: number | null
  qtyRuleType: string
  qtyRule: unknown
  basisText: string
  internalMemo: string
  laborClass: string | null
  isActive: boolean
  price: number
}

/** 품목 + 지금 견적단가(effective_from <= 오늘 중 가장 늦은 줄) */
export async function listItems(activeOnly = false): Promise<ItemRow[]> {
  await ensureEst()
  const { rows } = await pool.query(
    `SELECT i.*, (SELECT p.price FROM est_item_price p WHERE p.item_code = i.code AND p.effective_from <= (now() AT TIME ZONE 'Asia/Seoul')::date
                  ORDER BY p.effective_from DESC, p.id DESC LIMIT 1) AS price
     FROM est_item i ${activeOnly ? 'WHERE i.is_active' : ''} ORDER BY i.kind, i.code`,
  )
  return rows.map((r) => ({
    code: r.code,
    kind: r.kind,
    name: r.name,
    spec: r.spec,
    unit: r.unit,
    class3Id: nOrNull(r.class3_id),
    qtyRuleType: r.qty_rule_type,
    qtyRule: r.qty_rule,
    basisText: r.basis_text,
    internalMemo: r.internal_memo,
    laborClass: r.labor_class,
    isActive: r.is_active,
    price: n(r.price),
  }))
}

export type PriceHistory = { id: number; itemCode: string; price: number; effectiveFrom: string; note: string | null; source: string; createdBy: string | null }

export async function listPriceHistory(): Promise<PriceHistory[]> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT * FROM est_item_price ORDER BY item_code, effective_from DESC, id DESC`)
  return rows.map((r) => ({ id: n(r.id), itemCode: r.item_code, price: n(r.price), effectiveFrom: dateStr(r.effective_from)!, note: r.note, source: r.source, createdBy: r.created_by }))
}

export type ActualObs = { id: number; itemCode: string; source: string; unitPrice: number; vendor: string | null; projectId: number | null; observedOn: string; note: string | null }

export async function listActualObservations(itemCodes?: string[]): Promise<ActualObs[]> {
  await ensureEst()
  const { rows } = itemCodes
    ? await pool.query(`SELECT * FROM est_actual_cost WHERE item_code = ANY($1) ORDER BY item_code, observed_on DESC, id DESC`, [itemCodes])
    : await pool.query(`SELECT * FROM est_actual_cost ORDER BY observed_on DESC, id DESC LIMIT 500`)
  return rows.map((r) => ({ id: n(r.id), itemCode: r.item_code, source: r.source, unitPrice: n(r.unit_price), vendor: r.vendor, projectId: nOrNull(r.project_id), observedOn: dateStr(r.observed_on)!, note: r.note }))
}

export type LaborRate = { id: number; laborClass: string; itemCode: string | null; dayRate: number; overtimeFactor: number; nightFactor: number; effectiveFrom: string; note: string | null }

export async function listLaborRates(): Promise<LaborRate[]> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT * FROM est_labor_rate ORDER BY labor_class, item_code NULLS FIRST, effective_from DESC, id DESC`)
  return rows.map((r) => ({ id: n(r.id), laborClass: r.labor_class, itemCode: r.item_code, dayRate: n(r.day_rate), overtimeFactor: n(r.overtime_factor), nightFactor: n(r.night_factor), effectiveFrom: dateStr(r.effective_from)!, note: r.note }))
}

export type RateSetRow = { id: number; code: string; name: string; mode: 'full' | 'simple'; rates: Record<string, number>; truncateUnit: number; expensePerCrewDay: number; isActive: boolean; isSample: boolean }

export async function listRateSets(): Promise<RateSetRow[]> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT * FROM est_rate_set ORDER BY id`)
  return rows.map((r) => ({ id: n(r.id), code: r.code, name: r.name, mode: r.mode, rates: r.rates, truncateUnit: r.truncate_unit, expensePerCrewDay: n(r.expense_per_crew_day), isActive: r.is_active, isSample: r.is_sample }))
}

export function rateSnapOf(r: RateSetRow): RateSnap {
  return { code: r.code, name: r.name, mode: r.mode, rates: r.rates, truncateUnit: r.truncateUnit, expensePerCrewDay: r.expensePerCrewDay }
}

export type TemplateRow = { id: number; class2Id: number; class2Name: string; name: string; version: number; rateSetId: number | null; isActive: boolean; note: string | null }
export type TemplateItemRow = { id: number; templateId: number; class3Id: number | null; itemCode: string; grade: 'required' | 'basic' | 'conditional'; condition: unknown; removeIf: unknown; qtyRuleType: string | null; qtyRule: unknown; sortOrder: number }

export async function listTemplates(): Promise<TemplateRow[]> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT t.*, c.name AS class2_name FROM est_template t JOIN est_class c ON c.id = t.class2_id ORDER BY c.sort_order, t.version DESC`)
  return rows.map((r) => ({ id: n(r.id), class2Id: n(r.class2_id), class2Name: r.class2_name, name: r.name, version: r.version, rateSetId: nOrNull(r.rate_set_id), isActive: r.is_active, note: r.note }))
}

export async function listTemplateItems(templateId?: number): Promise<TemplateItemRow[]> {
  await ensureEst()
  const { rows } = templateId
    ? await pool.query(`SELECT * FROM est_template_item WHERE template_id = $1 ORDER BY sort_order, id`, [templateId])
    : await pool.query(`SELECT * FROM est_template_item ORDER BY template_id, sort_order, id`)
  return rows.map((r) => ({ id: n(r.id), templateId: n(r.template_id), class3Id: nOrNull(r.class3_id), itemCode: r.item_code, grade: r.grade, condition: r.condition, removeIf: r.remove_if, qtyRuleType: r.qty_rule_type, qtyRule: r.qty_rule, sortOrder: r.sort_order }))
}

export type RuleRow = { id: number; code: string; class1Id: number | null; name: string; condition: unknown; action: Record<string, unknown>; message: string | null; severity: 'error' | 'warn'; isActive: boolean; isSample: boolean; sortOrder: number }

export async function listRules(class1Id?: number | null, activeOnly = false): Promise<RuleRow[]> {
  await ensureEst()
  const where: string[] = []
  const args: unknown[] = []
  if (class1Id !== undefined) {
    args.push(class1Id)
    where.push(`(class1_id IS NULL OR class1_id = $${args.length})`)
  }
  if (activeOnly) where.push('is_active')
  const { rows } = await pool.query(`SELECT * FROM est_rule ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY sort_order, id`, args)
  return rows.map((r) => ({ id: n(r.id), code: r.code, class1Id: nOrNull(r.class1_id), name: r.name, condition: r.condition, action: r.action ?? {}, message: r.message, severity: r.severity, isActive: r.is_active, isSample: r.is_sample, sortOrder: r.sort_order }))
}

// ---------- 실행·정산 ----------

export type OrderRow = { id: number; estimateId: number | null; lineId: number | null; itemCode: string | null; kind: Kind; name: string; vendor: string | null; qty: number; plannedAmount: number; orderedAmount: number; negotiationNote: string | null; status: string; orderedOn: string | null }

export async function listOrders(projectId: number): Promise<OrderRow[]> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT * FROM est_order WHERE project_id = $1 ORDER BY id`, [projectId])
  return rows.map((r) => ({
    id: n(r.id),
    estimateId: nOrNull(r.estimate_id),
    lineId: nOrNull(r.line_id),
    itemCode: r.item_code,
    kind: r.kind,
    name: r.name,
    vendor: r.vendor,
    qty: n(r.qty),
    plannedAmount: n(r.planned_amount),
    orderedAmount: n(r.ordered_amount),
    negotiationNote: r.negotiation_note,
    status: r.status,
    orderedOn: dateStr(r.ordered_on),
  }))
}

export type CrewDay = { id: number; workDate: string; itemCode: string | null; laborClass: string; headcount: number; hours: number; overtimeHours: number; night: boolean; note: string | null }

export async function listCrewDays(projectId: number): Promise<CrewDay[]> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT * FROM est_crew_day WHERE project_id = $1 ORDER BY work_date, id`, [projectId])
  return rows.map((r) => ({ id: n(r.id), workDate: dateStr(r.work_date)!, itemCode: r.item_code, laborClass: r.labor_class, headcount: n(r.headcount), hours: n(r.hours), overtimeHours: n(r.overtime_hours), night: r.night, note: r.note }))
}

export type Payment = { id: number; orderId: number | null; itemCode: string | null; kind: string; amount: number; paidOn: string; vendor: string | null; evidencePath: string | null; note: string | null }
export type Receipt = { id: number; kind: string; amount: number; receivedOn: string; note: string | null }

export async function listPayments(projectId: number): Promise<Payment[]> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT * FROM est_payment WHERE project_id = $1 ORDER BY paid_on, id`, [projectId])
  return rows.map((r) => ({ id: n(r.id), orderId: nOrNull(r.order_id), itemCode: r.item_code, kind: r.kind, amount: n(r.amount), paidOn: dateStr(r.paid_on)!, vendor: r.vendor, evidencePath: r.evidence_path, note: r.note }))
}

export async function listReceipts(projectId: number): Promise<Receipt[]> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT * FROM est_receipt WHERE project_id = $1 ORDER BY received_on, id`, [projectId])
  return rows.map((r) => ({ id: n(r.id), kind: r.kind, amount: n(r.amount), receivedOn: dateStr(r.received_on)!, note: r.note }))
}

export type Settlement = {
  estimateId: number | null
  status: string
  finalSupply: number
  receivedTotal: number
  paidTotal: number
  managerDays: number
  managerDaysOverridden: boolean
  managerCost: number
  incentiveBasis: Record<string, unknown>
  incentiveAmount: number
  execProfit: number
  negotiationGain: number
  finalProfit: number
  closedAt: string | null
  closedBy: string | null
  note: string | null
}

export async function getSettlement(projectId: number): Promise<Settlement | null> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT * FROM est_settlement WHERE project_id = $1`, [projectId])
  const r = rows[0]
  if (!r) return null
  return {
    estimateId: nOrNull(r.estimate_id),
    status: r.status,
    finalSupply: n(r.final_supply),
    receivedTotal: n(r.received_total),
    paidTotal: n(r.paid_total),
    managerDays: n(r.manager_days),
    managerDaysOverridden: Boolean(r.manager_days_overridden),
    managerCost: n(r.manager_cost),
    incentiveBasis: r.incentive_basis ?? {},
    incentiveAmount: n(r.incentive_amount),
    execProfit: n(r.exec_profit),
    negotiationGain: n(r.negotiation_gain),
    finalProfit: n(r.final_profit),
    closedAt: iso(r.closed_at),
    closedBy: r.closed_by,
    note: r.note,
  }
}

export type VarianceFlag = { id: number; projectId: number; projectNumber: string; itemCode: string; itemName: string; estimatePrice: number; actualPrice: number; variancePct: number; status: string; createdAt: string }

export async function listVarianceFlags(status: string | null = 'new', projectId?: number): Promise<VarianceFlag[]> {
  await ensureEst()
  const args: unknown[] = []
  const where: string[] = []
  if (status) {
    args.push(status)
    where.push(`f.status = $${args.length}`)
  }
  if (projectId) {
    args.push(projectId)
    where.push(`f.project_id = $${args.length}`)
  }
  const { rows } = await pool.query(
    `SELECT f.*, p.number, i.name AS item_name FROM est_variance_flag f JOIN est_project p ON p.id = f.project_id JOIN est_item i ON i.code = f.item_code
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY f.created_at DESC`,
    args,
  )
  return rows.map((r) => ({ id: n(r.id), projectId: n(r.project_id), projectNumber: r.number, itemCode: r.item_code, itemName: r.item_name, estimatePrice: n(r.estimate_price), actualPrice: n(r.actual_price), variancePct: n(r.variance_pct), status: r.status, createdAt: iso(r.created_at)! }))
}

// ---------- 대장 ----------

export type LedgerRow = {
  submissionId: number
  projectId: number
  number: string
  title: string
  clientName: string | null
  estimateId: number
  versionNo: number
  label: string
  customerNumber: string | null
  supply: number
  vat: number
  total: number
  submittedAt: string
  validUntil: string
  channel: string
  result: string | null
  resultAt: string | null
  stage: string
}

export async function listLedger(f: { from?: string; to?: string; result?: string; client?: string }): Promise<LedgerRow[]> {
  await ensureEst()
  const where: string[] = []
  const args: unknown[] = []
  if (f.from) {
    args.push(f.from)
    where.push(`(submitted_at AT TIME ZONE 'Asia/Seoul')::date >= $${args.length}::date`)
  }
  if (f.to) {
    args.push(f.to)
    where.push(`(submitted_at AT TIME ZONE 'Asia/Seoul')::date <= $${args.length}::date`)
  }
  if (f.result === 'none') where.push(`result IS NULL`)
  else if (f.result) {
    args.push(f.result)
    where.push(`result = $${args.length}`)
  }
  if (f.client) {
    args.push(`%${f.client}%`)
    where.push(`client_name ILIKE $${args.length}`)
  }
  const { rows } = await pool.query(`SELECT * FROM est_ledger ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY submitted_at DESC`, args)
  return rows.map((r) => ({
    submissionId: n(r.submission_id),
    projectId: n(r.project_id),
    number: r.number,
    title: r.title,
    clientName: r.client_name,
    estimateId: n(r.estimate_id),
    versionNo: r.version_no,
    label: r.label,
    customerNumber: r.customer_number,
    supply: n(r.supply),
    vat: n(r.vat),
    total: n(r.total),
    submittedAt: iso(r.submitted_at)!,
    validUntil: dateStr(r.valid_until)!,
    channel: r.channel,
    result: r.result,
    resultAt: iso(r.result_at),
    stage: r.stage,
  }))
}

// ---------- 문의·업체 고르기 ----------

export async function listQuoteRequestsForPick(q: string): Promise<{ id: number; name: string; company: string; location: string; message: string; createdAt: string }[]> {
  await ensureEst()
  const like = `%${q}%`
  const { rows } = await pool.query(
    `SELECT id, name, company, location, message, created_at FROM quote_requests
     WHERE $1 = '%%' OR name ILIKE $1 OR company ILIKE $1 OR location ILIKE $1 OR message ILIKE $1
     ORDER BY created_at DESC LIMIT 30`,
    [like],
  )
  return rows.map((r) => ({ id: r.id, name: r.name, company: r.company, location: r.location, message: r.message, createdAt: iso(r.created_at)! }))
}

export async function listClientsForPick(): Promise<{ id: number; name: string; siteAddress: string | null }[]> {
  await ensureEst()
  const { rows } = await pool.query(`SELECT id, name, site_address FROM clients ORDER BY name`)
  return rows.map((r) => ({ id: n(r.id), name: r.name, siteAddress: r.site_address }))
}
