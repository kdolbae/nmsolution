import Anthropic from '@anthropic-ai/sdk'
import categories from './work-categories.json'
import { ITEM_KINDS, emptyQuote, type Quote, type QuoteItem, type QuoteSection, newId } from '@/lib/clients/quote'
import { INDIRECT_LABOR_PCT, STANDARD_EXPENSE, STANDARD_RATES, TRADES, findSimilar, refreshIndirect, type QuoteCase } from '@/lib/clients/quote-cases'
import type { Intake, IntakeAnalysis, IntakeDraft, IntakeFile, IntakeMessage } from './table'

/**
 * AI 견적 접수의 Claude 호출. 세 가지 일을 한다.
 *  analyze: 자료·설명을 읽고 공사 유형·방향·현황 요약과 견적에 필요한 질문을 만든다.
 *  answer : 견적자의 답을 받아 사실을 쌓고 남은 질문을 다시 낸다.
 *  draft  : 모인 사실로 제안서 내용과 견적서(공종·줄)를 만든다. 단가는 회사 기준·지난 사례 값.
 * ANTHROPIC_API_KEY 가 있어야 한다. 모델·호출 방식은 app/api/admin/takeoff/read 와 같다.
 */

export const MODEL = 'claude-opus-5-5'
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
type ImageType = (typeof IMAGE_TYPES)[number]
/** 한 번에 보내는 사진 수 (모델 한도 100장 안쪽, 토큰 절약) */
const MAX_IMAGES = 40

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')

function categoryGuide() {
  const items = categories.items as { code: string; name: string; division: string; group: string; consider?: string[]; ask?: string[]; crew?: string[]; equip?: string[]; materials?: string[]; status?: string }[]
  return items
    .map((i) => {
      const line = (k: string, v?: string[]) => (v?.length ? `\n  ${k}: ${v.join(' / ')}` : '')
      return `- ${i.code} ${i.name} [${i.division} > ${i.group}]${line('확인 질문', i.ask)}${line('고려', i.consider)}${line('인력', i.crew)}${line('장비', i.equip)}${line('자재', i.materials)}`
    })
    .join('\n')
}

function rulesGuide() {
  return (categories.rules as { id: string; when: string; add: string }[]).map((r) => `- ${r.id}: ${r.when} → ${r.add}`).join('\n')
}

function tradeGuide() {
  return TRADES.filter((t) => t.key !== 'indirect')
    .map((t) => `- ${t.label}: ${t.price ? `${won(t.price)}원/인·일` : '기준 없음(사례 값)'}${t.settled ? '' : ' (임시)'}`)
    .join('\n')
}

function casesGuide(cases: QuoteCase[], request: string) {
  return findSimilar(request, cases)
    .slice(0, 4)
    .map(({ c, pattern: p }) => {
      const secs = c.quote.sections
        .map((s) => `    · ${s.name}${s.option ? '(선택)' : ''}: ${s.items.map((i) => `${i.name} ${i.qty}${i.unit}×${won(i.price)}`).join(', ')}`)
        .join('\n')
      return `- ${c.clientName} 「${c.quote.title}」 공급가액 ${won(p.supply)} / 기간 ${p.days ?? '-'}일 / 종류 ${p.tags.join('·')}\n  인력: ${p.crew.map((x) => `${x.label} ${x.manDays}인·일`).join(', ')}\n  공종·줄:\n${secs}`
    })
    .join('\n')
}

function system(cases: QuoteCase[], request: string) {
  return `너는 엔엠솔루션(공장 개보수·설비 공사) 견적 담당자다. 현장 자료(사진·문서)와 견적자의 설명을 읽고, 공사 유형과 방향을 잡고, 견적에 꼭 필요한 것만 묻고, 제안서와 견적서 초안을 만든다.

말투
- 모든 글은 "~함" 체로 짧고 담백하게. 인사·군더더기 없음.
- 질문은 한 번에 3~5개, 현장에서 바로 답할 수 있는 것부터. 이미 자료에서 읽을 수 있는 건 묻지 않음. 번호 없이 한 문장씩.
- 사실이 아닌 추정은 "추정"이라고 밝힘. 확인하지 않은 기술 수치(정격하중·작업반경·지반 등)는 단정하지 않음.

견적 원칙 (회사 기준)
- 모든 견적은 공종별로 재료비·노무비·경비(장비·운반·안전시설 포함) 줄을 적고, 노무비는 직종 × 인·일 × 일당. 견적 인원은 실제 투입 인원만.
- 노무비 안에 '간접노무비' 줄을 하나 넣음 (직접노무비 × ${INDIRECT_LABOR_PCT}%, 단위 식, 수량 1). 금액은 시스템이 다시 계산하니 0 으로 둬도 됨.
- 현장 경비 = 투입 인·일 × ${won(STANDARD_EXPENSE)}원 (품명 '현장 경비', 단위 인·일).
- 제비율: 산재 ${STANDARD_RATES.injury}%·고용 ${STANDARD_RATES.employment}%·안전관리비 ${STANDARD_RATES.safety}%·일반관리비 ${STANDARD_RATES.overhead}%·이윤 ${STANDARD_RATES.profit}% 는 시스템이 붙임. 줄로 넣지 않음.
- 강재는 kg 당 1,300원. 자재는 적산량 + 여유(철골·지붕 10%), 부자재·손실은 1식 또는 3%.
- 팀장급(현장 관리자) 1명은 공기 전체로 넣는 것이 기본.
- 상황에 따라 빠질 수 있는 줄은 deduct 표시(견적서 끝 감액 표), 고객이 고르는 대안은 별도 공종에 option 표시.
- 숫자가 딱 떨어지지 않게 수량·단가로 잡음.

직종 일당 기준
${tradeGuide()}

자동 규칙
${rulesGuide()}

현장 변수 (해당되면 질문·특기사항에 반영)
${(categories.variables as string[]).map((v) => `- ${v}`).join('\n')}

고객용 문서 규칙
${(categories.docRules as string[]).map((v) => `- ${v}`).join('\n')}

공사 카테고리 (소분류 코드로 고름. 여러 개 가능)
${categoryGuide()}

비슷한 지난 견적 (공종 구성·줄 이름·단가의 기준. 수량·인원은 이번 현장에 맞게)
${casesGuide(cases, request) || '- 없음'}`
}

type Loaded = IntakeFile & { data: Buffer }

function fileBlocks(files: Loaded[]): Anthropic.Beta.BetaContentBlockParam[] {
  const out: Anthropic.Beta.BetaContentBlockParam[] = []
  let images = 0
  files.forEach((f, idx) => {
    const label = `자료 ${idx + 1} (id ${f.id}${f.caption ? `, 설명: ${f.caption}` : ''}, 파일 ${f.name})`
    if ((IMAGE_TYPES as readonly string[]).includes(f.mime)) {
      if (images >= MAX_IMAGES) return
      images++
      out.push({ type: 'text', text: label })
      out.push({ type: 'image', source: { type: 'base64', media_type: f.mime as ImageType, data: f.data.toString('base64') } })
    } else if (f.mime === 'application/pdf') {
      out.push({ type: 'text', text: label })
      out.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.data.toString('base64') } })
    } else if (f.mime.startsWith('text/')) {
      out.push({ type: 'text', text: `${label}\n${f.data.toString('utf8').slice(0, 20000)}` })
    }
  })
  return out
}

function intro(intake: Intake, files: Loaded[]): Anthropic.Beta.BetaContentBlockParam[] {
  return [
    ...fileBlocks(files),
    {
      type: 'text',
      text: `공사명(가제): ${intake.title || '(없음)'}\n견적자 설명:\n${intake.description || '(없음)'}\n\n자료 ${files.length}건.`,
    },
  ]
}

/** 지금까지의 대화를 Claude 메시지로. 첫 user 메시지에 자료가 들어간다 */
function history(intake: Intake, files: Loaded[], tail?: string): Anthropic.Beta.BetaMessageParam[] {
  const msgs: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: intro(intake, files) }]
  if (intake.analysis) msgs.push({ role: 'assistant', content: JSON.stringify(intake.analysis) })
  for (const m of intake.messages) msgs.push({ role: m.role, content: m.text })
  if (tail) msgs.push({ role: 'user', content: tail })
  // 같은 역할이 연달아 오면 합친다
  const merged: Anthropic.Beta.BetaMessageParam[] = []
  for (const m of msgs) {
    const last = merged.at(-1)
    if (last && last.role === m.role && typeof last.content === 'string' && typeof m.content === 'string') last.content = `${last.content}\n\n${m.content}`
    else merged.push({ ...m })
  }
  if (merged.at(-1)?.role !== 'user') merged.push({ role: 'user', content: '계속해 줘.' })
  return merged
}

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'types', 'direction', 'summary', 'facts', 'questions', 'ready'],
  properties: {
    reply: { type: 'string', description: '견적자에게 보여 줄 말. 이번에 파악한 것과 질문을 ~함 체로. 질문은 한 줄에 하나' },
    types: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['code', 'name', 'why'], properties: { code: { type: 'string' }, name: { type: 'string' }, why: { type: 'string' } } },
    },
    direction: { type: 'string', description: '공사 방향·추천 공법 한 단락' },
    summary: { type: 'string', description: '자료에서 읽은 현황 요약' },
    facts: { type: 'array', items: { type: 'string' }, description: '지금까지 확정된 사실. 답을 받으면 여기에 쌓음' },
    questions: { type: 'array', items: { type: 'string' }, description: '아직 답 못 받은 질문 (답할 수 있는 순서)' },
    ready: { type: 'boolean', description: '초안을 만들어도 될 만큼 사실이 모였는지' },
  },
}

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['proposal', 'quote', 'checks'],
  properties: {
    proposal: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'oneLine', 'current', 'direction', 'scope', 'steps', 'period', 'excluded', 'photoIds'],
      properties: {
        title: { type: 'string', description: '공사명' },
        oneLine: { type: 'string', description: '제안 한 줄 요약' },
        current: { type: 'string', description: '현황과 문제점 (고객이 수긍할 문구만)' },
        direction: { type: 'string', description: '제안 방향·공법' },
        scope: { type: 'array', items: { type: 'string' }, description: '작업 범위 항목' },
        steps: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['title', 'text'], properties: { title: { type: 'string' }, text: { type: 'string' } } }, description: '작업 순서' },
        period: { type: 'string', description: '공사 기간 (작업일 N일, 구성)' },
        excluded: { type: 'array', items: { type: 'string' }, description: '제외 사항' },
        photoIds: { type: 'array', items: { type: 'integer' }, description: '제안서 현황에 넣을 사진 id (자료 id), 많아도 8장' },
      },
    },
    quote: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'sections', 'notes'],
      properties: {
        title: { type: 'string' },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'desc', 'option', 'items'],
            properties: {
              name: { type: 'string' },
              desc: { type: 'string', description: '공종 한 줄 설명 (범위·일수)' },
              option: { type: 'boolean', description: '선택 항목(견적금액 별도)' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['kind', 'name', 'spec', 'unit', 'qty', 'price', 'note', 'deduct'],
                  properties: {
                    kind: { type: 'string', enum: [...ITEM_KINDS] },
                    name: { type: 'string' },
                    spec: { type: 'string' },
                    unit: { type: 'string' },
                    qty: { type: 'number' },
                    price: { type: 'number' },
                    note: { type: 'string', description: '산출 근거 (예: 2명 × 3일)' },
                    deduct: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
        notes: { type: 'array', items: { type: 'string' }, description: '특기사항: 공사 기간, 결제 조건, 포함·제외' },
      },
    },
    checks: { type: 'array', items: { type: 'string' }, description: '견적자가 저장 전 확인할 점 (추정한 수량·단가 등)' },
  },
}

type AnalysisOut = IntakeAnalysis & { reply: string }
type DraftOut = {
  proposal: IntakeDraft['proposal']
  quote: { title: string; sections: { name: string; desc: string; option: boolean; items: Omit<QuoteItem, 'id'>[] }[]; notes: string[] }
  checks: string[]
}

async function call<T>(sys: string, messages: Anthropic.Beta.BetaMessageParam[], schema: Record<string, unknown>, maxTokens: number): Promise<T> {
  const client = new Anthropic()
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high', format: { type: 'json_schema', schema } },
    system: sys,
    messages,
  })
  const msg = await stream.finalMessage()
  if (msg.stop_reason === 'refusal') throw new AiError('이 자료는 처리하지 못했습니다. 다른 자료로 다시 시도해 주세요.', 422)
  if (msg.stop_reason === 'max_tokens') throw new AiError('결과가 너무 길어 잘렸습니다. 자료를 나눠서 올려 주세요.', 422)
  const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
  return JSON.parse(text) as T
}

export class AiError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message)
  }
}

const now = () => new Date().toISOString()

/** 분석 또는 답변 처리. 분석 결과와 대화를 돌려준다 */
export async function analyzeOrAnswer(intake: Intake, files: Loaded[], cases: QuoteCase[], answer?: string): Promise<{ analysis: IntakeAnalysis; messages: IntakeMessage[] }> {
  const request = `${intake.title} ${intake.description}`
  const ask = answer
    ? `견적자 답변:\n${answer}\n\n답을 facts 에 반영하고, 남은 질문만 다시 적어 줘. 더 물을 게 없으면 ready 를 true 로.`
    : '자료와 설명을 읽고 공사 유형(소분류 코드)·방향·현황을 정리하고, 견적에 꼭 필요한 질문을 적어 줘.'
  const out = await call<AnalysisOut>(system(cases, request), history(intake, files, ask), ANALYSIS_SCHEMA, 8000)
  const { reply, ...analysis } = out
  const messages = [...intake.messages]
  if (answer) messages.push({ role: 'user', text: answer, at: now() })
  messages.push({ role: 'assistant', text: reply, at: now() })
  return { analysis, messages }
}

/** 제안서 내용 + 견적서 초안 */
export async function makeDraft(intake: Intake, files: Loaded[], cases: QuoteCase[]): Promise<IntakeDraft> {
  const request = `${intake.title} ${intake.description} ${intake.analysis?.types.map((t) => t.name).join(' ') ?? ''}`
  const ask =
    '지금까지의 사실로 제안서 내용과 견적서를 만들어 줘. 견적서는 공종별로 재료비·노무비(직종 × 인·일, 간접노무비 줄 포함)·경비(현장 경비·장비·운반·안전시설) 줄을 적고, 단가는 회사 기준과 비슷한 지난 견적 값을 쓰며, 추정한 값은 checks 에 적어 줘.'
  const out = await call<DraftOut>(system(cases, request), history(intake, files, ask), DRAFT_SCHEMA, 24000)
  const ids = new Set(files.map((f) => f.id))
  const base = emptyQuote()
  const sections: QuoteSection[] = out.quote.sections.map((s) => {
    const items: QuoteItem[] = s.items.map((i) => ({
      id: newId('i'),
      kind: (ITEM_KINDS as readonly string[]).includes(i.kind) ? i.kind : '경비',
      name: i.name,
      spec: i.spec,
      unit: i.unit,
      qty: Number(i.qty) || 0,
      price: Math.round(Number(i.price) || 0),
      note: i.note,
      deduct: Boolean(i.deduct),
    }))
    return refreshIndirect({ id: newId('s'), name: s.name, desc: s.desc, option: Boolean(s.option), items })
  })
  const quote: Quote = {
    ...base,
    title: out.quote.title || out.proposal.title,
    sections,
    costCalc: true,
    rates: { ...STANDARD_RATES },
    notes: out.quote.notes.join('\n'),
  }
  return {
    proposal: { ...out.proposal, photoIds: out.proposal.photoIds.filter((id) => ids.has(id)).slice(0, 8) },
    quote,
    checks: out.checks,
    madeAt: now(),
  }
}

