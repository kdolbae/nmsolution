import Anthropic from '@anthropic-ai/sdk'
import { getClient, type ClientRow } from '@/lib/clients/table'
import { getSchedule } from '@/lib/clients/schedule'
import { listCards } from '@/lib/clients/cards'
import { listWorkOrders, getWorkOrder } from './table'

/**
 * 업무 지시서 초안 생성 (Claude). 입력은 이 견적서 행(프로젝트)에 있는 자료 전부:
 * 업체·현장, 견적 품목(수량·규격만, 금액 없음), 작업제안서 본문(글만), 공정표, 내부 메모, 관리자가 적은 현장 메모, 직전 지시서.
 * 출력은 Markdown 한 벌(save_work_order 도구). 금액·원가·공급처 단가는 넣지 않게 하고, 자료에 없는 기술 수치는 "확인 필요"로 남기게 한다.
 * ANTHROPIC_API_KEY 가 있어야 돈다(업체 프로필 조사와 같음).
 */

export const WORK_ORDER_MODEL = 'claude-opus-5-5'

const SYSTEM = `너는 엔엠솔루션(NM SOLUTION, 공장·건물 개보수 시공사)의 현장 소장이다. 주어진 현장 자료만 근거로 시공 팀장·기능공이 휴대폰으로 보고 그대로 일할 수 있는 "현장 업무 지시서"를 Markdown 으로 쓴다.

구성(이 순서, 제목은 ## 로, 없는 자료는 "확인 필요"로 적고 빼지 않는다)
# 업무 지시서 — <공사명>
## 1. 공사 개요: 현장 주소, 발주처·연락처, 공사 기간, 범위 한 줄, 제외 항목, 핵심 치수·규격(길이·폭·높이·단차·색상)
## 2. 일정표: | 일자 | 작업 | 인원 | 반입 자재 | 완료 기준 | 표. 전날 준비(발주 납기·차량·장비)
## 3. 작업 순서: 공정마다 ### 제목, 그 아래 "할 일 / 치수·고정 방법(간격·피스·겹침·구배) / 자재 / 도구·장비 / 확인·사진 / 주의" 를 목록으로
## 4. 자재·수량표: | 공종 | 품목 | 규격 | 수량 | 단위 | 반입 | 확인 | 표 (견적 품목을 빠짐없이, 노무·경비 줄은 제외)
## 5. 인력·장비: 직종·인원·일수, 장비·차량
## 6. 안전·현장 규칙: 위험 요소별 대책, 보호구, 작업 전 점검(TBM), 영업 중 현장 배려(소음 시간·통행·청소)
## 7. 품질·검사 기준: 검사 항목(누수·구배·수평수직·마감·개폐), 인계 사진 목록
## 8. 고객 응대: 현장 연락처, 전기·용수 협조, 변경 요청 시 처리(서면 합의 후 별도 견적), 잔금 조건(금액은 쓰지 않음)
## 9. 확인 필요·미결: | 항목 | 담당 | 표
## 10. 첨부: 도면·사진·견적서·발주서 이름

규칙
- 문체는 "~함/~할 것" 개조식. 한 줄에 한 지시. 숫자는 단위를 붙인다(mm, m, 개, 인·일).
- 금액·단가·원가·할인·공급처 단가는 절대 쓰지 않는다. 자재는 규격·수량만.
- 자료에 없는 기술 수치(앵커 간격·피스 규격·두께 등)는 지어내지 말고 "확인 필요"로 적고 9장 표에도 넣는다. 자료에 있는 수치는 그대로 옮긴다.
- 내부 메모에 있는 매입가·원가·업체 평가는 지시서에 옮기지 않는다.
- 작업제안서에 적힌 공법·순서·치수가 견적 품목보다 우선한다. 둘이 다르면 9장에 적는다.
- 링크·HTML 태그를 넣지 않는다. 표는 | 로만 만든다.
- 길이는 A4 3~6쪽 분량. 다 쓰면 save_work_order 도구로 한 번만 저장한다.`

const SAVE_TOOL = {
  name: 'save_work_order',
  description: '완성한 업무 지시서를 저장한다. 다 쓴 뒤 한 번만 부른다.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'markdown'],
    properties: {
      title: { type: 'string', description: '지시서 제목 (공사명, 20자 안팎)' },
      markdown: { type: 'string', description: '업무 지시서 본문 전체 (Markdown)' },
    },
  },
} as unknown as Anthropic.Beta.BetaTool

/** 제안서 HTML 에서 글만 남긴다(스크립트·스타일 제거, 제목은 줄 바꿈) */
export function proposalText(html: string, limit = 24000): string {
  const t = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(h[1-6]|p|li|tr|div|section|article|br|figcaption|caption)[^>]*>/gi, '\n')
    .replace(/<(td|th)[^>]*>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
  return t.length > limit ? t.slice(0, limit) + '\n…(이하 생략)' : t
}

/** 견적 품목을 금액 없이 글로 */
export function quoteText(client: ClientRow): string {
  const q = client.quote
  const lines = [`견적번호 ${q.number} · 견적일 ${q.date} · 제목 ${q.title}`]
  for (const s of q.sections) {
    lines.push(`[공종] ${s.name}${s.option ? ' (선택 항목)' : ''}${s.desc ? ` — ${s.desc}` : ''}`)
    for (const it of s.items) {
      lines.push(`- (${it.kind}) ${it.name}${it.spec ? ` / ${it.spec}` : ''} / ${it.qty} ${it.unit}${it.note ? ` / 비고: ${it.note}` : ''}`)
    }
  }
  if (q.notes.trim()) lines.push(`특기사항:\n${q.notes.trim()}`)
  return lines.join('\n')
}

export async function buildInputs(clientId: number, siteNote: string, baseNo?: number): Promise<{ client: ClientRow; text: string }> {
  const client = await getClient(clientId)
  if (!client) throw new Error('업체를 찾지 못했습니다.')
  const [schedule, cards, base] = await Promise.all([
    getSchedule(clientId),
    listCards(client.parentId ?? client.id).catch(() => []),
    baseNo ? getWorkOrder(clientId, baseNo) : Promise.resolve(null),
  ])
  const contacts = cards
    .map((c) => c.contact && [c.contact.name, c.contact.title, c.contact.phone].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(', ')
  const steps = schedule.steps.length
    ? schedule.steps.map((s) => `- ${s.name}${s.start ? ` ${s.start}${s.end && s.end !== s.start ? `~${s.end}` : ''}` : ''}${s.crew ? ` / 인원·장비 ${s.crew}` : ''}${s.note ? ` / ${s.note}` : ''}`).join('\n')
    : '(공정표 없음 — 견적·제안서에서 일정을 잡고 확인 필요로 표시)'
  const parts = [
    `## 업체·현장\n업체: ${client.name}${client.contactPerson ? ` / 담당 ${client.contactPerson}` : ''}${client.phone ? ` / ${client.phone}` : ''}\n현장: ${client.siteAddress || '(주소 확인 필요)'}${contacts ? `\n명함 담당자: ${contacts}` : ''}`,
    `## 견적 품목 (금액 제외)\n${quoteText(client)}`,
    `## 작업제안서 본문\n${proposalText(client.proposalHtml) || '(제안서 없음)'}`,
    `## 공정표\n${steps}`,
    client.memo.trim() && `## 내부 메모 (원가·매입가는 지시서에 옮기지 않음)\n${client.memo.trim().slice(0, 6000)}`,
    siteNote.trim() && `## 관리자 현장 메모 (가장 최신, 다른 자료보다 우선)\n${siteNote.trim()}`,
    base && `## 직전 업무 지시서 ${base.number} (이걸 바탕으로 고쳐 쓴다)\n${base.markdown.slice(0, 30000)}`,
  ].filter(Boolean)
  return { client, text: parts.join('\n\n') }
}

/** Claude 로 초안을 만든다. 결과는 {title, markdown} */
export async function generateWorkOrder(clientId: number, siteNote: string, baseNo?: number): Promise<{ title: string; markdown: string; model: string }> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY 가 없어 업무 지시서를 만들 수 없습니다.')
  const { text } = await buildInputs(clientId, siteNote, baseNo)
  const api = new Anthropic()
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: 'user', content: `${text}\n\n위 자료로 현장 업무 지시서를 만들어 save_work_order 로 저장해 줘.` },
  ]
  for (let turn = 0; turn < 3; turn++) {
    const stream = api.beta.messages.stream({
      model: WORK_ORDER_MODEL,
      max_tokens: 24000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium' },
      system: SYSTEM,
      tools: [SAVE_TOOL],
      tool_choice: { type: 'auto' },
      messages,
    })
    const msg = await stream.finalMessage()
    const saved = msg.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use' && b.name === 'save_work_order')
    if (saved) {
      const input = saved.input as { title: string; markdown: string }
      return { title: String(input.title ?? '').trim(), markdown: String(input.markdown ?? '').trim(), model: msg.model }
    }
    if (msg.stop_reason === 'max_tokens') throw new Error('지시서가 너무 길어 잘렸음. 현장 메모를 줄여 다시 시도해 주기 바람.')
    messages.push({ role: 'assistant', content: msg.content })
    messages.push({ role: 'user', content: '쓴 내용을 save_work_order 도구로 저장해 줘.' })
  }
  throw new Error('업무 지시서를 만들지 못했음. 다시 시도해 주기 바람.')
}

export { listWorkOrders }
