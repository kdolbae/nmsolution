/**
 * 견적 시스템 표의 Drizzle 선언(타입·질의용). 표 생성은 sql/011~016(= lib/est/ddl.ts)이 정본.
 * 기존 방식대로 pgSchema 없이 search_path(nmsolution)로 씀. 계산은 SQL 에서 하지 않음(lib/est/calc.ts).
 */
import { bigint, boolean, date, integer, jsonb, numeric, pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core'

const id = () => bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity()
const big = (name: string) => bigint(name, { mode: 'number' })
const ts = (name: string) => timestamp(name, { withTimezone: true })

export const estSetting = pgTable('est_setting', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  label: text('label').notNull(),
  group: text('group').notNull(),
  help: text('help'),
  isSample: boolean('is_sample').notNull().default(true),
  updatedAt: ts('updated_at').notNull().defaultNow(),
  updatedBy: text('updated_by'),
})

export const estClass = pgTable('est_class', {
  id: id(),
  level: smallint('level').notNull(),
  parentId: big('parent_id'),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  meta: jsonb('meta').notNull().default({}),
})

export const estCheckQuestion = pgTable('est_check_question', {
  id: id(),
  code: text('code').notNull().unique(),
  class2Id: big('class2_id'),
  label: text('label').notNull(),
  answerType: text('answer_type').notNull(),
  options: jsonb('options').notNull().default([]),
  unit: text('unit'),
  required: boolean('required').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
})

export const estItem = pgTable('est_item', {
  code: text('code').primaryKey(),
  kind: text('kind').notNull(),
  name: text('name').notNull(),
  spec: text('spec').notNull().default(''),
  unit: text('unit').notNull().default('식'),
  class3Id: big('class3_id'),
  qtyRuleType: text('qty_rule_type').notNull().default('fixed'),
  qtyRule: jsonb('qty_rule').notNull().default({}),
  basisText: text('basis_text').notNull().default(''),
  internalMemo: text('internal_memo').notNull().default(''),
  laborClass: text('labor_class'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
})

export const estItemPrice = pgTable('est_item_price', {
  id: id(),
  itemCode: text('item_code').notNull(),
  price: big('price').notNull(),
  effectiveFrom: date('effective_from').notNull(),
  note: text('note'),
  source: text('source').notNull().default('manual'),
  createdBy: text('created_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export const estRateSet = pgTable('est_rate_set', {
  id: id(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  mode: text('mode').notNull(),
  rates: jsonb('rates').notNull(),
  truncateUnit: integer('truncate_unit').notNull().default(1000),
  expensePerCrewDay: big('expense_per_crew_day').notNull().default(50000),
  isActive: boolean('is_active').notNull().default(true),
  isSample: boolean('is_sample').notNull().default(true),
  updatedAt: ts('updated_at').notNull().defaultNow(),
})

export const estTemplate = pgTable('est_template', {
  id: id(),
  class2Id: big('class2_id').notNull(),
  name: text('name').notNull(),
  version: integer('version').notNull().default(1),
  rateSetId: big('rate_set_id'),
  isActive: boolean('is_active').notNull().default(true),
  note: text('note'),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export const estTemplateItem = pgTable('est_template_item', {
  id: id(),
  templateId: big('template_id').notNull(),
  class3Id: big('class3_id'),
  itemCode: text('item_code').notNull(),
  grade: text('grade').notNull(),
  condition: jsonb('condition'),
  removeIf: jsonb('remove_if'),
  qtyRuleType: text('qty_rule_type'),
  qtyRule: jsonb('qty_rule'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const estRule = pgTable('est_rule', {
  id: id(),
  code: text('code').notNull().unique(),
  class1Id: big('class1_id'),
  name: text('name').notNull(),
  condition: jsonb('condition').notNull(),
  action: jsonb('action').notNull(),
  message: text('message'),
  severity: text('severity').notNull().default('error'),
  isActive: boolean('is_active').notNull().default(true),
  isSample: boolean('is_sample').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const estProject = pgTable('est_project', {
  id: id(),
  number: text('number').notNull().unique(),
  title: text('title').notNull(),
  clientId: big('client_id'),
  clientType: text('client_type').notNull().default('company'),
  siteAddress: text('site_address').notNull().default(''),
  inquiryText: text('inquiry_text').notNull().default(''),
  quoteRequestId: integer('quote_request_id'),
  class1Id: big('class1_id'),
  class2Id: big('class2_id'),
  stage: text('stage').notNull().default('P1'),
  result: text('result'),
  resultReason: text('result_reason'),
  resultAt: ts('result_at'),
  siteSummary: text('site_summary').notNull().default(''),
  managerVisitsPlanned: integer('manager_visits_planned').notNull().default(0),
  currentEstimateId: big('current_estimate_id'),
  createdBy: text('created_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
  deletedAt: ts('deleted_at'),
})

export const estProjectMember = pgTable('est_project_member', {
  projectId: big('project_id').notNull(),
  userId: text('user_id').notNull(),
  role: text('role').notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
})

export const estEstimate = pgTable('est_estimate', {
  id: id(),
  projectId: big('project_id').notNull(),
  versionNo: integer('version_no').notNull(),
  label: text('label').notNull().default(''),
  parentId: big('parent_id'),
  status: text('status').notNull().default('draft'),
  templateId: big('template_id'),
  rateSetId: big('rate_set_id'),
  ratesSnapshot: jsonb('rates_snapshot').notNull(),
  settingsSnapshot: jsonb('settings_snapshot').notNull().default({}),
  managerVisits: integer('manager_visits').notNull().default(0),
  supply: big('supply').notNull().default(0),
  vat: big('vat').notNull().default(0),
  total: big('total').notNull().default(0),
  costMin: big('cost_min').notNull().default(0),
  costTyp: big('cost_typ').notNull().default(0),
  costMax: big('cost_max').notNull().default(0),
  expectedProfit: big('expected_profit').notNull().default(0),
  marginPct: numeric('margin_pct', { precision: 6, scale: 2 }).notNull().default('0'),
  incentiveExpected: big('incentive_expected').notNull().default(0),
  checkPassed: boolean('check_passed'),
  approvalStatus: text('approval_status'),
  approvedAt: ts('approved_at'),
  submittedAt: ts('submitted_at'),
  validUntil: date('valid_until'),
  customerNumber: text('customer_number'),
  notesCustomer: text('notes_customer').notNull().default(''),
  createdBy: text('created_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
})

export const estSection = pgTable('est_section', {
  id: id(),
  estimateId: big('estimate_id').notNull(),
  class3Id: big('class3_id'),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  calcMode: text('calc_mode').notNull().default('full'),
  isOption: boolean('is_option').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const estLine = pgTable('est_line', {
  id: id(),
  estimateId: big('estimate_id').notNull(),
  sectionId: big('section_id').notNull(),
  itemCode: text('item_code'),
  kind: text('kind').notNull(),
  name: text('name').notNull(),
  spec: text('spec').notNull().default(''),
  unit: text('unit').notNull().default('식'),
  qty: numeric('qty', { precision: 12, scale: 3 }).notNull().default('0'),
  unitPrice: big('unit_price').notNull().default(0),
  amount: big('amount').notNull().default(0),
  grade: text('grade').notNull().default('basic'),
  origin: text('origin').notNull().default('manual'),
  qtyRuleSnapshot: jsonb('qty_rule_snapshot'),
  qtyOverridden: boolean('qty_overridden').notNull().default(false),
  basisText: text('basis_text').notNull().default(''),
  internalMemo: text('internal_memo').notNull().default(''),
  confirmNeeded: boolean('confirm_needed').notNull().default(false),
  removed: boolean('removed').notNull().default(false),
  removedReason: text('removed_reason'),
  removedNote: text('removed_note'),
  actualMin: big('actual_min'),
  actualTyp: big('actual_typ'),
  actualMax: big('actual_max'),
  actualSource: text('actual_source'),
  crewDays: numeric('crew_days', { precision: 10, scale: 2 }),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const estApproval = pgTable('est_approval', {
  id: id(),
  estimateId: big('estimate_id').notNull(),
  round: integer('round').notNull().default(1),
  stepNo: smallint('step_no').notNull(),
  stepRole: text('step_role').notNull(),
  approverId: text('approver_id'),
  status: text('status').notNull().default('waiting'),
  comment: text('comment'),
  decidedBy: text('decided_by'),
  decidedAt: ts('decided_at'),
})

export const estSubmission = pgTable('est_submission', {
  id: id(),
  estimateId: big('estimate_id').notNull(),
  submittedBy: text('submitted_by'),
  submittedAt: ts('submitted_at').notNull().defaultNow(),
  channel: text('channel').notNull().default('print'),
  recipient: text('recipient'),
  validUntil: date('valid_until').notNull(),
  pdfPath: text('pdf_path'),
  note: text('note'),
})

export const estOrder = pgTable('est_order', {
  id: id(),
  projectId: big('project_id').notNull(),
  estimateId: big('estimate_id'),
  lineId: big('line_id'),
  itemCode: text('item_code'),
  kind: text('kind').notNull(),
  name: text('name').notNull(),
  vendor: text('vendor'),
  qty: numeric('qty', { precision: 12, scale: 3 }).notNull().default('1'),
  plannedAmount: big('planned_amount').notNull().default(0),
  orderedAmount: big('ordered_amount').notNull().default(0),
  negotiationNote: text('negotiation_note'),
  status: text('status').notNull().default('draft'),
  orderedOn: date('ordered_on'),
  createdBy: text('created_by'),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
})

export const estSettlement = pgTable('est_settlement', {
  projectId: big('project_id').primaryKey(),
  estimateId: big('estimate_id'),
  status: text('status').notNull().default('open'),
  finalSupply: big('final_supply').notNull().default(0),
  receivedTotal: big('received_total').notNull().default(0),
  paidTotal: big('paid_total').notNull().default(0),
  managerDays: numeric('manager_days', { precision: 6, scale: 1 }).notNull().default('0'),
  managerCost: big('manager_cost').notNull().default(0),
  incentiveBasis: jsonb('incentive_basis').notNull().default({}),
  incentiveAmount: big('incentive_amount').notNull().default(0),
  execProfit: big('exec_profit').notNull().default(0),
  negotiationGain: big('negotiation_gain').notNull().default(0),
  finalProfit: big('final_profit').notNull().default(0),
  closedBy: text('closed_by'),
  closedAt: ts('closed_at'),
  note: text('note'),
  updatedAt: ts('updated_at').notNull().defaultNow(),
})

export const ssoIdentity = pgTable('sso_identity', {
  userId: text('user_id').primaryKey(),
  sbworksProfileId: text('sbworks_profile_id').notNull().unique(),
  email: text('email').notNull(),
  tenantId: text('tenant_id').notNull(),
  tenantSlug: text('tenant_slug').notNull(),
  roleCode: text('role_code').notNull(),
  scope: text('scope').notNull(),
  memberships: jsonb('memberships').notNull().default([]),
  claims: jsonb('claims').notNull().default({}),
  lastLoginAt: ts('last_login_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export const ssoSession = pgTable('sso_session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  expiresAt: ts('expires_at').notNull(),
  revokedAt: ts('revoked_at'),
  ip: text('ip'),
  ua: text('ua'),
})

export const ssoNonce = pgTable('sso_nonce', {
  jti: text('jti').primaryKey(),
  exp: ts('exp').notNull(),
  usedAt: ts('used_at').notNull().defaultNow(),
})
