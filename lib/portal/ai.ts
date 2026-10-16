import Anthropic from '@anthropic-ai/sdk'
import { pool } from '@/lib/db'

/**
 * 일일 보고 'AI 정리': 현장 메모·공정·사진을 보고 고객(협력업체)이 읽을 보고문과 사진 설명을 만든다.
 * Anthropic API 키(ANTHROPIC_API_KEY)가 있을 때만 켜진다. Claude 구독(Pro·Max)은 웹사이트에서 쓸 수 없어
 * console.anthropic.com 에서 따로 API 키를 만들어 Vercel 환경변수에 넣어야 한다 (쓴 만큼 과금).
 */
export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY)

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5'
/** 한 번에 Claude 에게 보여 줄 사진 수 (요금·속도 때문에 제한) */
const MAX_IMAGES = 8

export type AiDraft = {
  summary: string
  workDone: string
  planNext: string
  issues: string
  captions: { photoId: number; caption: string }[]
}

export type AiInput = {
  clientName: string
  date: string
  weather: string
  crew: string
  workDone: string
  planNext: string
  issues: string
  tasks: { name: string; start: string; end: string; progress: number; today: boolean }[]
  photos: { id: number; caption: string; task: string }[]
}

const SYSTEM = `당신은 산업설비·공장 개보수 시공사 '엔엠솔루션'의 현장 보고 담당입니다.
현장 소장이 급하게 적은 메모와 현장 사진을 받아, 발주처(고객사) 담당자가 매일 읽는 '일일 공사 보고'로 정리합니다.

원칙
- 메모와 사진에 있는 사실만 씁니다. 수치·일정·인원·장비를 지어내지 않습니다. 모르는 것은 쓰지 않습니다.
- 고객이 읽기 쉬운 존댓말 보고체(~했습니다, ~예정입니다)로, 짧은 문장과 줄바꿈 목록(- )을 씁니다. 마크다운 제목·굵게는 쓰지 않습니다.
- 안전 관련 내용(TBM, 화기작업 허가, 화재감시 등)이 메모에 있으면 빠뜨리지 않습니다.
- 지연·문제·고객 협의가 필요한 사항은 숨기지 말고 issues 에 분명히 적습니다. 없으면 빈 문자열입니다.
- summary 는 오늘 하루를 3~6줄로 요약한 보고문입니다. 공정 진행률을 언급할 때는 주어진 숫자만 씁니다.
- captions: 사진마다 무엇을 하는 장면인지 한 문장(40자 안팎). 기존 설명이 있으면 다듬기만 하고 뜻을 바꾸지 않습니다.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'workDone', 'planNext', 'issues', 'captions'],
  properties: {
    summary: { type: 'string', description: '고객용 오늘의 보고 요약 (3~6줄)' },
    workDone: { type: 'string', description: '오늘 한 일, 줄마다 "- " 목록' },
    planNext: { type: 'string', description: '다음 작업일 계획, 줄마다 "- " 목록' },
    issues: { type: 'string', description: '특이사항·협의 필요 사항. 없으면 빈 문자열' },
    captions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['photoId', 'caption'],
        properties: { photoId: { type: 'integer' }, caption: { type: 'string' } },
      },
    },
  },
}

export async function aiDraft(input: AiInput): Promise<AiDraft> {
  if (!aiEnabled()) throw new Error('AI 정리를 쓰려면 ANTHROPIC_API_KEY 를 설정해야 합니다.')
  const client = new Anthropic()

  const shown = input.photos.slice(0, MAX_IMAGES)
  const images = shown.length
    ? (
        await pool.query<{ id: string; mime: string; data: Buffer }>(`SELECT id, mime, data FROM report_photos WHERE id = ANY($1::bigint[])`, [
          shown.map((p) => p.id),
        ])
      ).rows
    : []
  const imageById = new Map(images.map((r) => [Number(r.id), r]))

  const content: Anthropic.Beta.BetaContentBlockParam[] = []
  for (const p of shown) {
    const img = imageById.get(p.id)
    if (!img) continue
    content.push({ type: 'text', text: `사진 photoId=${p.id}${p.task ? ` (공정: ${p.task})` : ''}${p.caption ? ` 기존 설명: ${p.caption}` : ''}` })
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: img.mime as 'image/jpeg' | 'image/png' | 'image/webp', data: img.data.toString('base64') },
    })
  }
  const rest = input.photos.slice(MAX_IMAGES)
  const taskLines = input.tasks
    .map((t) => `- ${t.name} (${t.start}~${t.end}, 진행률 ${t.progress}%${t.today ? ', 오늘 예정' : ''})`)
    .join('\n')
  content.push({
    type: 'text',
    text: `현장: ${input.clientName}
보고일: ${input.date}
날씨: ${input.weather || '-'}
투입 인원·장비: ${input.crew || '-'}

공정표
${taskLines || '(공정표 없음)'}

소장 메모: 오늘 한 일
${input.workDone || '-'}

소장 메모: 다음 계획
${input.planNext || '-'}

소장 메모: 특이사항
${input.issues || '-'}
${rest.length ? `\n이미지 없이 설명만 있는 사진\n${rest.map((p) => `- photoId=${p.id}: ${p.caption || '(설명 없음)'}`).join('\n')}` : ''}

위 내용을 일일 공사 보고로 정리해 주세요. captions 에는 위 사진 photoId 전부를 넣어 주세요.`,
  })

  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 8000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content }],
  })
  if (res.stop_reason === 'refusal') throw new Error('AI 가 이 내용을 정리하지 못했습니다. 메모를 조금 바꿔 다시 해 주세요.')
  if (res.stop_reason === 'max_tokens') throw new Error('AI 응답이 너무 길어 끊겼습니다. 다시 해 주세요.')
  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
  const out = JSON.parse(text) as AiDraft
  const ids = new Set(input.photos.map((p) => p.id))
  return {
    summary: String(out.summary ?? ''),
    workDone: String(out.workDone ?? ''),
    planNext: String(out.planNext ?? ''),
    issues: String(out.issues ?? ''),
    captions: (out.captions ?? []).filter((c) => ids.has(Number(c.photoId))).map((c) => ({ photoId: Number(c.photoId), caption: String(c.caption ?? '') })),
  }
}
