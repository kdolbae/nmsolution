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
