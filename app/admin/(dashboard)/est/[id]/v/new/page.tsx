import { notFound } from 'next/navigation'
import { estPageSession } from '@/lib/session'
import { DraftForm } from '@/components/est/draft-form'
import { SampleBadge } from '@/components/est/ui'
import { getProject, listClasses, listEstimates, listRateSets, listTemplates } from '@/lib/est/data'
import { getSettings } from '@/lib/est/settings'
import { sNum, sStr } from '@/lib/est/settings-defaults'

export const dynamic = 'force-dynamic'

/** S5 자동 초안(P3·P4) */
export default async function NewVersion({ params }: { params: Promise<{ id: string }> }) {
  await estPageSession()
  const pid = Number((await params).id)
  const p = await getProject(pid)
  if (!p) notFound()
  const [templates, rateSets, classes, settings, existing] = await Promise.all([listTemplates(), listRateSets(), listClasses(), getSettings(), listEstimates(pid)])
  const active = templates.filter((t) => t.isActive)
  const tpl = active.find((t) => t.class2Id === p.class2Id) ?? null
  const class1 = classes.find((c) => c.id === p.class1Id)
  const rs = rateSets.find((r) => r.id === tpl?.rateSetId) ?? rateSets.find((r) => r.code === class1?.meta?.rate_set) ?? rateSets.find((r) => r.code === sStr(settings, 'rates.default'))
  const visits = p.managerVisitsPlanned || sNum(settings, 'manager.min_visits') || 1
  const next = existing.length + 1
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        현장 확인 답으로 항목·수량을 채우고 실단가를 함께 저장함. 만든 뒤 편집기에서 고침.
        {(rs?.isSample || tpl) && <SampleBadge />}
      </p>
      <DraftForm
        projectId={pid}
        templates={active.map((t) => ({ id: t.id, label: `${t.class2Name} · ${t.name} v${t.version}` }))}
        rateSets={rateSets.filter((r) => r.isActive).map((r) => ({ id: r.id, label: `${r.name} (${r.code})${r.isSample ? ' · 샘플' : ''}` }))}
        defaults={{ templateId: tpl?.id ?? null, rateSetId: rs?.id ?? null, managerVisits: visits, label: `${String.fromCharCode(64 + Math.min(next, 26))}안` }}
      />
    </div>
  )
}
