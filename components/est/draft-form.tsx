'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEstimate } from '@/app/actions/est'
import { Btn, ErrorLine, FieldRow, inputCls, selectCls } from './ui'
import { useAct } from './use-act'

/** S5 자동 초안: 템플릿·요율·담당자 방문 수·이름표 → 초안 만들기 */
export function DraftForm({
  projectId,
  templates,
  rateSets,
  defaults,
}: {
  projectId: number
  templates: { id: number; label: string }[]
  rateSets: { id: number; label: string }[]
  defaults: { templateId: number | null; rateSetId: number | null; managerVisits: number; label: string }
}) {
  const router = useRouter()
  const { pending, error, run } = useAct()
  const [v, setV] = useState({ templateId: defaults.templateId ? String(defaults.templateId) : '', rateSetId: defaults.rateSetId ? String(defaults.rateSetId) : '', managerVisits: String(defaults.managerVisits), label: defaults.label })
  return (
    <div className="flex max-w-xl flex-col gap-4 bg-background p-4 ring-1 ring-border lg:p-6">
      <FieldRow label="템플릿" hint="소분류 기본 템플릿. 필수·기본 항목 + 조건부(현장 답으로 판단) 항목이 들어감">
        <select className={selectCls} value={v.templateId} onChange={(e) => setV({ ...v, templateId: e.target.value })}>
          <option value="">(템플릿 없이 — 규칙·담당자 줄만)</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </FieldRow>
      <FieldRow label="요율 세트">
        <select className={selectCls} value={v.rateSetId} onChange={(e) => setV({ ...v, rateSetId: e.target.value })}>
          <option value="">(기본: 템플릿 → 대분류 → 설정)</option>
          {rateSets.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </FieldRow>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="담당자 방문 수">
          <input className={inputCls} inputMode="numeric" value={v.managerVisits} onChange={(e) => setV({ ...v, managerVisits: e.target.value.replace(/\D/g, '') })} />
        </FieldRow>
        <FieldRow label="이름표">
          <input className={inputCls} value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} placeholder="A안" />
        </FieldRow>
      </div>
      <ErrorLine error={error} />
      <Btn
        variant="accent"
        size="lg"
        disabled={pending}
        onClick={() =>
          run(
            () => createEstimate({ projectId, templateId: v.templateId ? Number(v.templateId) : null, rateSetId: v.rateSetId ? Number(v.rateSetId) : null, managerVisits: Number(v.managerVisits) || 0, label: v.label }),
            (r) => router.push(`/admin/est/${projectId}/v/${(r as { id: number }).id}`),
          )
        }
      >
        {pending ? '만드는 중…' : '초안 만들기'}
      </Btn>
    </div>
  )
}
