import type { Quote } from '@/lib/clients/quote'

/** 자재 리스트 형식 (어드민 화면·서버 공용, DB 없음). 저장은 lib/materials/table.ts */

export const MATERIAL_GROUPS = ['주자재', '절곡', '철물·앵커', '피스·리벳', '방수·충진', '배관·배수', '소모품', '기타'] as const
export type MaterialGroup = (typeof MATERIAL_GROUPS)[number]

export type MaterialSource = 'quote' | 'ai' | 'manual'

export type MaterialItem = {
  id: string
  group: MaterialGroup
  name: string
  spec: string
  qty: number
  unit: string
  /** 어디서 사는지 (판넬 공장, 절곡 공장, 철물점, 온라인 …) */
  supplier: string
  note: string
  source: MaterialSource
  /** 구매·발주 끝 */
  bought: boolean
}

export type MaterialList = {
  items: MaterialItem[]
  updatedAt: string | null
  updatedBy: string
}

export const newMaterialId = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** 품명으로 묶음을 짐작한다 (견적 품목을 가져올 때) */
export function guessGroup(name: string, spec = ''): MaterialGroup {
  const s = `${name} ${spec}`
  if (/후레싱|절곡|물받이|마감재|의자 ?베이스|L자|두겁|마구리|캡/.test(s)) return '절곡'
  if (/판넬|패널|런너|도어|문짝|문틀|지붕재|강판|데크|보온|단열|유리|타일|석고|합판|각관|각파이프|C형강|H빔|형강|파이프/.test(s)) return '주자재'
  if (/앵커|브래킷|브라켓|베이스|철물|앵글|볼트|너트|행거|클립|스트랩/.test(s)) return '철물·앵커'
  if (/피스|리벳|나사|직결|타카|못/.test(s)) return '피스·리벳'
  if (/실리콘|코킹|폼|테이프|부틸|방수|프라이머|우레탄|씰|실란트/.test(s)) return '방수·충진'
  if (/홈통|배관|PVC|엘보|소켓|배수|드레인|밸브|플랜지/.test(s)) return '배관·배수'
  if (/디스크|비트|스프레이|장갑|마스킹|클리너|사포|소모/.test(s)) return '소모품'
  return '기타'
}

const DEFAULT_SUPPLIER: Record<MaterialGroup, string> = {
  주자재: '판넬 공장',
  절곡: '절곡 공장',
  '철물·앵커': '철물점',
  '피스·리벳': '철물점',
  '방수·충진': '철물점',
  '배관·배수': '배관 자재상',
  소모품: '철물점',
  기타: '',
}

/** 견적서의 재료비 줄을 자재 리스트로 옮긴다 (노무·경비 줄 제외, 금액은 안 가져감) */
export function materialsFromQuote(quote: Quote): MaterialItem[] {
  const out: MaterialItem[] = []
  for (const s of quote.sections) {
    if (s.option) continue
    for (const it of s.items) {
      if (it.kind !== '재료비' || !it.name.trim()) continue
      const group = guessGroup(it.name, it.spec)
      out.push({
        id: newMaterialId(),
        group,
        name: it.name.trim(),
        spec: it.spec.trim(),
        qty: it.qty,
        unit: it.unit.trim() || '개',
        supplier: DEFAULT_SUPPLIER[group],
        note: [s.name, it.note].filter(Boolean).join(' / ').slice(0, 300),
        source: 'quote',
        bought: false,
      })
    }
  }
  return out
}

export function normalizeMaterials(raw: unknown): MaterialItem[] {
  if (!Array.isArray(raw)) throw new Error('자재는 목록으로 보내야 함.')
  if (raw.length > 500) throw new Error('자재는 500줄까지 넣을 수 있음.')
  const t = (v: unknown, n = 200) => String(v ?? '').trim().slice(0, n)
  return raw
    .map((x: Record<string, unknown>) => {
      const name = t(x?.name)
      const group = (MATERIAL_GROUPS as readonly string[]).includes(String(x?.group)) ? (x.group as MaterialGroup) : guessGroup(name, t(x?.spec))
      const source: MaterialSource = x?.source === 'quote' || x?.source === 'ai' ? x.source : 'manual'
      return {
        id: t(x?.id, 40) || newMaterialId(),
        group,
        name,
        spec: t(x?.spec, 300),
        qty: Math.max(0, Math.round(Number(x?.qty) * 1000) / 1000 || 0),
        unit: t(x?.unit, 20) || '개',
        supplier: t(x?.supplier, 100),
        note: t(x?.note, 300),
        source,
        bought: !!x?.bought,
      }
    })
    .filter((x) => x.name)
}

/** 구매처별로 묶은 문자·메모용 글 */
export function materialsText(items: MaterialItem[], title: string): string {
  const bySupplier = new Map<string, MaterialItem[]>()
  for (const it of items) {
    const k = it.supplier || '(구매처 미정)'
    bySupplier.set(k, [...(bySupplier.get(k) ?? []), it])
  }
  const lines = [`[${title}] 자재 구매 리스트`]
  for (const [sup, list] of bySupplier) {
    lines.push('', `■ ${sup}`)
    for (const it of list) lines.push(`${it.bought ? '☑' : '☐'} ${it.name}${it.spec ? ` ${it.spec}` : ''} — ${fmtQty(it.qty)} ${it.unit}${it.note ? ` (${it.note})` : ''}`)
  }
  return lines.join('\n')
}

export const fmtQty = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 3 })
