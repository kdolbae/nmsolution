/**
 * 지식 DB (2026-11-14 kevin): 견적을 만들며 내린 판단과 그 이유를 회사 자산으로 남긴다.
 * 브라우저·서버 양쪽에서 쓰므로 Node 전용 API 를 쓰지 않는다. 어드민 전용이고 고객 화면에는 나오지 않는다.
 *
 * 한 줄(KnowledgeEntry) = 판단 하나.
 * - qa        : "왜 그렇게 했는지" 질문과 답. 답이 없으면 '답 대기'로 모여 견적자가 채운다.
 * - rule      : 질문 없이 바로 적는 기준·경험 (이럴 때는 이렇게 함, 이유).
 * - deviation : 매뉴얼(회사 기준)과 다르게 작성한 견적의 메모. 누가·무엇을·왜. 업체 화면에서 남긴다.
 * 답을 고치면 이전 답은 history 에 쌓여 지워지지 않는다.
 */
import categories from '@/lib/content/work-categories.json'

export const KNOWLEDGE_KINDS = ['qa', 'rule', 'deviation'] as const
export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number]

export const KIND_LABEL: Record<KnowledgeKind, string> = { qa: '질문·답', rule: '기준·경험', deviation: '매뉴얼 예외' }

export const TOPICS = ['자재 선택', '장비 선택', '인원·공정', '가격·여분율', '공법', '안전·법규', '기타'] as const
export type Topic = (typeof TOPICS)[number]

export type KnowledgeRevision = { at: string; by: string; body: string }

export type KnowledgeEntry = {
  id: number
  kind: KnowledgeKind
  /** 공종 중분류 코드 (F1 ~ H4) 또는 'COMMON' */
  category: string
  topic: Topic
  /** 질문 또는 제목 (deviation 은 '무엇이 기준과 다른지') */
  title: string
  /** 답·이유. 비어 있으면 답 대기 */
  body: string
  /** 근거가 된 현장·견적 (예: 금강변압기 NM-2610-01) */
  source: string
  clientId: number | null
  clientName: string | null
  askedBy: string
  answeredBy: string
  createdAt: string
  updatedAt: string
  history: KnowledgeRevision[]
}

export type ManualItem = {
  code: string
  name: string
  status: string
  consider: string[]
  ask: string[]
  steps: string[]
  crew: string[]
  equip: string[]
  materials: string[]
  rules: string[]
}
export type ManualGroup = { code: string; name: string; division: string; items: ManualItem[] }

/** 공종 카테고리 (대분류 → 중분류). 원본: 프로젝트 파일 quote-system/categories */
export const MANUAL_GROUPS: ManualGroup[] = (categories.divisions as { name: string; groups: { code: string; name: string; items: ManualItem[] }[] }[]).flatMap((d) =>
  d.groups.map((g) => ({ code: g.code, name: g.name, division: d.name, items: g.items })),
)
export const MANUAL_RULES = categories.rules as { id: string; when: string; add: string; status: string }[]

export const COMMON = 'COMMON'
export const CATEGORY_OPTIONS: { code: string; label: string }[] = [
  { code: COMMON, label: '공통 (모든 공사)' },
  ...MANUAL_GROUPS.map((g) => ({ code: g.code, label: `${g.code} ${g.name}` })),
]
export function categoryLabel(code: string) {
  return CATEGORY_OPTIONS.find((c) => c.code === code)?.label ?? code
}

/**
 * 회사 기준(매뉴얼) 가격값. 견적이 이 값과 다르면 업체 화면에서 이유 메모를 권한다.
 * 지난 견적의 인건비 ÷ 자재비 (간접노무비 제외, 2026-11-14 집계). 자재비 비례 인건비 비율을 정할 때 참고한다.
 */
export const LABOR_RATIO_REF: { group: string; ratio: string; from: string }[] = [
  { group: 'F1 지붕·외벽', ratio: '70 ~ 80%', from: '서울 처마 70%, 신일 지붕 80%' },
  { group: 'F2 판넬 내장·칸막이', ratio: '63 ~ 113%', from: '정준영 63%, 에어레인 67%, 어드리밍 113%' },
  { group: 'F3 철골·구조물', ratio: '66%', from: '성원 적치대' },
  { group: 'F6 기계설비·배관', ratio: '116 ~ 195%', from: '데코페이브 116%, 아토텍 195%' },
  { group: '소규모 보수', ratio: '148 ~ 158%', from: '가나티엠 148%, 제이에스테크 158%' },
]

// ---------- 견적 작성 단계형 질문 ----------

/**
 * 어느 공사든 견적 줄을 넣기 전에 먼저 정해야 하는 것 (지난 견적에서 금액이 크게 흔들린 원인들).
 * 공종별 질문(매뉴얼의 '고객에게 확인')은 이 뒤에 붙는다.
 */
export const FIRST_QUESTIONS: string[] = [
  '현장 위치와 이동 거리 (교통비·숙박이 드는지)',
  '작업 높이와 고소장비 (실내·실외 진입이 되는지, 고객 장비를 쓸 수 있는지)',
  '자재·장비 반입 경로 (차량 진입, 지게차, 엘리베이터, 양중)',
  '작업 가능 시간 (공장 가동 중인지, 야간·주말만 되는지)',
  '철거물·폐기물은 누가 치우는지',
  '화기작업(용접·절단)이 있는지',
]

export function findManualItem(code: string | undefined): { group: ManualGroup; item: ManualItem | null } | null {
  if (!code) return null
  const group = MANUAL_GROUPS.find((g) => g.code === code.split('-')[0])
  if (!group) return null
  return { group, item: group.items.find((i) => i.code === code) ?? null }
}

export type GuideSteps = { questions: string[]; confirms: string[] }

/** 공종 하나의 단계: 답을 받아야 하는 질문(먼저 정할 것)과 확인만 받는 항목(고려할 점·자동 규칙) */
export function guideSteps(code: string | undefined): GuideSteps | null {
  const hit = findManualItem(code)
  if (!hit) return null
  const items = hit.item ? [hit.item] : hit.group.items
  const rules = [...new Set(items.flatMap((i) => i.rules))]
    .map((id) => MANUAL_RULES.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => `${r.when} → ${r.add}`)
  return {
    questions: [...FIRST_QUESTIONS, ...new Set(items.flatMap((i) => i.ask))],
    confirms: [...new Set(items.flatMap((i) => i.consider)), ...rules],
  }
}

/** 아직 답·확인이 없는 항목 수 */
export function guideMissing(code: string | undefined, checks: Record<string, string> | undefined): number {
  const st = guideSteps(code)
  if (!st) return 0
  return [...st.questions, ...st.confirms].filter((k) => !checks?.[k]?.trim()).length
}
