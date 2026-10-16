import { notFound } from 'next/navigation'
import { Editor, type EdPanel, type EdSection } from '@/components/est/editor'
import { estPageSession } from '@/lib/session'
import { getEstimateDetail, listEstimates, listItems } from '@/lib/est/data'
import { checkEstimate } from '@/lib/est/draft'
import { computeEstimate } from '@/lib/est/compute'
import { getSettings } from '@/lib/est/settings'
import { sNum } from '@/lib/est/settings-defaults'
import { canSeeCost, profitView } from '@/lib/est/perm'
import { LOCKED_STATUSES } from '@/lib/est/table'

export const dynamic = 'force-dynamic'

/** S6 견적 편집기. 패널 숫자는 서버에서 계산하고 역할에 따라 걸러서 내려보냄(원가·실단가가 브라우저로 새지 않게) */
export default async function EstimateEditorPage({ params }: { params: Promise<{ id: string; vid: string }> }) {
  const { id, vid } = await params
  const pid = Number(id)
  const d = await getEstimateDetail(Number(vid))
  if (!d || d.estimate.projectId !== pid) notFound()
  const [s, settings, versions, items] = await Promise.all([estPageSession(), getSettings(), listEstimates(pid), listItems(true)])
  const role = s?.estRole ?? null
  const seeCost = canSeeCost(role, settings)
  const view = profitView(role, settings)
  const e = d.estimate
  const r = computeEstimate({ rateSnap: e.rateSnap, settingsSnap: e.settingsSnap, managerVisits: e.managerVisits, sections: d.sections })
  const { results } = await checkEstimate(d, settings)

  const sum = (k: 'mat' | 'lab' | 'exp' | 'injury' | 'employment' | 'safety' | 'misc' | 'overhead' | 'profit' | 'adjust') =>
    r.calc.sections.reduce((a, c, i) => a + (d.sections[i].isOption ? 0 : c[k]), 0)
  const full = e.rateSnap.mode === 'full'
  const breakdown = [
    { label: '재료비', amount: sum('mat') },
    { label: '노무비', amount: sum('lab') },
    { label: '경비', amount: sum('exp') },
    ...(full
      ? [
          { label: '산재보험료', amount: sum('injury') },
          { label: '고용보험료', amount: sum('employment') },
          { label: '산업안전보건관리비', amount: sum('safety') },
          { label: '일반관리비', amount: sum('overhead') },
        ]
      : [{ label: '공과잡비', amount: sum('misc') }]),
    { label: '이윤', amount: sum('profit') },
    { label: '단수정리(절사)', amount: sum('adjust') },
  ]
  const panel: EdPanel = {
    supply: r.calc.supply,
    vat: r.calc.vat,
    total: r.calc.total,
    options: r.calc.options,
    breakdown,
    cost: seeCost ? { min: r.cost.min, typ: r.cost.typ, max: r.cost.max, insurance: r.cost.insurance, manager: r.cost.manager } : null,
    profit:
      view === 'amount'
        ? { view, typ: r.profit.typ, min: r.profit.min, max: r.profit.max, marginPct: r.profit.marginPct, minPct: r.profit.minPct, maxPct: r.profit.maxPct }
        : view === 'pct'
          ? { view, marginPct: r.profit.marginPct }
          : { view },
    manager: { visits: e.managerVisits, customerAmount: e.managerVisits * e.settingsSnap.manager.dayRateCustomer, lineName: e.settingsSnap.manager.lineName },
    incentive: role === 'ceo' ? r.cost.incentive || null : null,
    minMargin: sNum(settings, 'profit.min_margin_pct'),
  }
  const sections: EdSection[] = d.sections.map((sec, i) => ({
    id: sec.id,
    name: sec.name,
    description: sec.description,
    calcMode: sec.calcMode,
    isOption: sec.isOption,
    total: r.calc.sections[i]?.total ?? 0,
    lines: sec.lines.map((l) => ({
      id: l.id,
      itemCode: l.itemCode,
      kind: l.kind,
      name: l.name,
      spec: l.spec,
      unit: l.unit,
      qty: l.qty,
      unitPrice: l.unitPrice,
      amount: l.amount,
      grade: l.grade,
      origin: l.origin,
      ruleType: (l.qtyRuleSnapshot as { type?: string } | null)?.type ?? null,
      qtyOverridden: l.qtyOverridden,
      basisText: l.basisText,
      internalMemo: l.internalMemo,
      confirmNeeded: l.confirmNeeded,
      removed: l.removed,
      removedReason: l.removedReason,
      removedNote: l.removedNote,
      actual: seeCost ? l.actual : null,
      actualSource: seeCost ? l.actualSource : null,
    })),
  }))

  return (
    <Editor
      projectId={pid}
      estimate={{ id: e.id, label: e.label, versionNo: e.versionNo, status: e.status, managerVisits: e.managerVisits, notesCustomer: e.notesCustomer, customerNumber: e.customerNumber }}
      versions={versions.map((v) => ({ id: v.id, label: v.label, versionNo: v.versionNo, status: v.status }))}
      sections={sections}
      items={items.map((i) => ({ code: i.code, kind: i.kind, name: i.name, spec: i.spec, unit: i.unit, price: i.price }))}
      panel={panel}
      checks={results}
      canSeeCost={seeCost}
      locked={LOCKED_STATUSES.includes(e.status)}
    />
  )
}
