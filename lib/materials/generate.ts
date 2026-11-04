import Anthropic from '@anthropic-ai/sdk'
import { getClient } from '@/lib/clients/table'
import { proposalText, quoteText } from '@/lib/work-orders/generate'
import { MATERIAL_GROUPS, newMaterialId, normalizeMaterials, type MaterialItem } from './shared'

/**
 * 부자재 보강 (Claude): 견적 품목·작업제안서·지금 리스트를 보고, 시공에 실제로 필요한데 리스트에 없는 자재·부자재·소모품을 수량과 함께 더한다.
 * 견적에 있는 주자재는 다시 만들지 않는다. 금액은 안 다룬다.
 */
export const MATERIALS_MODEL = 'claude-opus-5-5'

const SYSTEM = `너는 엔엠솔루션(공장·건물 개보수 시공사)의 자재 담당이다. 현장 자료를 보고 시공에 실제로 필요한 자재·부자재·소모품 중 지금 리스트에 빠진 것을 찾아 수량과 함께 더한다.

규칙
- 이미 리스트에 있는 품목(이름이 같거나 같은 뜻)은 다시 넣지 않는다. 수량이 모자라 보이면 note 에 "리스트 수량 n → 권장 m" 식으로만 적는다.
- 수량은 자료의 치수·수량에서 계산해 여유 10~20% 를 더한다. 계산 근거를 note 에 짧게 적는다(예: "지붕 판넬 14장 × 8개 + 여유").
- 고정 철물(앵커·피스·리벳·볼트), 방수·충진(실리콘·폼·테이프), 연결 부속(엘보·소켓·브래킷), 마감 부속(캡·런너·코너), 소모품(절단 디스크·비트·방청 스프레이·마스킹), 보호구는 빠지기 쉬우니 꼭 검토한다.
- group 은 주어진 값 중 하나. supplier 는 어디서 사는지(판넬 공장, 절곡 공장, 철물점, 배관 자재상, 온라인 등).
- 자료에 없는 공법을 지어내지 않는다. 확실하지 않으면 note 에 "확인 필요"를 적는다.
- 금액·단가는 쓰지 않는다. 다 찾으면 save_materials 도구로 한 번만 저장한다.`

const SAVE_TOOL = {
  name: 'save_materials',
  description: '리스트에 더할 자재·부자재를 저장한다. 다 찾은 뒤 한 번만 부른다.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['group', 'name', 'spec', 'qty', 'unit', 'supplier', 'note'],
          properties: {
            group: { type: 'string', enum: [...MATERIAL_GROUPS] },
            name: { type: 'string' },
            spec: { type: 'string', description: '규격 (예: M12×100, L150 육각 와셔, 300ml)' },
            qty: { type: 'number' },
            unit: { type: 'string', description: '개·박스·롤·m·본·세트' },
            supplier: { type: 'string' },
            note: { type: 'string', description: '산출 근거·용도·확인 필요' },
          },
        },
      },
    },
  },
} as unknown as Anthropic.Beta.BetaTool

export async function suggestMaterials(clientId: number, current: MaterialItem[], hint: string): Promise<{ items: MaterialItem[]; model: string }> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY 가 없어 부자재를 찾을 수 없습니다.')
  const client = await getClient(clientId)
  if (!client) throw new Error('업체를 찾지 못했습니다.')
  const listText = current.length
    ? current.map((it) => `- [${it.group}] ${it.name}${it.spec ? ` ${it.spec}` : ''} / ${it.qty} ${it.unit}${it.note ? ` / ${it.note}` : ''}`).join('\n')
    : '(비어 있음)'
  const text = [
    `## 업체·현장\n${client.name} / ${client.siteAddress || '(주소 없음)'}`,
    `## 견적 품목 (금액 제외)\n${quoteText(client)}`,
    `## 작업제안서 본문\n${proposalText(client.proposalHtml, 16000) || '(없음)'}`,
    `## 지금 자재 리스트\n${listText}`,
    hint.trim() && `## 관리자 메모\n${hint.trim()}`,
  ]
    .filter(Boolean)
    .join('\n\n')
  const api = new Anthropic()
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: `${text}\n\n빠진 자재·부자재·소모품을 찾아 save_materials 로 저장해 줘.` }]
  for (let turn = 0; turn < 3; turn++) {
    const msg = await api.beta.messages
      .stream({
        model: MATERIALS_MODEL,
        max_tokens: 12000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        system: SYSTEM,
        tools: [SAVE_TOOL],
        tool_choice: { type: 'auto' },
        messages,
      })
      .finalMessage()
    const saved = msg.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use' && b.name === 'save_materials')
    if (saved) {
      const raw = (saved.input as { items: unknown[] }).items ?? []
      const items = normalizeMaterials(raw.map((x) => ({ ...(x as object), id: newMaterialId(), source: 'ai', bought: false })))
      return { items, model: msg.model }
    }
    if (msg.stop_reason === 'max_tokens') throw new Error('결과가 너무 길어 잘렸음. 다시 시도해 주기 바람.')
    messages.push({ role: 'assistant', content: msg.content })
    messages.push({ role: 'user', content: '찾은 내용을 save_materials 도구로 저장해 줘.' })
  }
  throw new Error('부자재를 찾지 못했음. 다시 시도해 주기 바람.')
}
