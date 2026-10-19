import Anthropic from '@anthropic-ai/sdk'
import { getSessionFrom, isAdmin } from '@/lib/admin'
import { getTakeoffTemplates } from '@/lib/clients/takeoff-templates'
import type { DrawingResult, TakeoffTemplate } from '@/lib/clients/takeoff'

/**
 * 도면 읽기: 도면 이미지·PDF를 Claude에 보내 적산 템플릿별 측정값을 받는다.
 * 요청: multipart (file, hint). 응답: DrawingResult JSON 또는 { error }.
 * ANTHROPIC_API_KEY 가 있어야 한다.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MODEL = 'claude-opus-5-5'
/** Vercel 함수 본문 한도(4.5MB) 안쪽 */
const MAX_BYTES = 4 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

function templateGuide(templates: TakeoffTemplate[]) {
  return templates
    .map((t) => {
      const inputs = t.vars
        .filter((v) => !v.expr)
        .map((v) => `    - ${v.key}: ${v.label}${v.unit ? ` (${v.unit})` : ''}, 기본값 ${v.value}`)
        .join('\n')
      return `- id: ${t.id}\n  이름: ${t.name}\n  용도: ${t.desc || '-'}\n  측정값:\n${inputs}`
    })
    .join('\n')
}

const SYSTEM = `너는 건축·설비 공사 적산 담당자다. 도면(평면도, 입면도, 스케치, 사진)을 읽고 적산 템플릿에 넣을 측정값을 뽑는다.

규칙
- 도면에 적힌 치수를 우선한다. 축척으로 잰 값이나 추정한 값은 basis 에 "추정"이라고 밝힌다.
- 단위는 템플릿에 적힌 단위(m, ㎡, 개)로 바꾼다. mm 표기는 m 로 환산한다.
- 공사 범위에 맞는 템플릿만 고른다. 같은 템플릿을 여러 번 쓸 수 있다 (예: 실마다 등기구 블록 하나).
- values 에는 그 템플릿의 측정값 key 만 넣는다. 도면에서 알 수 없는 값은 빼서 기본값이 쓰이게 한다.
- name 은 블록 이름이다 (예: "사무실 A 등기구", "신규 칸막이 벽").
- basis 에는 값의 근거를 한두 문장으로 적는다 (어느 치수를 더했는지 등).
- notes 에는 현장에서 확인해야 할 점을 짧게 적는다. 없으면 빈 배열.
- 문체는 "~함" 체로 담백하게 쓴다.`

function schema(ids: string[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['blocks', 'notes'],
    properties: {
      blocks: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['template', 'name', 'values', 'basis'],
          properties: {
            template: { type: 'string', enum: ids },
            name: { type: 'string' },
            values: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['key', 'value'],
                properties: { key: { type: 'string' }, value: { type: 'number' } },
              },
            },
            basis: { type: 'string' },
          },
        },
      },
      notes: { type: 'array', items: { type: 'string' } },
    },
  }
}

export async function POST(req: Request) {
  const session = await getSessionFrom(req.headers)
  if (!session?.user || !isAdmin(session.user)) return json({ error: '로그인이 필요합니다.' }, 401)
  if (!process.env.ANTHROPIC_API_KEY) return json({ error: '도면 읽기를 쓰려면 Vercel 환경변수 ANTHROPIC_API_KEY 가 필요합니다.' }, 503)

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return json({ error: '도면 파일이 없습니다.' }, 400)
  if (file.size > MAX_BYTES) return json({ error: '파일이 4MB를 넘습니다. 이미지는 줄여서, PDF는 필요한 쪽만 올려 주세요.' }, 413)
  const hint = String(form?.get('hint') ?? '').slice(0, 2000)

  const data = Buffer.from(await file.arrayBuffer()).toString('base64')
  let source: Anthropic.Beta.BetaContentBlockParam
  if (file.type === 'application/pdf') source = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
  else if ((IMAGE_TYPES as readonly string[]).includes(file.type))
    source = { type: 'image', source: { type: 'base64', media_type: file.type as (typeof IMAGE_TYPES)[number], data } }
  else return json({ error: 'JPG, PNG, WEBP, GIF 이미지나 PDF만 읽을 수 있습니다.' }, 415)

  const templates = await getTakeoffTemplates()
  const client = new Anthropic()
  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'high', format: { type: 'json_schema', schema: schema(templates.map((t) => t.id)) } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            source,
            {
              type: 'text',
              text: `적산 템플릿 목록:\n${templateGuide(templates)}\n\n${hint ? `작성자 메모: ${hint}\n\n` : ''}이 도면에서 공사 범위에 맞는 템플릿을 골라 측정값을 채워 줘.`,
            },
          ],
        },
      ],
    })
    const msg = await stream.finalMessage()
    if (msg.stop_reason === 'refusal') return json({ error: '이 도면은 읽지 못했습니다. 다른 파일로 다시 시도해 주세요.' }, 422)
    if (msg.stop_reason === 'max_tokens') return json({ error: '도면이 너무 커서 결과가 잘렸습니다. 범위를 나눠서 올려 주세요.' }, 422)
    const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
    const result = JSON.parse(text) as DrawingResult
    return json(result)
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: '요청이 많아 잠시 뒤 다시 시도해야 합니다.' }, 429)
    if (e instanceof Anthropic.AuthenticationError) return json({ error: 'ANTHROPIC_API_KEY 가 올바르지 않습니다.' }, 503)
    if (e instanceof Anthropic.APIError) return json({ error: `도면 읽기 실패 (${e.status ?? '연결'}): ${e.message}` }, 502)
    if (e instanceof SyntaxError) return json({ error: '결과를 해석하지 못했습니다. 다시 시도해 주세요.' }, 502)
    throw e
  }
}
