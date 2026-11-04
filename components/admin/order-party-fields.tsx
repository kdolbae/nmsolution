'use client'

import type { PoParty } from '@/lib/orders/doc'
import { TextIn } from '@/components/admin/inputs'

const FIELDS: [Exclude<keyof PoParty, 'form'>, string, string?][] = [
  ['name', '상호'],
  ['ceo', '대표자'],
  ['bizNumber', '사업자번호', '000-00-00000'],
  ['address', '주소'],
  ['phone', '전화'],
  ['fax', '팩스'],
  ['manager', '담당자'],
  ['managerPhone', '담당 연락처'],
  ['email', '이메일'],
]

/** 발주 사업자·발주처 정보 칸 (기본값 편집·발주서 편집이 같이 쓴다) */
export function PartyFields({ value, onChange }: { value: PoParty; onChange: (p: PoParty) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {FIELDS.map(([k, label, ph]) => (
        <label key={k} className={k === 'address' ? 'flex flex-col gap-1 sm:col-span-2' : 'flex flex-col gap-1'}>
          <span className="text-xs text-muted-foreground">{label}</span>
          <TextIn value={value[k]} placeholder={ph} onChange={(v) => onChange({ ...value, [k]: v })} />
        </label>
      ))}
    </div>
  )
}
