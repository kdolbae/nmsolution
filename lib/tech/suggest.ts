import Anthropic from '@anthropic-ai/sdk'
import { listTech } from './table'
import { listKnowledge } from '@/lib/knowledge/table'
import { listOutcomes } from '@/lib/outcomes/table'
import { RESULT_LABEL } from '@/lib/outcomes/shared'
import { COMPARE_KEYS } from './shared'

/**
 * 견적 공종의 '방식 고르기'에서 Claude 에게 제안을 받는다 (2026-11-15 kevin).
 * 보내는 것: 회사에 쌓인 기술 카드, 그 공종의 지식 DB 기록, 지난 수주·실주 이유, 이번 공종의 품목(금액 없음)과 '먼저 정할 것' 답.
 * 업체 이름·연락처·금액은 보내지 않는다. 결과는 참고용 글이고 저장하지 않는다. ANTHROPIC_API_KEY 가 있어야 돈다.
 */
export const SUGGEST_MODEL = 'claude-opus-5-5'

const SYSTEM = `너는 엔엠솔루션(공장·건물 개보수 시공사)의 견적 담당을 돕는다. 주어진 회사 기술 자료와 이번 현장 조건만 근거로, 어느 방식이 왜 유리한지 제안한다.

형식 (Markdown 없이 줄글과 번호만, 500자 안팎)
추천: <방식 이름> 한 줄
이유: 이번 현장 조건과 연결해 2~4줄
대안: 조건이 달라지면 고를 방식과 그 조건 1~2줄
먼저 확인할 것: 답이 비어 있어 판단을 바꿀 수 있는 항목 1~3개

규칙
- 문체는 "~함" 개조식.
- 기술 자료에 없는 수치(압력·온도·관경·가격)는 지어내지 않는다. 필요하면 "제조사 확인 필요"라고 적는다.
- 자료의 확인 상태가 '미확인'인 내용을 근거로 쓸 때는 그렇다고 밝힌다.
- 현장 조건이 부족하면 추천을 억지로 하나로 좁히지 말고 갈리는 조건을 적는다.`

export type SuggestInput = {
  set: string
  category: string
  sectionName: string
  items: { kind: string; name: string; spec: string; qty: number; unit: string }[]
  checks: Record<string, string>
}

export async function suggestMethod(input: SuggestInput): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('사이트에 Claude API 키(ANTHROPIC_API_KEY)가 없어 제안을 받을 수 없음. 비교표를 보고 직접 고르면 됨.')
  const [tech, knowledge, outcomes] = await Promise.all([listTech(), listKnowledge(), listOutcomes()])
  const cards = tech.filter((c) => c.set === input.set && c.category === input.category)
  if (!cards.length) throw new Error('이 비교 세트에 기술 카드가 없음.')
  const cardText = cards
    .map((c) =>
      [
        `### ${c.name} [${c.status}]`,
        `원리: ${c.summary}`,
        `장점: ${c.pros}`,
        `단점: ${c.cons}`,
        `유리한 때: ${c.when}`,
        `피할 때: ${c.avoid}`,
        c.figures && `규격·수치: ${c.figures}`,
        c.defects && `흔한 하자: ${c.defects}`,
        `비교: ${COMPARE_KEYS.filter((k) => c.compare[k]).map((k) => `${k}=${c.compare[k]}`).join(', ')}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n')
  const know = knowledge
    .filter((e) => e.category === input.category && e.body && e.kind !== 'deviation')
    .slice(0, 30)
    .map((e) => `- ${e.title}: ${e.body}`)
    .join('\n')
  const past = outcomes
    .filter((o) => o.categories.includes(input.category))
    .slice(0, 20)
    .map((o) => `- ${RESULT_LABEL[o.result]}: ${o.reasons.join(', ')}${o.note ? ` / ${o.note}` : ''}`)
    .join('\n')
  const answers = Object.entries(input.checks)
    .filter(([, v]) => v && v !== 'ok')
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')
  const items = input.items.map((i) => `- (${i.kind}) ${i.name}${i.spec ? ` / ${i.spec}` : ''} / ${i.qty} ${i.unit}`).join('\n')
  const text = [
    `## 비교 세트: ${input.set}\n${cardText}`,
    know && `## 이 공종에 쌓인 회사 경험\n${know}`,
    past && `## 이 공종의 지난 수주·실주 이유\n${past}`,
    `## 이번 공종: ${input.sectionName}\n품목 (금액 제외):\n${items || '(아직 없음)'}`,
    `## 먼저 정할 것에 적은 답\n${answers || '(아직 없음)'}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const api = new Anthropic()
  const stream = api.beta.messages.stream({
    model: SUGGEST_MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium' },
    system: SYSTEM,
    messages: [{ role: 'user', content: `${text}\n\n이번 현장에 어느 방식이 왜 유리한지 제안해 줘.` }],
  })
  const msg = await stream.finalMessage()
  if (msg.stop_reason === 'refusal') throw new Error('Claude 가 이 요청에 답하지 않았음. 비교표를 보고 직접 고르면 됨.')
  const out = msg.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  if (!out) throw new Error('제안을 받지 못했음. 다시 시도해 주기 바람.')
  return out
}
